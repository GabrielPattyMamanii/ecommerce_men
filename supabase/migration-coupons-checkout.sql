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

-- ══════════════════════════════════════════════════════════════════════
-- SECURITY: Row Level Security (SECURITY.md Rule 6)
-- ══════════════════════════════════════════════════════════════════════

-- Enable RLS on coupons (if not already enabled)
alter table public.coupons enable row level security;

-- Drop existing policies to recreate them safely (idempotent)
drop policy if exists "Public read published coupons" on public.coupons;
drop policy if exists "Admins can insert coupons" on public.coupons;
drop policy if exists "Admins can update coupons" on public.coupons;
drop policy if exists "Admins can delete coupons" on public.coupons;

-- Public read policy: anyone can read coupons with status='publicado'
-- (needed for frontend coupon code validation in checkout)
create policy "Public read published coupons" on public.coupons
  for select
  using (status = 'publicado');

-- Admin-only write policies
create policy "Admins can insert coupons" on public.coupons
  for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update coupons" on public.coupons
  for update
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete coupons" on public.coupons
  for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Enable RLS on orders (if not already enabled)
alter table public.orders enable row level security;

-- Drop existing policies to recreate them safely (idempotent)
drop policy if exists "Users can read their own orders" on public.orders;
drop policy if exists "Admins can read all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;

-- User read policy: users can only read their own orders
create policy "Users can read their own orders" on public.orders
  for select
  using (user_id = auth.uid());

-- Admin read policy: admins can read all orders
create policy "Admins can read all orders" on public.orders
  for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admin write policies: only admins can update/delete orders
create policy "Admins can update orders" on public.orders
  for update
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete orders" on public.orders
  for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
