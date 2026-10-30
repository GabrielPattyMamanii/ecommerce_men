-- ============================================================
-- Slug único por producto para URLs legibles: /producto/jean-super-baggy-camo-beige
-- Idempotente. Correr en Supabase Dashboard → SQL Editor.
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Convierte un nombre en slug base (sin tildes, minúsculas, guiones)
CREATE OR REPLACE FUNCTION public.slugify_text(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT trim(both '-' from regexp_replace(
        lower(translate(coalesce(input, ''),
            'áéíóúüñÁÉÍÓÚÜÑàèìòùâêîôû',
            'aeiouunAEIOUUNaeiouaeiou')),
        '[^a-z0-9]+', '-', 'g'
    ));
$$;

-- Genera un slug único (agrega -2, -3... si ya existe)
CREATE OR REPLACE FUNCTION public.generate_product_slug(p_name TEXT, p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    base TEXT := left(public.slugify_text(p_name), 80);
    candidate TEXT;
    n INT := 1;
BEGIN
    IF base = '' THEN base := 'producto'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = candidate AND id <> p_id) LOOP
        n := n + 1;
        candidate := base || '-' || n;
    END LOOP;
    RETURN candidate;
END;
$$;

-- Backfill de productos existentes
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT id, name FROM public.products WHERE slug IS NULL ORDER BY created_at LOOP
        UPDATE public.products SET slug = public.generate_product_slug(r.name, r.id) WHERE id = r.id;
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);

-- Productos nuevos: asigna slug automáticamente si no viene uno
CREATE OR REPLACE FUNCTION public.set_product_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.generate_product_slug(NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_slug ON public.products;
CREATE TRIGGER trg_set_product_slug
    BEFORE INSERT OR UPDATE OF slug ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_product_slug();
