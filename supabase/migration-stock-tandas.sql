-- ============================================================
-- Los LOTES (tandas) se crean desde Productos → "Por lotes"
--
-- Hasta ahora un lote no existía como entidad propia: era un NOMBRE repetido en las filas de
-- stock_lotes (una por producto). Para poder crear un lote VACÍO y después cargarle productos,
-- se agrega la cabecera:
--
--   stock_tandas  (codigo ÚNICO, fecha, nota)   ← el lote como tal (LOTE-000, LOTE-001…)
--   stock_lotes   (product_id, codigo → stock_tandas.codigo, cantidad_inicial, cantidad_actual)
--                                               ← cuánto de CADA producto hay en ese lote
--
-- Todo lo anterior (movimientos, triggers, corrección de cantidad) sigue igual: stock_lotes.codigo
-- ahora es una clave foránea hacia stock_tandas.codigo (ON UPDATE CASCADE → renombrar un lote
-- lo renombra en todos sus productos).
--
-- Quién puede crear lotes y cargarles productos: admin o staff con permiso 'productos' o 'stock'.
-- Los clientes ya NO escriben stock_lotes ni stock_tandas directo: solo las funciones de abajo
-- (SECURITY DEFINER, con chequeo de permiso explícito).
--
-- Requiere migration-stock-lotes.sql. Idempotente. Todo en una transacción.
-- Correr en Supabase → SQL Editor.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Permiso: admin o staff con 'productos' o 'stock'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_lotes_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.admin_permissions
        WHERE user_id = auth.uid() AND section IN ('productos','stock')
      );
$$;
REVOKE ALL ON FUNCTION public.has_lotes_access() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_lotes_access() TO authenticated;

-- ------------------------------------------------------------
-- 2. Tabla de lotes (cabecera)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_tandas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     text NOT NULL CHECK (btrim(codigo) <> ''),
  fecha      date NOT NULL DEFAULT CURRENT_DATE,
  nota       text,
  user_id    uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.stock_tandas IS
  'Lote/tanda como entidad (puede estar vacío). Los productos de cada lote están en stock_lotes.';

CREATE UNIQUE INDEX IF NOT EXISTS stock_tandas_codigo_key ON public.stock_tandas (codigo);

CREATE OR REPLACE FUNCTION public.stock_tandas_normalize()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.codigo := upper(btrim(NEW.codigo));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_tandas_normalize ON public.stock_tandas;
CREATE TRIGGER trg_stock_tandas_normalize
  BEFORE INSERT OR UPDATE OF codigo ON public.stock_tandas
  FOR EACH ROW EXECUTE FUNCTION public.stock_tandas_normalize();

-- ------------------------------------------------------------
-- 3. Backfill: un lote por cada nombre que ya existe en stock_lotes
-- ------------------------------------------------------------
INSERT INTO public.stock_tandas (codigo, fecha, nota)
SELECT l.codigo, MIN(l.fecha_ingreso),
       CASE WHEN l.codigo = 'LOTE-000' THEN 'Tanda vieja (stock previo al sistema de lotes)' END
FROM public.stock_lotes l
GROUP BY l.codigo
ON CONFLICT (codigo) DO NOTHING;

-- stock_lotes.codigo → stock_tandas.codigo (renombrar un lote lo renombra en sus productos)
ALTER TABLE public.stock_lotes DROP CONSTRAINT IF EXISTS stock_lotes_codigo_fkey;
ALTER TABLE public.stock_lotes
  ADD CONSTRAINT stock_lotes_codigo_fkey FOREIGN KEY (codigo)
  REFERENCES public.stock_tandas (codigo) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Cualquier camino que cree una fila de stock_lotes (ingreso, ajuste al LOTE-000, funciones viejas)
-- asegura que el lote exista. El prefijo "a_" lo hace correr ANTES que trg_stock_lotes_normalize.
CREATE OR REPLACE FUNCTION public.stock_lotes_ensure_tanda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.codigo := upper(btrim(NEW.codigo));
  INSERT INTO public.stock_tandas (codigo, fecha)
  VALUES (NEW.codigo, COALESCE(NEW.fecha_ingreso, CURRENT_DATE))
  ON CONFLICT (codigo) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_lotes_a_ensure_tanda ON public.stock_lotes;
CREATE TRIGGER trg_stock_lotes_a_ensure_tanda
  BEFORE INSERT ON public.stock_lotes
  FOR EACH ROW EXECUTE FUNCTION public.stock_lotes_ensure_tanda();

-- ------------------------------------------------------------
-- 4. Funciones (lo único que escribe lotes/tandas desde el cliente)
-- ------------------------------------------------------------

-- Nombre sugerido para el próximo lote: sigue al mayor LOTE-NNN que exista (incluye lotes vacíos).
CREATE OR REPLACE FUNCTION public.stock_siguiente_codigo_lote()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'LOTE-' || lpad((COALESCE(MAX(substring(codigo FROM '^LOTE-(\d+)$')::bigint), 0) + 1)::text, 3, '0')
  FROM public.stock_tandas
$$;

-- Crear un lote vacío. p_codigo vacío → LOTE-NNN siguiente. Devuelve la fila creada.
CREATE OR REPLACE FUNCTION public.stock_crear_tanda(p_codigo text DEFAULT NULL, p_fecha date DEFAULT NULL, p_nota text DEFAULT NULL)
RETURNS public.stock_tandas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.stock_tandas;
BEGIN
  IF NOT public.has_lotes_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso para crear lotes.' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('stock_lote_codigo'));
  INSERT INTO public.stock_tandas (codigo, fecha, nota)
  VALUES (COALESCE(NULLIF(upper(btrim(p_codigo)), ''), public.stock_siguiente_codigo_lote()),
          COALESCE(p_fecha, CURRENT_DATE), NULLIF(btrim(p_nota), ''))
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

-- Agregar un producto a un lote con la cantidad que ENTRA (ingreso). Crea su fila en stock_lotes
-- y el movimiento de ingreso (suma al stock del producto). Sirve para productos nuevos y existentes.
CREATE OR REPLACE FUNCTION public.stock_agregar_a_tanda(
  p_codigo text, p_product uuid, p_cantidad integer, p_nota text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tanda public.stock_tandas;
  v_lote  uuid;
BEGIN
  IF NOT public.has_lotes_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso para cargar productos a un lote.' USING ERRCODE = '42501';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser un entero mayor a 0.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_tanda FROM public.stock_tandas WHERE codigo = upper(btrim(p_codigo)) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.stock_lotes WHERE product_id = p_product AND codigo = v_tanda.codigo) THEN
    RAISE EXCEPTION 'Este producto ya está en el lote %. Para cambiar su cantidad usa "Corregir cantidad".', v_tanda.codigo
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.stock_lotes (product_id, codigo, fecha_ingreso, cantidad_inicial, nota)
  VALUES (p_product, v_tanda.codigo, v_tanda.fecha, p_cantidad, NULLIF(btrim(p_nota), ''))
  RETURNING id INTO v_lote;

  INSERT INTO public.stock_movimientos (product_id, tipo, motivo, cantidad, nota, lote_id)
  VALUES (p_product, 'entrada', 'ingreso', p_cantidad, NULLIF(btrim(p_nota), ''), v_lote);
  RETURN v_lote;
END $$;

-- Eliminar un lote SOLO si está vacío (sin productos). Útil si se creó por error.
CREATE OR REPLACE FUNCTION public.stock_eliminar_tanda(p_codigo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codigo text := upper(btrim(p_codigo));
BEGIN
  IF NOT public.has_lotes_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso para eliminar lotes.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.stock_lotes WHERE codigo = v_codigo) THEN
    RAISE EXCEPTION 'El lote % ya tiene productos y no se puede eliminar.', v_codigo USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.stock_tandas WHERE codigo = v_codigo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe.' USING ERRCODE = 'P0001';
  END IF;
END $$;

-- Renombrar un lote (se refleja en todos sus productos por ON UPDATE CASCADE).
CREATE OR REPLACE FUNCTION public.stock_renombrar_tanda(p_codigo text, p_nuevo text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nuevo text := upper(btrim(p_nuevo));
BEGIN
  IF NOT public.has_lotes_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso para renombrar lotes.' USING ERRCODE = '42501';
  END IF;
  IF v_nuevo IS NULL OR v_nuevo = '' THEN
    RAISE EXCEPTION 'El nombre del lote no puede estar vacío.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.stock_tandas SET codigo = v_nuevo WHERE codigo = upper(btrim(p_codigo));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe.' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_nuevo;
END $$;

-- Función de ingreso en bloque (la usaba Stock → Entrada "Tanda nueva"). Se mantiene, ahora
-- SECURITY DEFINER porque los clientes ya no escriben stock_lotes directo.
CREATE OR REPLACE FUNCTION public.stock_registrar_ingreso(
  p_codigo text, p_fecha date, p_nota text, p_lineas jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codigo text;
  v_lote   uuid;
  l        record;
BEGIN
  IF NOT public.has_lotes_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso para registrar ingresos.' USING ERRCODE = '42501';
  END IF;
  IF p_lineas IS NULL OR jsonb_typeof(p_lineas) <> 'array' OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'Agrega al menos un producto a la tanda.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('stock_lote_codigo'));
  v_codigo := COALESCE(NULLIF(upper(btrim(p_codigo)), ''), public.stock_siguiente_codigo_lote());

  FOR l IN
    SELECT (e->>'product_id')::uuid AS product_id, (e->>'cantidad')::integer AS cantidad
    FROM jsonb_array_elements(p_lineas) e
  LOOP
    INSERT INTO public.stock_lotes (product_id, codigo, fecha_ingreso, cantidad_inicial, nota)
    VALUES (l.product_id, v_codigo, COALESCE(p_fecha, CURRENT_DATE), l.cantidad, NULLIF(btrim(p_nota), ''))
    RETURNING id INTO v_lote;

    INSERT INTO public.stock_movimientos (product_id, tipo, motivo, cantidad, fecha, nota, lote_id)
    VALUES (l.product_id, 'entrada', 'ingreso', l.cantidad, COALESCE(p_fecha, CURRENT_DATE),
            NULLIF(btrim(p_nota), ''), v_lote);
  END LOOP;
  RETURN v_codigo;
END $$;

REVOKE ALL ON FUNCTION public.stock_siguiente_codigo_lote(), public.stock_crear_tanda(text, date, text),
  public.stock_agregar_a_tanda(text, uuid, integer, text), public.stock_eliminar_tanda(text),
  public.stock_renombrar_tanda(text, text), public.stock_registrar_ingreso(text, date, text, jsonb)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stock_siguiente_codigo_lote(), public.stock_crear_tanda(text, date, text),
  public.stock_agregar_a_tanda(text, uuid, integer, text), public.stock_eliminar_tanda(text),
  public.stock_renombrar_tanda(text, text), public.stock_registrar_ingreso(text, date, text, jsonb)
  TO authenticated;

-- ------------------------------------------------------------
-- 5. Seguridad
-- ------------------------------------------------------------
ALTER TABLE public.stock_tandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_tandas: lectura" ON public.stock_tandas;
CREATE POLICY "stock_tandas: lectura"
  ON public.stock_tandas FOR SELECT TO authenticated
  USING (public.has_lotes_access());

-- Quien carga productos a un lote también tiene que poder ver los lotes (tarjetas de Productos).
DROP POLICY IF EXISTS "stock_lotes: lectura productos" ON public.stock_lotes;
CREATE POLICY "stock_lotes: lectura productos"
  ON public.stock_lotes FOR SELECT TO authenticated
  USING (public.has_lotes_access());

REVOKE ALL ON public.stock_tandas FROM anon, public;
GRANT SELECT ON public.stock_tandas TO authenticated;          -- escribir: solo con las funciones de arriba
-- Los lotes de producto tampoco se escriben directo: solo las funciones (SECURITY DEFINER) y los triggers.
REVOKE INSERT, UPDATE ON public.stock_lotes FROM authenticated;

COMMIT;
