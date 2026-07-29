-- Cleanup: Remove redundant dimension columns from products table
-- These columns were causing confusion:
-- - unit_length, unit_width, unit_height (duplicates of length_cm, width_cm, height_cm)
-- - Redundant dozen_weight field
-- Keep only the standard naming: weight_kg, height_cm, width_cm, length_cm for units
-- and: dozen_weight, dozen_height, dozen_width, dozen_length for dozen

alter table products drop column if exists unit_length;
alter table products drop column if exists unit_width;
alter table products drop column if exists unit_height;
