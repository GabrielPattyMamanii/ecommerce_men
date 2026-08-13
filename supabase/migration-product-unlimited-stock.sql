-- Feature: "Disponible sin control de stock"
-- Permite crear/editar productos que se muestran como "Disponible" en la
-- tienda pública sin importar el número de stock cargado (incluso si es 0).
-- Útil para productos a pedido, con reposición constante, o cuando todavía
-- no se cargó el conteo real de inventario.

alter table public.products
  add column if not exists unlimited_stock boolean not null default false;

comment on column public.products.unlimited_stock is
  'Si es true, el producto se considera "Disponible" para el cliente sin importar el valor de stock. El admin puede seguir editando el stock real en cualquier momento sin afectar la disponibilidad mientras este flag esté activo.';
