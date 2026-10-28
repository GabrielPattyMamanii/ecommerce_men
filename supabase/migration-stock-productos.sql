-- ============================================================
-- Control de stock sobre products.stock (en DOCENAS)
--
--   products.stock        : ÚNICO stock. Lo mueven los movimientos y también se edita en el popup de Productos.
--   stock_movimientos     : entradas y salidas (producto + cantidad). Se anulan, no se borran.
--   product_costs         : cost_price (automático, más adelante) y cost_price_rounded (a mano).
--                           Tabla aparte A PROPÓSITO: products es de lectura pública
--                           (catálogo) y el costo no debe ser visible para clientes.
--   stock_control_productos : vista única para la pantalla de Control.
--
-- Reemplaza al módulo anterior (stock_entradas / stock_salidas), que se elimina.
-- Idempotente. Correr en Supabase → SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Eliminar el módulo anterior (nunca llegó a producción)
-- ------------------------------------------------------------
DROP VIEW  IF EXISTS public.stock_control_productos CASCADE;
DROP VIEW  IF EXISTS public.stock_control_entradas  CASCADE;
DROP TABLE IF EXISTS public.stock_salidas  CASCADE;
DROP TABLE IF EXISTS public.stock_entradas CASCADE;
DROP FUNCTION IF EXISTS public.stock_apply_delta(uuid, integer);
DROP FUNCTION IF EXISTS public.stock_salidas_before_write();
DROP FUNCTION IF EXISTS public.stock_salidas_after_write();
DROP FUNCTION IF EXISTS public.stock_entradas_before_insert();
DROP FUNCTION IF EXISTS public.stock_entradas_before_update();
DROP FUNCTION IF EXISTS public.stock_entradas_before_delete();
-- La versión vieja devolvía numeric (0.25); la nueva devuelve integer (5 docenas).
-- Las vistas que la usaban ya se eliminaron arriba.
DROP FUNCTION IF EXISTS public.stock_umbral_bajo();

-- ------------------------------------------------------------
-- 1. Secciones delegables: 'stock' en el CHECK de admin_permissions
-- ------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  IF to_regclass('public.admin_permissions') IS NOT NULL THEN
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.admin_permissions'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%section%'
    LOOP
      EXECUTE format('ALTER TABLE public.admin_permissions DROP CONSTRAINT %I', c.conname);
    END LOOP;

    ALTER TABLE public.admin_permissions
      ADD CONSTRAINT admin_permissions_section_check
      CHECK (section IN ('productos','inventario','categorias','cupones','ordenes',
                         'clientes','compras','configuracion','stock'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Helpers de acceso
-- ------------------------------------------------------------

-- Umbral de "stock bajo" en docenas (única definición en SQL).
CREATE OR REPLACE FUNCTION public.stock_umbral_bajo()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 5 $$;

-- Admin o staff con permiso 'stock'.
CREATE OR REPLACE FUNCTION public.has_stock_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.admin_permissions
        WHERE user_id = auth.uid() AND section = 'stock'
      );
$$;

-- Admin o staff con permiso 'stock' o 'productos' (pueden ver/editar costos).
-- PENDIENTE de revisión de permisos (ver docs/plan-control-stock-productos.md).
CREATE OR REPLACE FUNCTION public.has_costs_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.admin_permissions
        WHERE user_id = auth.uid() AND section IN ('stock','productos')
      );
$$;

-- ------------------------------------------------------------
-- 2b. Código de producto (opcional, único). Identifica al producto en Stock y en el JSON.
--     Se normaliza solo: sin espacios en los bordes, en MAYÚSCULAS, vacío = NULL.
-- ------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS code text;

COMMENT ON COLUMN public.products.code IS
  'Código del producto (opcional, único, en mayúsculas). Se carga en Productos; lo usa Stock y la importación por JSON.';

CREATE OR REPLACE FUNCTION public.products_normalize_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.code := NULLIF(upper(btrim(NEW.code)), '');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_normalize_code ON public.products;
CREATE TRIGGER trg_products_normalize_code
  BEFORE INSERT OR UPDATE OF code ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_normalize_code();

-- Normaliza los códigos que ya hubiera (por si la columna se creó a mano antes).
UPDATE public.products SET code = NULLIF(upper(btrim(code)), '') WHERE code IS DISTINCT FROM NULLIF(upper(btrim(code)), '');

CREATE UNIQUE INDEX IF NOT EXISTS products_code_key ON public.products (code) WHERE code IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Costos (tabla aparte, no pública)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id         uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cost_price         numeric CHECK (cost_price IS NULL OR cost_price >= 0),          -- automático (función futura)
  cost_price_rounded numeric CHECK (cost_price_rounded IS NULL OR cost_price_rounded >= 0), -- a mano
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid DEFAULT auth.uid()
);

COMMENT ON TABLE public.product_costs IS
  'Costos por producto, por docena. Tabla separada de products para que el catálogo público no los exponga.';
COMMENT ON COLUMN public.product_costs.cost_price IS
  'Costo calculado automáticamente por una función futura (PENDIENTE). Hoy puede estar vacío.';
COMMENT ON COLUMN public.product_costs.cost_price_rounded IS
  'Costo redondeado, cargado a mano.';

CREATE OR REPLACE FUNCTION public.product_costs_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_product_costs_touch ON public.product_costs;
CREATE TRIGGER trg_product_costs_touch
  BEFORE INSERT OR UPDATE ON public.product_costs
  FOR EACH ROW EXECUTE FUNCTION public.product_costs_touch();

-- Sincronía con products: cada producto tiene SIEMPRE su fila en product_costs
-- (misma clave: product_costs.product_id = products.id). Se crea sola al crear el
-- producto y se borra sola con él (ON DELETE CASCADE).
CREATE OR REPLACE FUNCTION public.products_create_cost_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_costs (product_id) VALUES (NEW.id) ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_create_cost_row ON public.products;
CREATE TRIGGER trg_products_create_cost_row
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_create_cost_row();

-- Productos que ya existían: fila de costos vacía (no modifica products).
INSERT INTO public.product_costs (product_id)
SELECT id FROM public.products
ON CONFLICT (product_id) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Movimientos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movimientos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  tipo        text NOT NULL CHECK (tipo IN ('entrada','salida')),
  cantidad    integer NOT NULL CHECK (cantidad > 0),   -- docenas
  fecha       date NOT NULL DEFAULT CURRENT_DATE,
  nota        text,
  saldo       integer,                                  -- products.stock tras aplicar el movimiento
  user_id     uuid DEFAULT auth.uid(),
  anulado_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_mov_product_idx ON public.stock_movimientos(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_mov_tipo_idx    ON public.stock_movimientos(tipo, fecha DESC);

-- Aplica un delta a products.stock con bloqueo de fila. Devuelve el stock resultante.
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
  UPDATE public.products SET stock = actual + p_delta WHERE id = p_product;
  RETURN actual + p_delta;
END $$;

-- INSERT: aplica el movimiento y guarda el saldo resultante.
CREATE OR REPLACE FUNCTION public.stock_mov_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.anulado_at := NULL;
  NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
  NEW.saldo := public.stock_aplicar_delta(
    NEW.product_id,
    CASE NEW.tipo WHEN 'entrada' THEN NEW.cantidad ELSE -NEW.cantidad END
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_mov_before_insert ON public.stock_movimientos;
CREATE TRIGGER trg_stock_mov_before_insert
  BEFORE INSERT ON public.stock_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.stock_mov_before_insert();

-- UPDATE: lo único permitido es ANULAR (anulado_at NULL → fecha). Revierte el stock.
CREATE OR REPLACE FUNCTION public.stock_mov_before_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.anulado_at IS NOT NULL THEN
    RAISE EXCEPTION 'El movimiento ya está anulado.' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.anulado_at IS NULL
     OR (NEW.product_id, NEW.tipo, NEW.cantidad, NEW.fecha, NEW.nota)
        IS DISTINCT FROM (OLD.product_id, OLD.tipo, OLD.cantidad, OLD.fecha, OLD.nota) THEN
    RAISE EXCEPTION 'Un movimiento no se edita: solo se anula.' USING ERRCODE = 'P0001';
  END IF;

  NEW.anulado_at := now();
  NEW.saldo := OLD.saldo;   -- el saldo histórico no cambia
  -- Anular una entrada descuenta; anular una salida devuelve. Falla si deja stock negativo.
  PERFORM public.stock_aplicar_delta(
    OLD.product_id,
    CASE OLD.tipo WHEN 'entrada' THEN -OLD.cantidad ELSE OLD.cantidad END
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_mov_before_update ON public.stock_movimientos;
CREATE TRIGGER trg_stock_mov_before_update
  BEFORE UPDATE ON public.stock_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.stock_mov_before_update();

-- DELETE: nunca (queda el registro).
CREATE OR REPLACE FUNCTION public.stock_mov_before_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos no se borran: se anulan.' USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS trg_stock_mov_before_delete ON public.stock_movimientos;
CREATE TRIGGER trg_stock_mov_before_delete
  BEFORE DELETE ON public.stock_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.stock_mov_before_delete();

-- ------------------------------------------------------------
-- 5. products.stock SÍ se puede editar a mano desde el popup de Productos.
--    Si una versión anterior de esta migración instaló un bloqueo, se quita.
--    (Una edición manual no genera movimiento; las Entradas/Salidas siempre
--    parten del stock actual.)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_products_guard_stock ON public.products;
DROP FUNCTION IF EXISTS public.products_guard_stock();

-- ------------------------------------------------------------
-- 6. Vista de Control (única fuente de nivel, costo, margen y valores)
--    Precio = retail_price (único precio; se vende por docena).
--    Costo efectivo = cost_price_rounded si existe, si no cost_price.
--    Sin precio o sin costo → NULL (la pantalla muestra "—").
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.stock_control_productos
WITH (security_invoker = true) AS
SELECT
  p.id                                         AS product_id,
  p.code                                       AS codigo,
  p.name                                       AS titulo,
  p.stock                                      AS stock,
  p.unlimited_stock                            AS sin_control,
  p.retail_price                               AS precio,
  c.cost_price                                 AS precio_costo,
  c.cost_price_rounded                         AS precio_costo_redondeado,
  COALESCE(c.cost_price_rounded, c.cost_price) AS costo_efectivo,
  (p.retail_price - COALESCE(c.cost_price_rounded, c.cost_price))                       AS margen,
  CASE WHEN p.retail_price > 0
       THEN round(((p.retail_price - COALESCE(c.cost_price_rounded, c.cost_price))
                   / p.retail_price) * 100, 1) END                                    AS margen_pct,
  (p.stock * COALESCE(c.cost_price_rounded, c.cost_price))                             AS valor_costo,
  (p.stock * p.retail_price)                                                           AS valor_venta,
  COALESCE(m.entradas, 0)                      AS entradas,
  COALESCE(m.salidas, 0)                       AS salidas,
  CASE
    WHEN p.stock = 0 THEN 'agotado'
    WHEN p.stock <= public.stock_umbral_bajo() THEN 'bajo'
    ELSE 'normal'
  END                                          AS nivel
FROM public.products p
LEFT JOIN public.product_costs c ON c.product_id = p.id
LEFT JOIN (
  SELECT product_id,
         SUM(cantidad) FILTER (WHERE tipo = 'entrada')::integer AS entradas,
         SUM(cantidad) FILTER (WHERE tipo = 'salida')::integer  AS salidas
  FROM public.stock_movimientos
  WHERE anulado_at IS NULL
  GROUP BY product_id
) m ON m.product_id = p.id;

-- ------------------------------------------------------------
-- 7. Seguridad: RLS + sin acceso anónimo
-- ------------------------------------------------------------
ALTER TABLE public.stock_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_costs     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movimientos: acceso staff" ON public.stock_movimientos;
CREATE POLICY "stock_movimientos: acceso staff"
  ON public.stock_movimientos FOR ALL TO authenticated
  USING (public.has_stock_access())
  WITH CHECK (public.has_stock_access());

DROP POLICY IF EXISTS "product_costs: acceso staff" ON public.product_costs;
CREATE POLICY "product_costs: acceso staff"
  ON public.product_costs FOR ALL TO authenticated
  USING (public.has_costs_access())
  WITH CHECK (public.has_costs_access());

REVOKE ALL ON public.stock_movimientos, public.product_costs, public.stock_control_productos FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON public.stock_movimientos TO authenticated;   -- sin DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_costs TO authenticated;
GRANT SELECT ON public.stock_control_productos TO authenticated;
REVOKE ALL ON FUNCTION public.has_stock_access(), public.has_costs_access() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_stock_access(), public.has_costs_access() TO authenticated;
