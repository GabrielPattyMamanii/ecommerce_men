-- ============================================================
-- SQL Script: Seed Test Products
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Propósito: Insertar un par de productos de prueba para 
-- visualizar el catálogo y el detalle de producto.
-- ============================================================

INSERT INTO public.products (id, name, description, price, stock, images)
VALUES 
(
  gen_random_uuid(),
  'Spectre Shell Jacket',
  'Engineered with GORE-TEX PRO™ membrane technology. The Spectre Shell offers extreme weather protection in a lightweight chassis. Features articulated sleeves for maximum mobility and reinforced Ripstop panels in high-abrasion zones.',
  10.00,
  15,
  ARRAY[
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBI3nMLg4qgdT8_gAj_wI7hfoDMzjQINOXASjujQ94t-BLaSPaysrh1T-54nepMTneVtw-9Ao473WSTGuZctzZLeZA-27eNiG8uAdyrcElHTW5MiNLoUkowJiOpjvEkQupmlTDa_2qOjnWCdUs1tEd8g4aE1UUqUaOJaUnRtlqDjbMO3DcLOO8stAaC_Jhtpxt8mId7UZ1ZJYatOL4-hTpt4VMv7l7yjnhFtBCyhlIjGqciEFv5ZcajnhsxQDzd0CGHY1tBDRvOG1',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCRMGMWjLEXyJlFy3jWu6fokrV7lf9VgMJfS7KU70U2kzvDeqfHVZDr44apPFKsesdjRdzg48JJxwgp5FqwEF1Y82mYa2TmW1PtvVpglELmRU1fH1GDAukf_jDWAwYXTDyto1ziJOtMR-SurQj8BgAGEaxuckkvoAkFC5SNFJ6Ske2NHHyWVnNj3cwFV1zmQ_JGXU0PsoVgSK_MrjM_fF2RaSSIgyYbXAoHcW5pPXPFY_LLKOIWfJs7f1CQBU5Vj6c0UImvoVlqkP_B',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDAqIhJ63kd9YfcMHXxAz6D1_rOsL-K-ClpMklbHfxwR_UR6T0HB7zzcubRIjk4l-W49ZVhnJ6MNppnQB5u3j_aAVVAaq1CmHbHQs3UdbTnokR3x8ArJgENOogwH6_s5BBr4HU5DUNpeYTgdw6grxl1bczpHlFeSgRO1RSAxE-ehTuef7sXPEjLhMWJJVZY42-5gfk-xeZUhIjmFgOCLv0Nn8nivPdiug4rgQlQUlesFDZDfwKB63ObfMdP19H6ia34AKuFnD91q1FEf',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHLRbkBfHU7Y_E6Iwv8AG7VyZ2qZlcc5WRsDS14kWVYxLiyGlZ1JEVBUmV0eiBZ5QJIcgl2YTAK1d6wg9a2OWC8tK2bLYwajt4c7UFfaJ1heF3T9rwrCeGWbUtlxAGLx_-jRVt0hTLDztcwtdlelHymmk_Yw2T0XkxISuZtK_cgEhuRew5miiwhQyDLkuol2OLwcqLiPsjdPWo2h0YHLZSMBmcmwFPYGB4qsH9DtB4_o0IERSh0Dput59FSHHBMLsIGrnKHMvHngw'
  ]::text[]
),
(
  gen_random_uuid(),
  'Aero-Vent Tac Shirt',
  'Advanced cooling matrix system. Micro-perforated back panels allow rapid heat dissipation during metabolic spikes. Designed for high-output urban movement.',
  10.00,
  30,
  ARRAY[
    'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=600&auto=format&fit=crop'
  ]::text[]
);
