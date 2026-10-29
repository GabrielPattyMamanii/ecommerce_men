-- ============================================================
-- Stock por LOTES (tandas) sobre el Kardex existente (stock_movimientos)
--
--   stock_lotes        : cada remesa que ingresa. cantidad_inicial (fija) y
--                        cantidad_actual (la mueven SOLO los movimientos).
--   stock_movimientos  : ahora cada movimiento pertenece a UN lote (lote_id) y
--                        tiene un motivo: ingreso | venta | ajuste | devolucion.
--                        tipo (entrada/salida) sigue indicando el sentido.
--
-- Reglas:
--   * Una venta (salida) descuenta del lote ELEGIDO A MANO. No hay FIFO automático.
--   * Una entrada con motivo 'ingreso' crea un lote nuevo (LOTE-001, LOTE-002…, editable).
--   * products.stock = suma de cantidad_actual de los lotes del producto.
--   * Editar products.stock a mano (popup de Productos) ya no desincroniza nada:
--     se convierte en un movimiento 'ajuste' contra el lote base LOTE-000.
--   * Los productos que existen hoy quedan en LOTE-000 ("tanda vieja").
--   * NO toca webhooks, órdenes ni checkout.
--
-- Requiere migration-stock-productos.sql ya aplicada. Idempotente.
-- Correr en Supabase → SQL Editor (todo corre en una transacción).
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Tabla de lotes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_lotes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  codigo           text NOT NULL CHECK (btrim(codigo) <> ''),
  fecha_ingreso    date NOT NULL DEFAULT CURRENT_DATE,
  cantidad_inicial integer NOT NULL CHECK (cantidad_inicial >= 0),   -- docenas, fija
  cantidad_actual  integer NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0), -- docenas, la mueven los movimientos
  nota             text,
  user_id          uuid DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stock_lotes IS
  'Lotes/tandas por producto. cantidad_inicial es fija; cantidad_actual solo cambia vía stock_movimientos.';

-- Un mismo nombre de lote puede repetirse entre productos (una tanda trae varios productos),
-- pero no dentro del mismo producto.
CREATE UNIQUE INDEX IF NOT EXISTS stock_lotes_prod_codigo_key
  ON public.stock_lotes (product_id, codigo);
CREATE INDEX IF NOT EXISTS stock_lotes_prod_idx
  ON public.stock_lotes (product_id, fecha_ingreso, created_at);

CREATE OR REPLACE FUNCTION public.stock_lotes_normalize()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.codigo := upper(btrim(NEW.codigo));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_lotes_normalize ON public.stock_lotes;
CREATE TRIGGER trg_stock_lotes_normalize
  BEFORE INSERT OR UPDATE OF codigo ON public.stock_lotes
  FOR EACH ROW EXECUTE FUNCTION public.stock_lotes_normalize();

-- ------------------------------------------------------------
-- 2. Columnas nuevas en movimientos (nullable hasta el backfill)
-- ------------------------------------------------------------
ALTER TABLE public.stock_movimientos
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.stock_lotes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS motivo  text;

CREATE INDEX IF NOT EXISTS stock_mov_lote_idx ON public.stock_movimientos (lote_id);

-- ------------------------------------------------------------
-- 3. Helpers de lotes
-- ------------------------------------------------------------

-- Próximo nombre por defecto: LOTE-001, LOTE-002… (sigue al mayor LOTE-NNN existente).
CREATE OR REPLACE FUNCTION public.stock_siguiente_codigo_lote()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'LOTE-' || lpad((COALESCE(MAX(substring(codigo FROM '^LOTE-(\d+)$')::bigint), 0) + 1)::text, 3, '0')
  FROM public.stock_lotes
$$;

-- Lote base (LOTE-000 = "tanda vieja") del producto; lo crea si no existe.
-- p_inicial solo se usa al crearlo.
CREATE OR REPLACE FUNCTION public.stock_lote_base(p_product uuid, p_inicial integer DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.stock_lotes WHERE product_id = p_product AND codigo = 'LOTE-000';
  IF v_id IS NULL THEN
    INSERT INTO public.stock_lotes (product_id, codigo, cantidad_inicial, cantidad_actual, nota)
    VALUES (p_product, 'LOTE-000', GREATEST(p_inicial, 0), 0, 'Tanda vieja (stock previo al sistema de lotes)')
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- ------------------------------------------------------------
-- 4. Backfill: productos existentes → LOTE-000 con su stock actual
--    (los triggers de movimientos se desactivan SOLO durante este bloque)
-- ------------------------------------------------------------
INSERT INTO public.stock_lotes (product_id, codigo, cantidad_inicial, cantidad_actual, nota)
SELECT p.id, 'LOTE-000', COALESCE(p.stock, 0), COALESCE(p.stock, 0),
       'Tanda vieja (stock previo al sistema de lotes)'
FROM public.products p
WHERE (COALESCE(p.stock, 0) > 0
       OR EXISTS (SELECT 1 FROM public.stock_movimientos m WHERE m.product_id = p.id))
  AND NOT EXISTS (SELECT 1 FROM public.stock_lotes l WHERE l.product_id = p.id AND l.codigo = 'LOTE-000');

ALTER TABLE public.stock_movimientos DISABLE TRIGGER trg_stock_mov_before_update;

UPDATE public.stock_movimientos m
SET lote_id = l.id
FROM public.stock_lotes l
WHERE m.lote_id IS NULL AND l.product_id = m.product_id AND l.codigo = 'LOTE-000';

UPDATE public.stock_movimientos
SET motivo = CASE tipo WHEN 'entrada' THEN 'ingreso' ELSE 'venta' END
WHERE motivo IS NULL;

ALTER TABLE public.stock_movimientos ENABLE TRIGGER trg_stock_mov_before_update;

ALTER TABLE public.stock_movimientos ALTER COLUMN lote_id SET NOT NULL;
ALTER TABLE public.stock_movimientos ALTER COLUMN motivo  SET NOT NULL;

ALTER TABLE public.stock_movimientos DROP CONSTRAINT IF EXISTS stock_mov_motivo_check;
ALTER TABLE public.stock_movimientos ADD CONSTRAINT stock_mov_motivo_check CHECK (
     (motivo = 'ingreso'    AND tipo = 'entrada')
  OR (motivo = 'devolucion' AND tipo = 'entrada')
  OR (motivo = 'venta'      AND tipo = 'salida')
  OR  motivo = 'ajuste'
);

-- ------------------------------------------------------------
-- 5. Movimientos: ahora mueven el lote Y el stock del producto
-- ------------------------------------------------------------

-- Aplica un delta a products.stock. Marca la sesión para que el trigger de edición manual
-- de products no lo confunda con una edición a mano. No es invocable por clientes.
CREATE OR REPLACE FUNCTION public.stock_aplicar_delta(p_product uuid, p_delta integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  actual integer;
BEGIN
  SELECT stock INTO actual FROM public.products WHERE id = p_product FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto indicado no existe.' USING ERRCODE = 'P0001';
  END IF;
  IF actual + p_delta < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: quedan % docenas disponibles.', actual
      USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.stock_internal', '1', true);
  UPDATE public.products SET stock = actual + p_delta WHERE id = p_product;
  PERFORM set_config('app.stock_internal', '', true);
  RETURN actual + p_delta;
END $$;

REVOKE ALL ON FUNCTION public.stock_aplicar_delta(uuid, integer) FROM PUBLIC, anon, authenticated;

-- INSERT: valida el lote, mueve lote + producto y guarda el saldo.
--   SECURITY DEFINER: cantidad_actual no es escribible por los clientes, solo por este trigger.
CREATE OR REPLACE FUNCTION public.stock_mov_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lote  public.stock_lotes%ROWTYPE;
  v_delta integer;
BEGIN
  NEW.anulado_at := NULL;
  NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
  NEW.motivo  := COALESCE(NEW.motivo, CASE NEW.tipo WHEN 'entrada' THEN 'ingreso' ELSE 'venta' END);

  IF NEW.lote_id IS NULL THEN
    IF NEW.motivo = 'ingreso' THEN
      -- Entrada sin lote: nace un lote nuevo con el nombre por defecto.
      PERFORM pg_advisory_xact_lock(hashtext('stock_lote_codigo'));
      INSERT INTO public.stock_lotes (product_id, codigo, fecha_ingreso, cantidad_inicial, cantidad_actual)
      VALUES (NEW.product_id, public.stock_siguiente_codigo_lote(), NEW.fecha, NEW.cantidad, 0)
      RETURNING id INTO NEW.lote_id;
    ELSIF NEW.motivo = 'ajuste' THEN
      NEW.lote_id := public.stock_lote_base(
        NEW.product_id, CASE WHEN NEW.tipo = 'entrada' THEN NEW.cantidad ELSE 0 END);
    ELSE
      RAISE EXCEPTION 'Elige el lote del movimiento.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT * INTO v_lote FROM public.stock_lotes WHERE id = NEW.lote_id FOR UPDATE;
  IF NOT FOUND OR v_lote.product_id <> NEW.product_id THEN
    RAISE EXCEPTION 'El lote indicado no existe para este producto.' USING ERRCODE = 'P0001';
  END IF;

  v_delta := CASE NEW.tipo WHEN 'entrada' THEN NEW.cantidad ELSE -NEW.cantidad END;
  IF v_lote.cantidad_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en el lote %: quedan % docenas disponibles.',
      v_lote.codigo, v_lote.cantidad_actual USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.stock_lotes SET cantidad_actual = cantidad_actual + v_delta WHERE id = NEW.lote_id;

  IF current_setting('app.stock_sync', true) = '1' THEN
    -- products.stock ya fue cambiado a mano (ver products_sync_manual_stock): solo se registra el saldo.
    SELECT stock INTO NEW.saldo FROM public.products WHERE id = NEW.product_id;
  ELSE
    NEW.saldo := public.stock_aplicar_delta(NEW.product_id, v_delta);
  END IF;
  RETURN NEW;
END $$;

-- UPDATE: lo único permitido es ANULAR. Revierte el lote y el stock.
CREATE OR REPLACE FUNCTION public.stock_mov_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lote  public.stock_lotes%ROWTYPE;
  v_delta integer;
BEGIN
  IF OLD.anulado_at IS NOT NULL THEN
    RAISE EXCEPTION 'El movimiento ya está anulado.' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.anulado_at IS NULL
     OR (NEW.product_id, NEW.tipo, NEW.motivo, NEW.cantidad, NEW.fecha, NEW.nota, NEW.lote_id)
        IS DISTINCT FROM (OLD.product_id, OLD.tipo, OLD.motivo, OLD.cantidad, OLD.fecha, OLD.nota, OLD.lote_id) THEN
    RAISE EXCEPTION 'Un movimiento no se edita: solo se anula.' USING ERRCODE = 'P0001';
  END IF;

  NEW.anulado_at := now();
  NEW.saldo := OLD.saldo;   -- el saldo histórico no cambia

  -- Anular una entrada descuenta; anular una salida devuelve. Falla si deja el lote o el stock en negativo.
  v_delta := CASE OLD.tipo WHEN 'entrada' THEN -OLD.cantidad ELSE OLD.cantidad END;
  SELECT * INTO v_lote FROM public.stock_lotes WHERE id = OLD.lote_id FOR UPDATE;
  IF v_lote.cantidad_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: el lote % ya no tiene esas docenas (quedan %).',
      v_lote.codigo, v_lote.cantidad_actual USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.stock_lotes SET cantidad_actual = cantidad_actual + v_delta WHERE id = OLD.lote_id;
  PERFORM public.stock_aplicar_delta(OLD.product_id, v_delta);
  RETURN NEW;
END $$;

-- (los triggers trg_stock_mov_before_insert / _update / _delete ya apuntan a estas funciones)

-- ------------------------------------------------------------
-- 6. Edición manual de products.stock → movimiento 'ajuste' contra LOTE-000
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_sync_manual_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta integer := COALESCE(NEW.stock, 0) - COALESCE(OLD.stock, 0);
BEGIN
  IF current_setting('app.stock_internal', true) = '1' OR v_delta = 0 THEN
    RETURN NULL;   -- lo movió un movimiento del Kardex, o no hubo cambio
  END IF;
  PERFORM set_config('app.stock_sync', '1', true);
  INSERT INTO public.stock_movimientos (product_id, tipo, motivo, cantidad, lote_id, nota)
  VALUES (NEW.id,
          CASE WHEN v_delta > 0 THEN 'entrada' ELSE 'salida' END,
          'ajuste', abs(v_delta), public.stock_lote_base(NEW.id, GREATEST(v_delta, 0)),
          'Ajuste manual desde Productos');
  PERFORM set_config('app.stock_sync', '', true);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_products_sync_manual_stock ON public.products;
CREATE TRIGGER trg_products_sync_manual_stock
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION public.products_sync_manual_stock();

-- Producto nuevo con stock inicial → entra al LOTE-000 como ajuste.
CREATE OR REPLACE FUNCTION public.products_init_lote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.stock, 0) > 0 THEN
    PERFORM set_config('app.stock_sync', '1', true);
    INSERT INTO public.stock_movimientos (product_id, tipo, motivo, cantidad, lote_id, nota)
    VALUES (NEW.id, 'entrada', 'ajuste', NEW.stock,
            public.stock_lote_base(NEW.id, NEW.stock), 'Stock inicial al crear el producto');
    PERFORM set_config('app.stock_sync', '', true);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_products_init_lote ON public.products;
CREATE TRIGGER trg_products_init_lote
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_init_lote();

-- ------------------------------------------------------------
-- 7. Ingreso de tanda: un lote nuevo por producto, mismo nombre, todo en una transacción
--    p_lineas: [{ "product_id": "...", "cantidad": 5 }, …]
--    p_codigo vacío → LOTE-NNN siguiente.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stock_registrar_ingreso(
  p_codigo text, p_fecha date, p_nota text, p_lineas jsonb
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_codigo text;
  v_lote   uuid;
  l        record;
BEGIN
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

-- ------------------------------------------------------------
-- 8. Seguridad
-- ------------------------------------------------------------
ALTER TABLE public.stock_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_lotes: acceso staff" ON public.stock_lotes;
CREATE POLICY "stock_lotes: acceso staff"
  ON public.stock_lotes FOR ALL TO authenticated
  USING (public.has_stock_access())
  WITH CHECK (public.has_stock_access());

REVOKE ALL ON public.stock_lotes FROM anon, public;
-- cantidad_actual NO es escribible por clientes: solo los triggers de movimientos (SECURITY DEFINER).
GRANT SELECT ON public.stock_lotes TO authenticated;
GRANT INSERT (product_id, codigo, fecha_ingreso, cantidad_inicial, nota) ON public.stock_lotes TO authenticated;
GRANT UPDATE (codigo, nota) ON public.stock_lotes TO authenticated;   -- renombrar / anotar; sin DELETE

REVOKE ALL ON FUNCTION public.stock_registrar_ingreso(text, date, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stock_registrar_ingreso(text, date, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.stock_siguiente_codigo_lote() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stock_siguiente_codigo_lote() TO authenticated;
-- Solo la usan los triggers (SECURITY DEFINER); los clientes no la llaman.
REVOKE ALL ON FUNCTION public.stock_lote_base(uuid, integer) FROM anon, public, authenticated;

COMMIT;
