-- supabase/migration-contact-settings.sql
-- Tabla singleton para configurar desde el admin (/admin/configuracion) los
-- canales de contacto (redes sociales / email) y el texto de horarios que
-- se muestran en la página pública /contacto y en el Footer.
--
-- Patrón singleton: una única fila con id = 1, sembrada por esta misma
-- migración. RLS de escritura es UPDATE-only (sin políticas de INSERT/DELETE)
-- porque la fila siempre existe después de correr esta migración una vez;
-- el admin UI solo hace `update ... where id = 1`, nunca insert/upsert.

create table if not exists public.contact_settings (
  id            integer primary key default 1 check (id = 1),
  whatsapp_url  text,
  instagram_url text,
  facebook_url  text,
  tiktok_url    text,
  email         text,
  hours_text    text,
  updated_at    timestamptz not null default now()
);

-- Siembra la única fila con los valores hardcodeados actuales de Contacto.jsx.
-- facebook_url no existía antes -> se deja NULL (el botón/canal no se muestra
-- hasta que un admin lo cargue).
insert into public.contact_settings (id, whatsapp_url, instagram_url, facebook_url, tiktok_url, email, hours_text)
values (
  1,
  'https://wa.me/5491100000000',
  'https://instagram.com/',
  null,
  'https://tiktok.com/',
  'info@tekgear.com',
  'Lunes: 7:00AM — 12:30AM' || chr(10) ||
  'Miercoles: 7:00AM — 12:30AM' || chr(10) ||
  'Sabado: 7:00AM — 12:30AM'
)
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- SECURITY: Row Level Security (SECURITY.md Rule 6)
-- ══════════════════════════════════════════════════════════════════════
alter table public.contact_settings enable row level security;

drop policy if exists "Public read contact settings" on public.contact_settings;
drop policy if exists "Admins can update contact settings" on public.contact_settings;

-- Lectura pública: Contacto.jsx y Footer.jsx la consumen sin sesión iniciada.
create policy "Public read contact settings" on public.contact_settings
  for select
  using (true);

-- Escritura: solo admin, y solo UPDATE (a propósito no hay políticas de
-- insert/delete -- la fila singleton ya existe por el seed de arriba y no
-- debe poder duplicarse ni borrarse desde la app).
create policy "Admins can update contact settings" on public.contact_settings
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
