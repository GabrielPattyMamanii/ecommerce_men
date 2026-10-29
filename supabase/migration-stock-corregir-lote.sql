-- ============================================================
-- Corregir la cantidad inicial de un lote (tanda) SIN perder las ventas
--
-- Caso: se cargó un lote con 30 docenas y eran 35, y ya hubo ventas.
--   * NO se pisa el stock: se ajusta por DIFERENCIA (+5) tanto en cantidad_inicial
--     como en cantidad_actual. Si ya salieron 8 → actual pasa de 22 a 27.
--   * El lote conserva su id: las ventas (movimientos) siguen apuntando a él.
--   * No se puede cargar menos que lo ya salido (el stock no puede quedar negativo).
--   * Queda registrado en el Kardex como un movimiento 'ajuste' (quién, cuándo, cuánto).
--
-- Requiere migration-stock-lotes.sql. Idempotente. Correr en Supabase → SQL Editor.
-- No toca datos existentes: solo crea una función.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.stock_corregir_lote(
  p_lote uuid, p_nueva_inicial integer, p_nota text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lote   public.stock_lotes%ROWTYPE;
  v_delta  integer;
  v_minimo integer;
BEGIN
  -- SECURITY DEFINER salta RLS y los permisos por columna: el control de acceso es explícito.
  IF NOT public.has_stock_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso a Stock.' USING ERRCODE = '42501';
  END IF;
  IF p_nueva_inicial IS NULL OR p_nueva_inicial < 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser un entero mayor o igual a 0.' USING ERRCODE = 'P0001';
  END IF;

  -- Bloquea el lote: una venta simultánea espera y después ve la cantidad ya corregida.
  SELECT * INTO v_lote FROM public.stock_lotes WHERE id = p_lote FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe.' USING ERRCODE = 'P0001';
  END IF;

  v_delta := p_nueva_inicial - v_lote.cantidad_inicial;
  IF v_delta = 0 THEN
    RAISE EXCEPTION 'La cantidad es la misma que ya tiene el lote.' USING ERRCODE = 'P0001';
  END IF;

  -- Lo que ya salió del lote = inicial − actual. No se puede cargar menos que eso.
  v_minimo := GREATEST(v_lote.cantidad_inicial - v_lote.cantidad_actual, 0);
  IF p_nueva_inicial < v_minimo THEN
    RAISE EXCEPTION 'No puedes cargar menos de % docenas en el lote %: ya salieron % docenas.',
      v_minimo, v_lote.codigo, v_minimo USING ERRCODE = 'P0001';
  END IF;

  -- 1) cantidad_inicial se corrige directo (solo esta función la puede escribir).
  UPDATE public.stock_lotes SET cantidad_inicial = p_nueva_inicial WHERE id = v_lote.id;

  -- 2) cantidad_actual y products.stock se mueven por DIFERENCIA con un movimiento 'ajuste'
  --    (los triggers de movimientos hacen el resto y validan que nada quede en negativo).
  --    Si algo falla acá, el UPDATE de arriba también se revierte.
  INSERT INTO public.stock_movimientos (product_id, tipo, motivo, cantidad, lote_id, nota)
  VALUES (
    v_lote.product_id,
    CASE WHEN v_delta > 0 THEN 'entrada' ELSE 'salida' END,
    'ajuste', abs(v_delta), v_lote.id,
    COALESCE(NULLIF(btrim(p_nota), ''),
             format('Corrección de cantidad del lote %s: %s → %s', v_lote.codigo, v_lote.cantidad_inicial, p_nueva_inicial))
  );

  RETURN p_nueva_inicial;
END $$;

REVOKE ALL ON FUNCTION public.stock_corregir_lote(uuid, integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stock_corregir_lote(uuid, integer, text) TO authenticated;

COMMIT;
