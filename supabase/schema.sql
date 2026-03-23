-- ============================================================
-- Schema: ecommerce-men
-- Compatible con Supabase (PostgreSQL 15+)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================


-- ============================================================
-- 0. TIPOS ENUM
-- ============================================================

CREATE TYPE public.user_role    AS ENUM ('user', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped');


-- ============================================================
-- 1. HELPER: actualizar updated_at automáticamente
--    Guard: solo dispara cuando el caller no cambió ya updated_at,
--    evitando loops de ORM y WAL bloat innecesario.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================
-- 2. TABLA: profiles
--    Una fila por usuario autenticado (vinculada a auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        public.user_role NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-crear perfil cuando se registra un usuario nuevo.
-- COALESCE garantiza que full_name nunca sea NULL (OAuth sin metadata incluida).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 3. TABLA: products
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT           NOT NULL,
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock        INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images       TEXT[]         NOT NULL DEFAULT '{}',  -- array de URLs de imágenes
  category_id  UUID,                                  -- FK futura hacia tabla categories
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 4. TABLA: orders
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID                 NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      public.order_status  NOT NULL DEFAULT 'pending',
  total       NUMERIC(10, 2)       NOT NULL CHECK (total >= 0),
  payment_id  TEXT,                -- ID de preferencia/pago de Mercado Pago
  created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 5. TABLA: order_items
--    Vincula una orden con sus productos (precio al momento de compra).
--    Sin updated_at: los items son inmutables una vez creados.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID           NOT NULL REFERENCES public.orders(id)   ON DELETE CASCADE,
  product_id  UUID           NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity    INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. ÍNDICES
--    PostgreSQL NO crea índices automáticos en columnas FK.
--    Sin estos, cada JOIN o lookup hace sequential scan.
-- ============================================================

CREATE INDEX idx_orders_user_id         ON public.orders(user_id);
CREATE INDEX idx_orders_status          ON public.orders(status);
CREATE INDEX idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_products_category_id   ON public.products(category_id);


-- ============================================================
-- 7. HELPER: is_admin()
--    SECURITY DEFINER evita recursión infinita en RLS al consultar profiles.
--    STABLE: el resultado se cachea por consulta (no por fila).
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================


-- ------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- INSERT solo via trigger handle_new_user (SECURITY DEFINER → bypassa RLS).
-- Esta política hace explícita la intención: ningún cliente puede insertar directamente.
CREATE POLICY "profiles: deny direct insert"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

-- Cada usuario lee solo su propio perfil; admin lee todos
CREATE POLICY "profiles: owner or admin select"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- Cada usuario actualiza su propio perfil; admin actualiza todos
CREATE POLICY "profiles: owner or admin update"
  ON public.profiles FOR UPDATE
  USING      (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Solo admin puede eliminar perfiles
CREATE POLICY "profiles: admin delete"
  ON public.profiles FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- RLS: products  → lectura pública, escritura solo admin
-- ------------------------------------------------------------

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Cualquiera (incluso anónimo) puede leer productos
CREATE POLICY "products: public select"
  ON public.products FOR SELECT
  USING (true);

-- Solo admin puede insertar, actualizar o eliminar productos
CREATE POLICY "products: admin insert"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "products: admin update"
  ON public.products FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "products: admin delete"
  ON public.products FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- RLS: orders  → solo el dueño o admin
-- ------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Dueño o admin puede ver sus órdenes
CREATE POLICY "orders: owner or admin select"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Usuario autenticado solo puede crear sus propias órdenes
CREATE POLICY "orders: owner insert"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Solo admin actualiza órdenes (cambio de status a paid/shipped, etc.)
CREATE POLICY "orders: admin update"
  ON public.orders FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- Solo admin elimina órdenes
CREATE POLICY "orders: admin delete"
  ON public.orders FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- RLS: order_items  → acceso derivado de la orden padre
-- ------------------------------------------------------------

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Dueño de la orden (o admin) puede ver sus items.
-- El índice en order_items.order_id permite que PostgreSQL optimice el EXISTS via semi-join.
CREATE POLICY "order_items: owner or admin select"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id      = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Usuario autenticado puede insertar items solo en sus propias órdenes en estado 'pending'.
-- Impide agregar items a órdenes ya pagadas o enviadas.
CREATE POLICY "order_items: owner insert"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id      = order_items.order_id
        AND orders.user_id = auth.uid()
        AND orders.status  = 'pending'
    )
  );

-- Solo admin puede actualizar o eliminar items
CREATE POLICY "order_items: admin update"
  ON public.order_items FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "order_items: admin delete"
  ON public.order_items FOR DELETE
  USING (public.is_admin());
