-- Feature: "Guía de talles" opcional por producto
-- null = el producto no tiene guía (la pestaña pública no aparece).
-- Formato: { "columns": ["Alto", "Ancho"], "rows": [ { "size": "S", "values": ["62", "56"] } ] }
-- Las filas se generan en el admin a partir de products.sizes; `values` va
-- alineado por índice con `columns`.

alter table public.products
  add column if not exists size_guide jsonb;

comment on column public.products.size_guide is
  'Guía de talles opcional. null = desactivada. Estructura: {columns: text[], rows: [{size: text, values: text[]}]}.';
