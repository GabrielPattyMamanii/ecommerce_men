-- ============================================================
-- Lote "VARIOS": el contenedor de los productos que NO pertenecen a ningún lote
--
--   * Los productos que se crean fuera de los lotes (y los ajustes manuales de stock) ya no
--     van a LOTE-000: van a VARIOS. LOTE-000 queda solo con el stock histórico ("tanda vieja").
--   * VARIOS es un lote DEL SISTEMA: no se puede eliminar ni renombrar (lo garantiza un trigger).
--   * Cualquier otro lote se puede eliminar: sus productos pasan a VARIOS con sus cantidades
--     y su historial de movimientos (el Kardex se conserva, apuntando ahora a VARIOS).
--
-- No mueve ningún dato existente (LOTE-000 sigue como está).
-- Requiere migration-stock-tandas.sql. Idempotente. Todo en una transacción.
-- Correr en Supabase → SQL Editor.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Lote del sistema
-- ------------------------------------------------------------
ALTER TABLE public.stock_tandas ADD COLUMN IF NOT EXISTS es_sistema boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.stock_tandas.es_sistema IS
  'true = lote del sistema (VARIOS): no se puede eliminar ni renombrar.';

INSERT INTO public.stock_tandas (codigo, fecha, nota, es_sistema)
VALUES ('VARIOS', CURRENT_DATE, 'Productos sin lote: los creados fuera de los lotes y los ajustes manuales de stock.', true)
ON CONFLICT (codigo) DO UPDATE SET es_sistema = true;

-- Un lote del sistema no se elimina ni se renombra (ni desde SQL directo).
CREATE OR REPLACE FUNCTION public.stock_tandas_protect()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.es_sistema THEN
      RAISE EXCEPTION 'El lote % es del sistema y no se puede eliminar.', OLD.codigo USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.es_sistema AND (NEW.codigo <> OLD.codigo OR NOT NEW.es_sistema) THEN
    RAISE EXCEPTION 'El lote % es del sistema y no se puede renombrar.', OLD.codigo USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_tandas_protect ON public.stock_tandas;
CREATE TRIGGER trg_stock_tandas_protect
  BEFORE UPDATE OR DELETE ON public.stock_tandas
  FOR EACH ROW EXECUTE FUNCTION public.stock_tandas_protect();

-- ------------------------------------------------------------
-- 2. El lote "base" de un producto pasa de LOTE-000 a VARIOS
--    (lo usan: ajustes sin lote, stock inicial al crear un producto, edición manual de stock)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stock_lote_base(p_product uuid, p_inicial integer DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.stock_lotes WHERE product_id = p_product AND codigo = 'VARIOS';
  IF v_id IS NULL THEN
    INSERT INTO public.stock_lotes (product_id, codigo, cantidad_inicial, cantidad_actual, nota)
    VALUES (p_product, 'VARIOS', GREATEST(p_inicial, 0), 0, 'Producto sin lote')
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- ------------------------------------------------------------
-- 3. Edición manual de products.stock → ajuste contra VARIOS.
--    Una BAJA toma de VARIOS y, si no alcanza, de LOTE-000 (productos que ya tenían su stock
--    en la tanda vieja); si ninguno alcanza se rechaza y hay que usar Stock → Salida eligiendo lote.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_sync_manual_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta integer := COALESCE(NEW.stock, 0) - COALESCE(OLD.stock, 0);
  v_lote  uuid;
BEGIN
  IF current_setting('app.stock_internal', true) = '1' OR v_delta = 0 THEN
    RETURN NULL;   -- lo movió un movimiento del Kardex, o no hubo cambio
  END IF;

  IF v_delta > 0 THEN
    v_lote := public.stock_lote_base(NEW.id, v_delta);
  ELSE
    SELECT id INTO v_lote FROM public.stock_lotes
    WHERE product_id = NEW.id AND codigo IN ('VARIOS', 'LOTE-000') AND cantidad_actual >= -v_delta
    ORDER BY (codigo = 'VARIOS') DESC, id
    LIMIT 1;
    IF v_lote IS NULL THEN
      v_lote := public.stock_lote_base(NEW.id, 0);   -- no alcanza: el movimiento lo rechaza con un mensaje claro
    END IF;
  END IF;

  PERFORM set_config('app.stock_sync', '1', true);
  INSERT INTO public.stock_movimientos (product_id, tipo, motivo, cantidad, lote_id, nota)
  VALUES (NEW.id,
          CASE WHEN v_delta > 0 THEN 'entrada' ELSE 'salida' END,
          'ajuste', abs(v_delta), v_lote,
          'Ajuste manual desde Productos');
  PERFORM set_config('app.stock_sync', '', true);
  RETURN NULL;
END $$;

-- ------------------------------------------------------------
-- 4. Anular / editar un movimiento: igual que antes, salvo el re-apuntado interno al eliminar
--    un lote (bandera de sesión que solo pone stock_eliminar_tanda; los clientes no pueden).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stock_mov_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lote  public.stock_lotes%ROWTYPE;
  v_delta integer;
BEGIN
  IF current_setting('app.stock_reparent', true) = '1' THEN
    RETURN NEW;   -- re-apuntado a VARIOS al eliminar un lote (no cambia cantidades ni stock)
  END IF;
  IF OLD.anulado_at IS NOT NULL THEN
    RAISE EXCEPTION 'El movimiento ya está anulado.' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.anulado_at IS NULL
     OR (NEW.product_id, NEW.tipo, NEW.motivo, NEW.cantidad, NEW.fecha, NEW.nota, NEW.lote_id)
        IS DISTINCT FROM (OLD.product_id, OLD.tipo, OLD.motivo, OLD.cantidad, OLD.fecha, OLD.nota, OLD.lote_id) THEN
    RAISE EXCEPTION 'Un movimiento no se edita: solo se anula.' USING ERRCODE = 'P0001';
  END IF;

  NEW.anulado_at := now();
  NEW.saldo := OLD.saldo;   -- el saldo histórico no cambia

  v_delta := CASE OLD.tipo WHEN 'entrada' THEN -OLD.cantidad ELSE OLD.cantidad END;
  SELECT * INTO v_lote FROM public.stock_lotes WHERE id = OLD.lote_id FOR UPDATE;
  IF v_lote.cantidad_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: el lote % ya no tiene esas docenas (quedan %).',
      v_lote.codigo, v_lote.cantidad_actual USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.stock_lotes SET cantidad_actual = cantidad_actual + v_delta WHERE id = OLD.lote_id;
  PERFORM public.stock_aplicar_delta(OLD.product_id, v_delta);
  RETURN NEW;
END $$;

-- ------------------------------------------------------------
-- 5. Eliminar un lote: sus productos pasan a VARIOS (con cantidades e historial)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.stock_eliminar_tanda(text);   -- cambia el tipo de retorno (void → integer)
CREATE OR REPLACE FUNCTION public.stock_eliminar_tanda(p_codigo text)
RETURNS integer   -- cantidad de productos que pasaron a VARIOS
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codigo text := upper(btrim(p_codigo));
  v_tanda  public.stock_tandas;
  r        record;
  v_varios uuid;
  v_movidos integer := 0;
BEGIN
  IF NOT public.has_lotes_access() THEN
    RAISE EXCEPTION 'permission denied: no tienes acceso para eliminar lotes.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_tanda FROM public.stock_tandas WHERE codigo = v_codigo FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe.' USING ERRCODE = 'P0001';
  END IF;
  IF v_tanda.es_sistema THEN
    RAISE EXCEPTION 'El lote % es del sistema y no se puede eliminar.', v_codigo USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.stock_reparent', '1', true);
  FOR r IN SELECT * FROM public.stock_lotes WHERE codigo = v_codigo ORDER BY product_id FOR UPDATE LOOP
    v_varios := public.stock_lote_base(r.product_id, 0);
    PERFORM 1 FROM public.stock_lotes WHERE id = v_varios FOR UPDATE;

    -- El Kardex se conserva: sus movimientos pasan a VARIOS (con una marca de dónde venían).
    UPDATE public.stock_movimientos
    SET lote_id = v_varios,
        nota = COALESCE(nota || ' ', '') || format('(lote %s eliminado: pasó a VARIOS)', v_codigo)
    WHERE lote_id = r.id;

    UPDATE public.stock_lotes
    SET cantidad_inicial = cantidad_inicial + r.cantidad_inicial,
        cantidad_actual  = cantidad_actual  + r.cantidad_actual
    WHERE id = v_varios;

    DELETE FROM public.stock_lotes WHERE id = r.id;
    v_movidos := v_movidos + 1;
  END LOOP;
  PERFORM set_config('app.stock_reparent', '', true);

  DELETE FROM public.stock_tandas WHERE codigo = v_codigo;
  RETURN v_movidos;
END $$;

-- Cambió el tipo de retorno (void → integer): hay que recrear los permisos de la función.
REVOKE ALL ON FUNCTION public.stock_eliminar_tanda(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stock_eliminar_tanda(text) TO authenticated;

COMMIT;
