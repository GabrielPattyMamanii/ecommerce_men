-- Feature: Marcas con las que se trabaja
-- Se gestionan desde la sección admin "Categorías y Marcas" (permiso 'categorias')
-- y cada producto puede pertenecer a una marca (products.brand_id).

-- ------------------------------------------------------------
-- 1. Tabla brands
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brands_name_lower_key ON public.brands (lower(name));

DROP TRIGGER IF EXISTS brands_set_updated_at ON public.brands;
CREATE TRIGGER brands_set_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Columna en products (si se borra la marca, el producto queda sin marca)
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products (brand_id);

COMMENT ON COLUMN public.products.brand_id IS
  'Marca del producto (public.brands). NULL = sin marca.';

-- ------------------------------------------------------------
-- 3. Seguridad: lectura pública (catálogo), escritura admin o staff con permiso 'categorias'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_categories_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.admin_permissions
        WHERE user_id = auth.uid() AND section = 'categorias'
      );
$$;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands: lectura pública" ON public.brands;
CREATE POLICY "brands: lectura pública"
  ON public.brands FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "brands: escritura staff" ON public.brands;
CREATE POLICY "brands: escritura staff"
  ON public.brands FOR ALL TO authenticated
  USING (public.has_categories_access())
  WITH CHECK (public.has_categories_access());

GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
REVOKE ALL ON FUNCTION public.has_categories_access() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_categories_access() TO authenticated;
