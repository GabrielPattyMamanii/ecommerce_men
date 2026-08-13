-- supabase/migration-site-logo.sql
-- Tabla singleton para configurar desde el admin (/admin/configuracion/logo)
-- el logo del sitio (que aparece en Navbar y Footer).
--
-- Patrón singleton: una única fila con id = 1, sembrada por esta misma
-- migración. RLS de escritura es UPDATE-only (sin políticas de INSERT/DELETE)
-- porque la fila siempre existe después de correr esta migración una vez;
-- el admin UI solo hace `update ... where id = 1`, nunca insert/upsert.
-- Mismo patrón que home_banner_settings (migration-home-banner.sql).

create table if not exists public.site_logo_settings (
  id          integer primary key default 1 check (id = 1),
  logo_url    text,
  updated_at  timestamptz not null default now()
);

-- Siembra la única fila. logo_url queda en null a propósito: mientras no
-- haya un logo subido desde el admin, el frontend usa el fallback local
-- (asset estático src/assets/logo-nexo.jpg) vía el hook useSiteLogo().
insert into public.site_logo_settings (id, logo_url)
values (1, null)
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- SECURITY: Row Level Security (SECURITY.md Rule 6)
-- ══════════════════════════════════════════════════════════════════════
alter table public.site_logo_settings enable row level security;

drop policy if exists "Public read site logo settings" on public.site_logo_settings;
drop policy if exists "Admins can update site logo settings" on public.site_logo_settings;

-- Lectura pública: Navbar.jsx y Footer.jsx la consumen sin sesión iniciada.
create policy "Public read site logo settings" on public.site_logo_settings
  for select
  using (true);

-- Escritura: solo admin, y solo UPDATE (a propósito no hay políticas de
-- insert/delete -- la fila singleton ya existe por el seed de arriba y no
-- debe poder duplicarse ni borrarse desde la app).
create policy "Admins can update site logo settings" on public.site_logo_settings
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
