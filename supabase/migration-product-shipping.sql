-- Shipping integration: product dimensions/weight per unit + order tracking
-- Columns for calculating real shipping costs via envia.com API
-- Ship to users manually in admin panel after payment is confirmed

alter table products add column if not exists weight_kg  numeric;
alter table products add column if not exists height_cm  numeric;
alter table products add column if not exists width_cm   numeric;
alter table products add column if not exists length_cm  numeric;

-- Selected shipping option + tracking data from envia.com
alter table orders add column if not exists shipping_quote           jsonb;
alter table orders add column if not exists shipping_tracking_number text;
alter table orders add column if not exists shipping_tracking_url    text;
alter table orders add column if not exists shipping_label_url       text;
