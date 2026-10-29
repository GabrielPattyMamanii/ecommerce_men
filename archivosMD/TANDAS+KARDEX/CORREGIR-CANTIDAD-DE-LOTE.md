# Corregir la cantidad de un lote sin perder las ventas

> Complemento opcional de [SISTEMA-STOCK-TANDAS-KARDEX.md](SISTEMA-STOCK-TANDAS-KARDEX.md) (necesita ese sistema: tablas `stock_lotes` y `stock_movimientos`).
> Implementado en **ecommerce-men** el 2026-10-29. Está en un archivo aparte a propósito: si más adelante se quita esta función, el resto del sistema no depende de ella (ver sección 8).

---

## 1. El problema

Un operador carga una tanda con **30** unidades y en realidad eran **35**. Para cuando se da cuenta ya hubo ventas (8). El stock actual del lote es 22.

¿Cómo corregirlo **sin desvincular el stock de las ventas ya hechas**?

Lo que se puede romper si se hace mal:

| # | Riesgo | Consecuencia |
|---|---|---|
| 1 | **Pisar** el valor: `actual = 35` | Se "pierden" las 8 vendidas: el stock muestra 35 en vez de 27 |
| 2 | Bajar por debajo de lo vendido (poner 5 con 8 vendidas) | Stock negativo |
| 3 | **Borrar y reinsertar** el lote | Cambia el `id`; las ventas quedan huérfanas (`lote_id` perdido) |
| 4 | Ventas viejas sin vínculo al lote | Ningún trigger las descuenta bien |
| 5 | Otro canal que descuenta sin dejar registro (p. ej. un lector QR) | El stock deja de coincidir con los movimientos |
| 6 | Dos personas editando/vendiendo a la vez | Pisadas / lecturas viejas |

### Cómo lo cubre este sistema
| # | ¿Pasa? | Por qué |
|---|---|---|
| 1 | No | `cantidad_actual` solo se mueve por **diferencias** (movimientos); el cliente no puede escribirla (`GRANT` por columna) |
| 2 | No | `CHECK (cantidad_actual >= 0)` + validación explícita con mensaje claro |
| 3 | No | Los lotes no se borran (sin `DELETE`) y `stock_movimientos.lote_id` es `NOT NULL` + FK `RESTRICT`; nada recrea la fila |
| 4 | No aplica | Los movimientos viejos se asignaron al lote base `LOTE-000` en la migración; todo movimiento tiene lote |
| 5 | No | No hay canales paralelos: todo cambio de stock (incluso un `UPDATE` directo a `products.stock`) pasa por un movimiento (trigger) |
| 6 | No | El lote se bloquea con `SELECT … FOR UPDATE`; se probó una venta simultánea con una corrección |

Lo único que faltaba era una forma **segura de corregir "cuánto entró"** (`cantidad_inicial`): sin esto, la única salida era un ajuste que dejaba `inicial` desactualizada (`actual` > `inicial`). Esta función es esa salida.

---

## 2. La solución en una frase

> Corregir `cantidad_inicial` de V a N y mover `cantidad_actual` y el stock del producto **por la diferencia** `N − V`, en la **misma fila** del lote, validando antes que nada quede en negativo y dejando un movimiento de ajuste como registro.

```
cargado 30 · vendido 8 · actual 22
        corregir a 35  →  diferencia = +5
cargado 35 · vendido 8 · actual 27      ← las 8 ventas siguen intactas
```

Conceptos para entenderlo (el "por qué"):
- **Diferencia vs. pisar:** `actual = actual + (N − V)` conserva todo lo que ya pasó; `actual = N` lo borra. El valor 22 ya "contiene" las 8 ventas; sumarle 5 las respeta.
- **Mismo `id`:** las ventas apuntan al lote por su `id` (clave foránea). Mientras la fila no se borre ni se cambie su `id`, el vínculo es el mismo. Por eso **UPDATE, nunca DELETE + INSERT**.
- **Mínimo = lo ya salido:** lo que salió del lote es `inicial − actual` (8). No se puede declarar que entraron menos de 8, porque ya salieron 8.
- **Auditoría sin tabla extra:** el Kardex ya es inmutable y guarda usuario, fecha, cantidad y nota. El ajuste de la corrección **es** el historial ("quién cambió 30 → 35 y cuándo"). Una tabla `lotes_historial` aparte repetiría lo mismo.

---

## 3. La función SQL (`supabase/migration-stock-corregir-lote.sql`)

Solo crea una función. No toca datos. Idempotente.

```sql
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
  --    Si algo falla acá, el UPDATE de arriba también se revierte (misma transacción).
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
```

Decisiones de diseño a recordar:
- **`SECURITY DEFINER`**: es necesario porque `cantidad_inicial` no es escribible por el cliente (por diseño). Como esto salta RLS, **la función chequea `has_stock_access()` ella misma**; sin ese `IF` cualquier usuario logueado podría llamarla por RPC.
- **Una sola transacción**: si el movimiento falla (p. ej. el stock del producto quedaría negativo), el `UPDATE` de `cantidad_inicial` se revierte solo.
- **No toca `cantidad_actual` directo**: la mueve el trigger del movimiento (mismo camino que cualquier venta o ajuste), así hay un solo lugar donde se calcula.
- **`v_minimo`** se calcula con `GREATEST(…, 0)` porque, si antes hubo ajustes positivos, `actual` puede ser mayor que `inicial`; en ese caso el mínimo es 0.
- Mensajes con las palabras *"No puedes cargar menos"*, *"es la misma que"* y *"entero mayor o igual a 0"*: el servicio de front las reconoce para mostrarlas tal cual.

---

## 4. Frontend

| Archivo | Cambio |
|---|---|
| `src/services/stockService.js` | `corregirLote(loteId, nuevaInicial, nota)` → `supabase.rpc('stock_corregir_lote', { p_lote, p_nueva_inicial, p_nota })`. Además se agregaron los 3 textos de arriba a la lista de errores que se muestran tal cual |
| `src/pages/admin/sections/Stock/StockLotes.jsx` | Componente `CorregirCantidad`: dentro del detalle de un lote, un lápiz junto a "Inicial" abre un campo numérico. Muestra el mínimo ("ya salieron N, no puedes cargar menos"), una vista previa ("quedarán 27 disponibles (+5)") y deshabilita Guardar si el valor no es válido. Al guardar recarga los lotes |

Principio de siempre: **la UI avisa, la base decide.** El front calcula el mínimo para guiar, pero el rechazo real es de la función SQL.

---

## 5. Pruebas (`supabase/tests/stock/tests.sh`, sección 11)

Resultado al implementarlo: **107/107 PASS** (21 pruebas nuevas de esta sección sobre las 86 anteriores).

| Caso | Esperado |
|---|---|
| Subir 10 → 12 con 4 vendidas | inicial 12, actual 6 → 8; el stock del producto sube +2 |
| El lote conserva el `id` y la venta sigue vinculada y vigente | ✔ |
| Queda en el Kardex como `ajuste` +2, con nota y `user_id` | ✔ |
| Bajar 12 → 5 con 4 vendidas (≥ vendido) | inicial 5, actual 1; nota del usuario guardada |
| Bajar justo hasta lo vendido (4) | actual 0, sin negativos |
| **Bajar por debajo de lo vendido (3)** | **rechazado** con "No puedes cargar menos de 4"; lote y stock intactos |
| Misma cantidad / negativa / lote inexistente | rechazados |
| Las ventas del lote tras todas las correcciones | siguen intactas |
| Staff sin permiso de Stock, cliente, anónimo | `permission denied` |
| **Concurrencia**: corrección a 3 (con `pg_sleep`) y venta de 5 al mismo tiempo | la venta espera el bloqueo, ve el lote en 3 y se rechaza; resultado 3/3 sin negativos |
| Invariantes finales | `products.stock` = suma de lotes; cada lote ≠ base = suma de sus movimientos vigentes |

Cómo correr: ver sección 10 de la guía principal (contenedor `postgres:15-alpine`, `base.sql`, las migraciones en orden, `bash tests.sh`).

---

## 6. Consultas de verificación (solo lectura)

Las dos deben devolver **0 filas** (úsalas para detectar descuadres en cualquier momento):

```sql
-- 1) Producto vs suma de sus lotes
SELECT p.id, p.stock FROM products p
WHERE p.stock <> COALESCE((SELECT SUM(cantidad_actual) FROM stock_lotes l WHERE l.product_id = p.id), 0);

-- 2) Cada lote contra sus movimientos vigentes (LOTE-000 se excluye: nació con saldo previo al sistema)
SELECT l.id, l.codigo, l.cantidad_actual,
       COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0) AS segun_movimientos
FROM stock_lotes l
LEFT JOIN stock_movimientos m ON m.lote_id = l.id AND m.anulado_at IS NULL
WHERE l.codigo <> 'LOTE-000'
GROUP BY l.id
HAVING l.cantidad_actual <> COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0);
```

---

## 7. Limitaciones conocidas
- **Editar el stock desde el formulario de Productos no corrige una tanda concreta**: ese cambio se registra como ajuste contra `LOTE-000`. Para corregir una tanda hay que usar esta función (el lápiz del lote).
- **"Ya salió" = `inicial − actual`**: si el lote recibió ajustes (no ventas) que bajaron `actual`, también cuentan como "salido" para el mínimo.
- **Corrige un producto por vez**: una tanda con varios productos se corrige producto por producto (cada uno es su propio lote).
- Cantidades **enteras** (docenas). Si el proyecto usa decimales, cambiar `integer` por `numeric` y definir redondeo.
- Sin costo por lote: corregir la cantidad no recalcula costos.

---

## 8. Cómo quitarla (si más adelante no se quiere)
El sistema de tandas funciona igual sin esto. Pasos:
1. **Base:** `DROP FUNCTION public.stock_corregir_lote(uuid, integer, text);` (los ajustes ya registrados quedan en el Kardex; no se pierden datos).
2. **Front:** borrar el componente `CorregirCantidad` y el lápiz de `StockLotes.jsx` (prop `onChanged`, estado `editing`); borrar `corregirLote` y los 3 textos agregados al regex de `stockErrorMessage` en `stockService.js`.
3. **Pruebas:** borrar la sección `11. Corregir la cantidad de un lote` de `tests.sh`.
4. **Docs:** quitar la subsección "Corregir la cantidad de un lote" de `docs/stock-control.md` y este archivo.
5. **Archivo SQL:** borrar `supabase/migration-stock-corregir-lote.sql` (si ya se corrió en producción, hacer el `DROP FUNCTION` del paso 1).

## 9. Cómo llevarla a otro proyecto
1. Tener el sistema base (tablas de lotes y movimientos con triggers, ver guía principal).
2. Adaptar nombres: `stock_lotes`, `stock_movimientos`, `has_stock_access()`.
3. Correr la función, agregar el wrapper `corregirLote` y la UI (lápiz + campo con mínimo y vista previa).
4. Portar la sección 11 de pruebas, sobre todo el caso **bajar por debajo de lo vendido** y la **carrera** con `pg_sleep`.
