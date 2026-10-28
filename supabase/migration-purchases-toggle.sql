-- supabase/migration-purchases-toggle.sql
-- Agrega a site_price_settings (migration-price-visibility.sql) el interruptor
-- "modo catálogo": con purchases_enabled = false la tienda no permite comprar
-- (sin carrito, sin checkout) y los productos se consultan por WhatsApp.
-- Se edita desde /admin/configuracion/tienda.

alter table public.site_price_settings
  add column if not exists purchases_enabled boolean not null default true;
