-- ============================================================
-- Eliminación del módulo Inventario (Mercancía por Tandas)
-- DESTRUCTIVO: borra datos. Revisar y correr a mano en Supabase SQL Editor.
-- No toca: products, orders, stock_* (módulo Stock), categories, etc.
-- ============================================================

-- 1. Permisos de staff: quitar 'inventario' (sino el CHECK nuevo falla)
DELETE FROM public.admin_permissions WHERE section = 'inventario';

DO $$
DECLARE c record;
BEGIN
  IF to_regclass('public.admin_permissions') IS NOT NULL THEN
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.admin_permissions'::regclass
        AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%section%'
    LOOP
      EXECUTE format('ALTER TABLE public.admin_permissions DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE public.admin_permissions
      ADD CONSTRAINT admin_permissions_section_check
      CHECK (section IN ('productos','categorias','cupones','ordenes',
                         'clientes','compras','configuracion','stock'));
  END IF;
END $$;

-- 2. Tablas del módulo (si existen en tu proyecto)
DROP TABLE IF EXISTS public.entradas CASCADE;
DROP TABLE IF EXISTS public.tandas CASCADE;
-- 'propietarios' / 'app_users' solo se usaban en Inventario según el código,
-- pero revisá que ningún otro sistema tuyo las use antes de descomentar:
-- DROP TABLE IF EXISTS public.propietarios CASCADE;
-- DROP TABLE IF EXISTS public.app_users CASCADE;

-- 3. Bucket 'tanda-fotos': vaciarlo y borrarlo desde Dashboard → Storage
--    (no se puede con DROP desde SQL de forma segura).
