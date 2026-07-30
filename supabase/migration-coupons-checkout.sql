-- Reconstruye la tabla coupons por si no existiera una migración previa (aditivo, no rompe la existente)
create table if not exists coupons (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  code                      text not null unique,
  discount_percentage       integer not null check (discount_percentage between 1 and 100),
  description               text,
  message                   text,
  has_counter               boolean not null default false,
  counter_duration_seconds  integer,
  counter_end_time          timestamptz,
  status                    text not null default 'borrador' check (status in ('borrador','publicado')),
  show_in_banner            boolean not null default false,
  created_at                timestamptz not null default now()
);

-- Nuevo: a qué tipo de producto aplica el cupón
alter table coupons add column if not exists applies_to text not null default 'ambos'
  check (applies_to in ('retail','wholesale','ambos'));

-- Cupón aplicado + monto de descuento, para trazabilidad de la orden
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_amount numeric not null default 0;
