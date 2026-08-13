-- supabase/migration-home-banner.sql
-- Tabla singleton para configurar desde el admin (/admin/configuracion/banner)
-- el banner hero de la página de Inicio (imagen, textos y CTAs).
--
-- Patrón singleton: una única fila con id = 1, sembrada por esta misma
-- migración. RLS de escritura es UPDATE-only (sin políticas de INSERT/DELETE)
-- porque la fila siempre existe después de correr esta migración una vez;
-- el admin UI solo hace `update ... where id = 1`, nunca insert/upsert.
-- Mismo patrón que contact_settings (migration-contact-settings.sql).

create table if not exists public.home_banner_settings (
  id                  integer primary key default 1 check (id = 1),
  eyebrow             text,
  headline_line1      text,
  headline_line2      text,
  description         text,
  cta_primary_text    text,
  cta_primary_link    text,
  cta_secondary_text  text,
  cta_secondary_link  text,
  image_url           text,
  updated_at          timestamptz not null default now()
);

-- Siembra la única fila con los valores actuales del hero de Home.jsx
-- (imagen incluida) para que la home nunca se vea vacía antes de que un
-- admin la configure desde el panel.
insert into public.home_banner_settings (
  id, eyebrow, headline_line1, headline_line2, description,
  cta_primary_text, cta_primary_link, cta_secondary_text, cta_secondary_link,
  image_url
)
values (
  1,
  'NUEVA TEMPORADA',
  'RENDIMIENTO',
  'SIN LÍMITES',
  'La mejor calidad en indumentaria masculina. Ropa de invierno y verano, los mejores estilos, los mejores precios.',
  'Ver Catálogo',
  '/catalogo',
  null,
  null,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA_9NRPfEgpDNtB65uyhYqwPS6t6wAjgKX4fu2aF-OGpFOBnKT0XfE2Hv5U7P4jVoKBNZ8sHPKuIxbgZ3xsg26w2SMvSUqRf67N_CDIct8k1Fb-LiePUYIt2y1FVn984wM4YupjE7miiZEsWyCTTD4LIYM_YAcvoF8hG3cjnUtu9BVK5g21zl3wvkraOKA8NxD2jvolRH1qMf2NaZcXOo85X-ahXdUrP3cWssdT2W8AaOx_Df7lQM2n0_3FFNd08XNe677bCI_kzosO'
)
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- SECURITY: Row Level Security (SECURITY.md Rule 6)
-- ══════════════════════════════════════════════════════════════════════
alter table public.home_banner_settings enable row level security;

drop policy if exists "Public read home banner settings" on public.home_banner_settings;
drop policy if exists "Admins can update home banner settings" on public.home_banner_settings;

-- Lectura pública: Home.jsx la consume sin sesión iniciada.
create policy "Public read home banner settings" on public.home_banner_settings
  for select
  using (true);

-- Escritura: solo admin, y solo UPDATE (a propósito no hay políticas de
-- insert/delete -- la fila singleton ya existe por el seed de arriba y no
-- debe poder duplicarse ni borrarse desde la app).
create policy "Admins can update home banner settings" on public.home_banner_settings
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
