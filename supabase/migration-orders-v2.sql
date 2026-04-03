-- ============================================================
-- Migración: Orders v2
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Cambios:
--   1. user_id nullable (guest checkout)
--   2. Columnas de cliente y envío en orders
--   3. Constraint: guest debe tener email
--   4. Columna spec en order_items
--   5. Índice en customer_email
--   6. RLS actualizado para nullable user_id
-- ============================================================


-- 1. user_id nullable (guest checkout)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;


-- 2. Columnas de cliente y envío en orders
ALTER TABLE public.orders
  ADD COLUMN customer_email   TEXT,
  ADD COLUMN customer_phone   TEXT,
  ADD COLUMN customer_name    TEXT,
  ADD COLUMN shipping_type    TEXT CHECK (shipping_type IN ('shipping', 'pickup')),
  ADD COLUMN shipping_address JSONB;


-- 3. Constraint: toda orden debe tener usuario logueado O email de guest
ALTER TABLE public.orders
  ADD CONSTRAINT orders_guest_email_required
  CHECK (user_id IS NOT NULL OR customer_email IS NOT NULL);


-- 4. Columna spec en order_items (color/talle, ej: "Negro // Sz: L")
ALTER TABLE public.order_items ADD COLUMN spec TEXT;


-- 5. Índice parcial para búsqueda de órdenes por email
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email)
  WHERE customer_email IS NOT NULL;


-- ============================================================
-- 6. Actualizar RLS policies para nullable user_id
-- ============================================================

-- orders: SELECT — dueño (si logueado) o admin
DROP POLICY "orders: owner or admin select" ON public.orders;
CREATE POLICY "orders: owner or admin select"
  ON public.orders FOR SELECT
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

-- orders: INSERT — guest (user_id NULL) o dueño
DROP POLICY "orders: owner insert" ON public.orders;
CREATE POLICY "orders: owner insert"
  ON public.orders FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- order_items: SELECT — derivado de la orden padre
DROP POLICY "order_items: owner or admin select" ON public.order_items;
CREATE POLICY "order_items: owner or admin select"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (
          (orders.user_id IS NOT NULL AND orders.user_id = auth.uid())
          OR public.is_admin()
        )
    )
  );

-- order_items: INSERT — guest o dueño, solo en órdenes pending
DROP POLICY "order_items: owner insert" ON public.order_items;
CREATE POLICY "order_items: owner insert"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id IS NULL OR orders.user_id = auth.uid())
        AND orders.status = 'pending'
    )
  );
