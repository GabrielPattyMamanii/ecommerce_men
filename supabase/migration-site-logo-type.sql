-- supabase/migration-site-logo-type.sql
-- Agrega el tipo de logo a site_logo_settings para que Navbar y Footer
-- ajusten el espacio del logo:
--   'horizontal' -> logo apaisado (~4:1), ej. icono + nombre en una línea
--   'stacked'    -> logo apilado (~1.8:1), ej. siglas grandes con texto debajo
-- Las políticas RLS existentes (select público / update admin) cubren la columna nueva.

alter table public.site_logo_settings
  add column if not exists logo_type text not null default 'horizontal'
  check (logo_type in ('horizontal', 'stacked'));
