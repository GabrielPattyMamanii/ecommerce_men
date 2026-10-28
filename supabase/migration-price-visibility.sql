-- supabase/migration-price-visibility.sql
-- Tabla singleton para configurar desde el admin (/admin/configuracion/precios)
-- qué tipos de precio se muestran y se pueden comprar en la tienda:
--   show_retail    -> precio por unidad (Por Menor)
--   show_wholesale -> precio por docena (Por Mayor)
--
-- Patrón singleton idéntico a site_logo_settings (migration-site-logo.sql):
-- una única fila id = 1 sembrada acá, RLS de escritura UPDATE-only.
-- El CHECK impide dejar ambos precios apagados a la vez.

create table if not exists public.site_price_settings (
  id             integer primary key default 1 check (id = 1),
  show_retail    boolean not null default true,
  show_wholesale boolean not null default true,
  updated_at     timestamptz not null default now(),
  constraint site_price_settings_at_least_one check (show_retail or show_wholesale)
);

insert into public.site_price_settings (id, show_retail, show_wholesale)
values (1, true, true)
on conflict (id) do nothing;

alter table public.site_price_settings enable row level security;

drop policy if exists "Public read site price settings" on public.site_price_settings;
drop policy if exists "Admins can update site price settings" on public.site_price_settings;

-- Lectura pública: catálogo, detalle y Edge Function la consumen.
create policy "Public read site price settings" on public.site_price_settings
  for select
  using (true);

create policy "Admins can update site price settings" on public.site_price_settings
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
