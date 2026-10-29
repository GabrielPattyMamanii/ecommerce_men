# Sistema de stock por Tandas (lotes) + Kardex (movimientos)

> Guía reutilizable. Implementado en **ecommerce-men** (React + Vite + Supabase/Postgres) el 2026-10-29.
> Está escrita para copiarla a otro proyecto: primero el concepto, después el modelo, el SQL base, el front y las trampas.
> Los nombres son los de este proyecto (en español); la tabla de la sección 9 dice qué cambiar al adaptarlo.

---

## 1. En qué consiste (la idea en 2 minutos)

Un stock "estático" es un número en el producto (`products.stock = 12`). No dice **de dónde vino**, **quién lo movió** ni **de qué remesa salió** lo vendido.

Este sistema separa dos cosas:

| Concepto | Qué es | Cambia? |
|---|---|---|
| **Tanda / Lote** | Una remesa de mercancía que ingresa. Guarda cuánto entró (`cantidad_inicial`) y cuánto queda (`cantidad_actual`). | `inicial` **nunca**; `actual` solo por movimientos |
| **Movimiento (Kardex)** | Cada transacción: ingreso, venta, ajuste, devolución. Siempre apunta a UN lote. | **Inmutable**: no se edita ni se borra, solo se **anula** |
| **Stock del producto** | `products.stock` = suma de `cantidad_actual` de sus lotes. | Solo lo mueven los movimientos |

Resultado: trazabilidad completa (qué tanda se vendió, cuándo, quién), auditoría histórica y posibilidad de costo/margen por tanda.

```
 Producto A ──┬── LOTE-000 (inicial 12, actual 10)   ← "tanda vieja" (stock previo al sistema)
              ├── LOTE-001 (inicial  5, actual  5)   ← ingreso nuevo
              └── LOTE-002 (inicial  8, actual  0)   ← vendido por completo
                      ▲
   stock_movimientos: ingreso +5 → LOTE-001 · venta −2 → LOTE-000 · ajuste ±n → LOTE-000 …
   products.stock = 10 + 5 + 0 = 15
```

### Reglas de negocio que se decidieron
1. **El lote se elige a mano** en cada venta/salida. No hay FIFO automático (se puede agregar después: es solo elegir el lote por defecto).
2. **Los lotes se crean primero (vacíos) y después se les cargan productos.** El nombre por defecto es `LOTE-001`, `LOTE-002`… (el siguiente al mayor existente) y es **editable**. Un lote con varios productos comparte el nombre (una fila de `stock_lotes` por producto). Ver 2.1b.
3. **Lo que existía antes** de implementar el sistema queda en `LOTE-000` ("tanda vieja"), con inicial = actual = stock que había.
4. **Editar el stock a mano** en el formulario del producto no rompe nada: un trigger lo convierte en un movimiento de **ajuste** contra `LOTE-000`.
5. **Nada se borra**: anular un movimiento revierte el lote y el stock; el registro queda marcado (`anulado_at`).
6. **Las ventas online NO descuentan stock** en este proyecto (decisión explícita). El descuento ocurre solo al registrar una venta/salida **manual** desde el admin. Si en otro proyecto sí querés descuento automático, ver sección 8.

---

## 2. Tablas

### 2.1 `stock_lotes` — las tandas
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `product_id` | uuid FK → `products` (`ON DELETE RESTRICT`) | |
| `codigo` | text NOT NULL | Nombre del lote (`LOTE-001`). Se guarda en MAYÚSCULAS y sin espacios (trigger). **Único por producto**: `UNIQUE (product_id, codigo)` |
| `fecha_ingreso` | date | |
| `cantidad_inicial` | integer ≥ 0 | **Fija.** Cuánto entró |
| `cantidad_actual` | integer ≥ 0 | **Dinámica.** Solo la tocan los triggers de movimientos. `CHECK >= 0` impide vender más de lo que hay en el lote |
| `nota`, `user_id`, `created_at` | | |

### 2.1b `stock_tandas` — el lote como entidad (cabecera)
Un lote que **no tiene productos todavía** tiene que poder existir (se crea primero, se llena después). Por eso el lote es una cabecera aparte y `stock_lotes` pasa a ser el detalle por producto:

| Tabla | Rol |
|---|---|
| `stock_tandas` (`codigo` único, `fecha`, `nota`) | **El lote**: `LOTE-001`. Puede estar vacío |
| `stock_lotes` (`product_id`, `codigo` → `stock_tandas.codigo` `ON UPDATE CASCADE`, `cantidad_inicial/actual`) | Cuánto hay de cada producto dentro del lote |

- La FK es por **nombre** (`codigo`), no por `id`: así los triggers, el agrupado por nombre y los tests de `stock_lotes` no cambian, y renombrar un lote lo renombra en todos sus productos.
- Un trigger `BEFORE INSERT` en `stock_lotes` (prefijo `a_` para correr antes del que normaliza) crea la fila del lote si falta; así cualquier camino viejo que cree filas sigue funcionando.
- **Nadie escribe estas tablas directo** (`REVOKE INSERT, UPDATE`): solo funciones `SECURITY DEFINER` con chequeo de permiso explícito: `stock_crear_tanda` (vacío), `stock_agregar_a_tanda` (producto + cantidad → fila en `stock_lotes` + movimiento `ingreso`), `stock_eliminar_tanda` (solo si está vacío), `stock_renombrar_tanda`.
- **Flujo de UI:** Productos → *Por lotes* → *Nuevo lote* (nombre sugerido editable) → dentro del lote: *Nuevo producto* (nace con stock 0 y entra por el lote) o *Agregar producto existente*. Stock → Entrada queda solo para ajustes.
- **Permiso:** `has_lotes_access()` = admin o staff con `productos` **o** `stock` (quien carga productos tiene que poder crear lotes). Mover stock en el Kardex sigue siendo solo `stock`.
- Para migrar un proyecto que ya tenía lotes: crear un lote por cada `codigo` distinto (`INSERT … SELECT codigo, MIN(fecha_ingreso) … GROUP BY codigo`) **antes** de agregar la FK.

### 2.1c Lote "VARIOS": el contenedor de lo que no pertenece a ningún lote
Si un producto puede crearse **fuera** de cualquier lote (o se edita su stock a mano), hace falta un lugar donde viva ese stock. No conviene usar el lote histórico (`LOTE-000`): se mezcla "stock viejo" con "stock suelto". Solución: un lote **del sistema** aparte.

- `stock_tandas.es_sistema boolean`: `VARIOS` es `true`. **No se puede eliminar ni renombrar** → trigger `BEFORE UPDATE OR DELETE` en la tabla (protege también de SQL directo y de las propias funciones).
- La función "lote base" (`stock_lote_base`) devuelve/crea la fila **VARIOS** del producto; la usan los tres caminos sueltos: *stock inicial al crear el producto*, *edición manual de stock* y *ajuste sin lote elegido*. Cambiar de LOTE-000 a VARIOS fue cambiar **una función**, no los tres triggers.
- **Baja manual de stock**: si VARIOS no alcanza, probar el lote histórico (productos que ya tenían todo en la tanda vieja) antes de rechazar. Sin eso, la primera edición manual de un producto "viejo" fallaría.
- **Los productos sin ninguna fila de lote** (stock 0 creados fuera de lotes) se muestran en VARIOS con 0/0 **en el cliente** (no se crea una fila vacía por cada producto: ensuciaría la base y el Kardex).
- **Eliminar un lote con productos** = mover sus productos a VARIOS, no perderlos: para cada fila del lote, sumar `inicial` y `actual` a la fila VARIOS del mismo producto, **re-apuntar sus movimientos** a esa fila, borrar la fila y el lote. El stock total del producto no cambia.
  - El Kardex es inmutable (trigger que solo deja anular), así que el re-apuntado necesita un **bypass controlado**: una bandera de sesión local a la transacción (`set_config('app.stock_reparent','1',true)`) que solo la función definer activa y el trigger respeta. Siempre apagarla al terminar.
  - Se agrega al `nota` del movimiento `(lote X eliminado: pasó a VARIOS)` para no perder el origen.
  - Aviso: cambiar el tipo de retorno de una función (`void` → `integer`) exige `DROP FUNCTION` antes del `CREATE`; después hay que repetir los `GRANT`/`REVOKE`.
- Invariante que se conserva: cada lote ≠ histórico = suma de sus movimientos vigentes (VARIOS lo cumple incluso después de recibir lotes eliminados, porque se mueven los movimientos junto con las cantidades). Si se elimina el lote histórico, VARIOS hereda saldo sin movimientos que lo respalden (por eso la verificación excluye siempre al histórico).

### 2.2 `stock_movimientos` — el Kardex
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `product_id` | uuid FK → `products` (`RESTRICT`) | |
| `lote_id` | uuid FK → `stock_lotes` (`RESTRICT`), **NOT NULL** | Todo movimiento pertenece a un lote |
| `tipo` | `'entrada'` \| `'salida'` | **El sentido** (suma o resta) |
| `motivo` | `'ingreso'` \| `'venta'` \| `'ajuste'` \| `'devolucion'` | **El origen**. Combinaciones válidas: `ingreso`/`devolucion` → entrada, `venta` → salida, `ajuste` → cualquiera |
| `cantidad` | integer > 0 | Siempre positiva; el sentido lo da `tipo` |
| `fecha`, `nota` | | |
| `saldo` | integer | `products.stock` **después** de aplicar el movimiento (foto histórica) |
| `user_id` | uuid default `auth.uid()` | Quién lo hizo |
| `anulado_at` | timestamptz | `NULL` = vigente. Anulado = revertido, queda el registro |
| `created_at` | | |

> Por qué `tipo` **y** `motivo`: `tipo` simplifica todas las cuentas (suma/resta, sumas por entrada/salida); `motivo` da el significado de negocio. Un ajuste positivo es `entrada/ajuste`, uno negativo `salida/ajuste`.

### 2.3 Tablas/objetos de apoyo (de este proyecto)
| Objeto | Para qué |
|---|---|
| `products.stock` (+ `unlimited_stock`) | Stock total en **docenas** (entero). Es la suma de los lotes |
| `product_costs` | Costo por producto, tabla aparte (el catálogo es público y el costo no debe verse). *No hay costo por lote todavía* |
| Vista `stock_control_productos` | Una sola fuente para la pantalla de Control: stock, costo, margen, nivel (agotado/bajo/normal), entradas/salidas |
| `admin_permissions` + `has_stock_access()` | Staff con permiso `stock` (RLS) |

---

## 3. Lógica en la base de datos (lo importante vive en triggers)

La UI **no** calcula stock. Todo se decide en Postgres, dentro de la transacción, para que no haya carreras ni estados a medias.

### 3.1 Insertar un movimiento (`BEFORE INSERT`, `SECURITY DEFINER`)
1. Completa `user_id` y `motivo` por defecto (entrada→`ingreso`, salida→`venta`).
2. Si no trae `lote_id`:
   - `ingreso` → **crea un lote nuevo** (`LOTE-NNN` siguiente, con `pg_advisory_xact_lock` para evitar nombres duplicados).
   - `ajuste` → usa/crea el lote base `LOTE-000`.
   - otro (venta) → error **"Elige el lote del movimiento."**
3. Bloquea el lote (`SELECT … FOR UPDATE`) y valida que **pertenezca al producto**.
4. Calcula `delta` (+cantidad si entrada, −cantidad si salida). Si `cantidad_actual + delta < 0` → **"Stock insuficiente en el lote X: quedan N docenas."**
5. Actualiza `cantidad_actual` del lote y llama `stock_aplicar_delta` (bloquea `products`, valida stock ≥ 0, actualiza `products.stock`), guardando el `saldo`.

### 3.2 Anular (`BEFORE UPDATE`)
Lo **único** permitido es poner `anulado_at`. Cualquier otro cambio → *"Un movimiento no se edita: solo se anula."* Anular una entrada descuenta de su lote; anular una salida devuelve a **su** lote. Falla si dejaría el lote o el stock en negativo (p. ej. no se puede anular el ingreso de un lote que ya tuvo ventas: hay que anular antes la venta).

### 3.3 Borrar (`BEFORE DELETE`)
Siempre error. Además no se concede `DELETE` a `authenticated`.

### 3.4 Edición manual de `products.stock` (`AFTER UPDATE OF stock`)
Si el cambio **no** vino de un movimiento, genera un movimiento `ajuste` (sentido según el signo) contra `LOTE-000`. Si es una baja mayor a lo que tiene `LOTE-000`, **toda la edición se rechaza** (queda el stock intacto) y hay que bajar desde Salida → Ajuste eligiendo el lote.
Producto nuevo con stock inicial N (`AFTER INSERT`) → nace con `LOTE-000` de N + un ajuste que lo documenta.

### 3.5 Función de ingreso de tanda (RPC)
`stock_registrar_ingreso(p_codigo, p_fecha, p_nota, p_lineas jsonb)`: en **una transacción** crea un lote por producto con el mismo nombre y su movimiento `ingreso`. `p_codigo` vacío → siguiente `LOTE-NNN`. Devuelve el nombre del lote. `stock_siguiente_codigo_lote()` da el nombre sugerido para precargar el campo.

### 3.6 Seguridad
- RLS en `stock_lotes` y `stock_movimientos`: solo admin o staff con permiso `stock`. Sin acceso anónimo.
- **`cantidad_actual` no es escribible por clientes**: `GRANT` por columna (`INSERT (product_id, codigo, fecha_ingreso, cantidad_inicial, nota)`, `UPDATE (codigo, nota)`); solo los triggers `SECURITY DEFINER` la modifican. Sin `DELETE`.
- `stock_aplicar_delta` y `stock_lote_base` **no** son invocables por clientes (`REVOKE`).

---

## 4. SQL base (esqueleto reutilizable)

> Versión condensada. El archivo completo y probado está en `supabase/migration-stock-lotes.sql` (+ `migration-stock-productos.sql` para movimientos/costos/vista). Adaptá nombres de tablas y la función de permisos.

```sql
-- Lotes
CREATE TABLE stock_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  codigo text NOT NULL CHECK (btrim(codigo) <> ''),
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  cantidad_inicial integer NOT NULL CHECK (cantidad_inicial >= 0),
  cantidad_actual  integer NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
  nota text, user_id uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON stock_lotes (product_id, codigo);

-- Movimientos (Kardex)
CREATE TABLE stock_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lote_id    uuid NOT NULL REFERENCES stock_lotes(id) ON DELETE RESTRICT,
  tipo   text NOT NULL CHECK (tipo IN ('entrada','salida')),
  motivo text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  fecha date NOT NULL DEFAULT CURRENT_DATE, nota text,
  saldo integer, user_id uuid DEFAULT auth.uid(),
  anulado_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_mov_motivo_check CHECK (
       (motivo IN ('ingreso','devolucion') AND tipo = 'entrada')
    OR (motivo = 'venta' AND tipo = 'salida')
    OR  motivo = 'ajuste')
);

-- Núcleo: mover el lote y el producto (SECURITY DEFINER para poder escribir cantidad_actual)
CREATE FUNCTION stock_mov_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lote stock_lotes%ROWTYPE; v_delta int;
BEGIN
  NEW.motivo := COALESCE(NEW.motivo, CASE NEW.tipo WHEN 'entrada' THEN 'ingreso' ELSE 'venta' END);
  -- (si lote_id es NULL: ingreso → crear lote; ajuste → lote base; venta → error "Elige el lote")
  SELECT * INTO v_lote FROM stock_lotes WHERE id = NEW.lote_id FOR UPDATE;      -- 1º el lote…
  IF NOT FOUND OR v_lote.product_id <> NEW.product_id THEN
    RAISE EXCEPTION 'El lote indicado no existe para este producto.'; END IF;
  v_delta := CASE NEW.tipo WHEN 'entrada' THEN NEW.cantidad ELSE -NEW.cantidad END;
  IF v_lote.cantidad_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en el lote %: quedan % docenas.', v_lote.codigo, v_lote.cantidad_actual; END IF;
  UPDATE stock_lotes SET cantidad_actual = cantidad_actual + v_delta WHERE id = NEW.lote_id;
  NEW.saldo := stock_aplicar_delta(NEW.product_id, v_delta);                    -- …2º el producto
  RETURN NEW;
END $$;
-- + trigger BEFORE UPDATE (solo anular, revierte lote y producto) y BEFORE DELETE (siempre error)
```

Trigger de edición manual (la pieza más delicada, ver trampa #1):
```sql
-- stock_aplicar_delta marca la sesión antes de tocar products.stock:
--   PERFORM set_config('app.stock_internal','1',true); UPDATE products …; PERFORM set_config('app.stock_internal','',true);
CREATE FUNCTION products_sync_manual_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_delta int := COALESCE(NEW.stock,0) - COALESCE(OLD.stock,0);
BEGIN
  IF current_setting('app.stock_internal', true) = '1' OR v_delta = 0 THEN RETURN NULL; END IF;
  PERFORM set_config('app.stock_sync','1',true);   -- el stock YA cambió: el movimiento solo toca el lote
  INSERT INTO stock_movimientos(product_id,tipo,motivo,cantidad,lote_id,nota)
  VALUES (NEW.id, CASE WHEN v_delta>0 THEN 'entrada' ELSE 'salida' END, 'ajuste', abs(v_delta),
          stock_lote_base(NEW.id, GREATEST(v_delta,0)), 'Ajuste manual desde Productos');
  PERFORM set_config('app.stock_sync','',true);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_products_sync_manual_stock
  AFTER UPDATE OF stock ON products
  FOR EACH ROW WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION products_sync_manual_stock();
-- (en before_insert de movimientos: si current_setting('app.stock_sync',true)='1' → saldo = products.stock actual, sin aplicar delta)
```

---

## 5. Migrar un proyecto que ya tiene stock (backfill)

Orden seguro (todo dentro de `BEGIN; … COMMIT;`):
1. Crear `stock_lotes` y agregar `lote_id` (nullable) y `motivo` (nullable) a `stock_movimientos`.
2. Crear `LOTE-000` por producto que tenga stock **o** historial (`inicial = actual = products.stock`). Productos sin stock ni historial: no se crea lote vacío.
3. `DISABLE TRIGGER` del `BEFORE UPDATE` de movimientos, asignar `lote_id = LOTE-000` a todos los movimientos viejos y `motivo` (`entrada→ingreso`, `salida→venta`), `ENABLE TRIGGER`.
4. Recién ahí `SET NOT NULL` en `lote_id` y `motivo`, y agregar el `CHECK` de motivos.
5. Reemplazar las funciones/triggers y crear los nuevos.

El stock **no cambia** en ningún producto; los saldos históricos se conservan. La migración es idempotente (probado corriéndola dos veces).

---

## 6. Frontend (React) — piezas y contratos

| Pieza | Qué hace |
|---|---|
| `stockService.js` | Único acceso a datos. `listLotes()`, `listMovimientos(tipo)`, `siguienteCodigoLote()` (rpc), `registrarIngreso()` (rpc), `createMovimientos(tipo, lines, {motivo})`, `anularMovimiento(id)`. **Nunca escribe `products.stock` ni `cantidad_actual`.** Traduce errores de Postgres a mensajes claros |
| `MovimientoModal` | Motivo (entrada: *Tanda nueva* / *Ajuste a lote existente*; salida: *Venta manual* / *Ajuste*). Tanda nueva → campo "Nombre de la tanda" precargado con `LOTE-NNN` editable. Venta/ajuste → selector de **lote** por línea (muestra `actual de inicial · fecha`), valida cantidad ≤ lote antes de enviar |
| Pestaña **Lotes** | Tarjetas por lote → al entrar, los productos de ese lote |
| Productos | Selector *Todos los productos* / *Por lotes*; por lotes = tarjetas de lote → productos de ese lote (cada tarjeta de producto muestra su cantidad en ese lote) |
| `lotesUtils.agruparLotes()` | Agrupa filas de `stock_lotes` **por `codigo`** (una tanda con el mismo nombre en varios productos = 1 tarjeta). Orden: más reciente primero, `LOTE-000` al final |
| Historial | Columnas **Lote** y **Motivo**; anular revierte en SU lote |

Principio: **la UI avisa, la base decide.** El front valida antes (mejor UX) pero la defensa real son los triggers/CHECK.

---

## 7. Trampas encontradas (leer antes de reimplementar)

1. **No actualices `products` desde un `BEFORE UPDATE` de la misma fila.** Postgres falla con *"tuple to be updated was already modified by an operation triggered by the current command"*. Por eso la edición manual se resuelve con un **`AFTER UPDATE`** que no vuelve a tocar `products.stock` (flag `app.stock_sync`).
2. **Dos flags de sesión (`set_config(..., true)` = local a la transacción):**
   `app.stock_internal` → "este UPDATE de stock lo hizo el Kardex, no lo trates como edición manual";
   `app.stock_sync` → "el stock ya cambió, el movimiento solo debe mover el lote". Siempre resetearlos al terminar.
3. **`SECURITY DEFINER` + `GRANT` por columna** es lo que impide que un cliente escriba `cantidad_actual`. Sin esto, cualquiera con INSERT en `stock_lotes` podría fabricar stock.
4. **`REVOKE EXECUTE` de las funciones internas** (`stock_aplicar_delta`, `stock_lote_base`): si no, son invocables por RPC desde el cliente. Las funciones nuevas en Postgres son ejecutables por `PUBLIC` por defecto.
5. **Orden de bloqueos: primero el lote, después el producto**, siempre. La edición manual entra al revés (producto → lote); en teoría puede dar un deadlock entre una edición manual y una venta del mismo producto a la vez (Postgres aborta una; es raro).
6. **Los `CHECK` se evalúan después de los `BEFORE` triggers.** Un movimiento con `cantidad = 0` sin lote falla primero por "Elige el lote", no por el CHECK (importa al escribir tests).
7. **`cantidad_inicial` de un `LOTE-000` creado "al vuelo"** por un ajuste positivo debe valer lo ajustado (si no, queda `inicial = 0` con `actual = 7`, incoherente).
8. **Los contadores `entradas/salidas` de una vista incluyen los ajustes** (cuentan por `tipo`). Si querés solo ingresos/ventas reales, filtrá `motivo <> 'ajuste'`.
9. **Agrupar tarjetas por `codigo`, no por lote individual**: el nombre se repite entre productos de la misma tanda, por diseño.
10. **El `heredoc` de bash con comillas anidadas rompe los tests con JSON**: ponerlos con herramientas de archivos, no `cat <<EOF`.

---

## 8. Cómo extenderlo

| Quiero… | Cómo |
|---|---|
| **FIFO automático** | En el selector de lote, preseleccionar el más antiguo con `cantidad_actual > 0` (`ORDER BY fecha_ingreso, created_at`). Para multi-lote en una venta: repartir la cantidad entre lotes en una función SQL que inserte un movimiento por lote |
| **Descuento por ventas online** | En el webhook de pago, llamar a una función SQL que elija lote(s) (FIFO) e inserte movimientos `venta`. Hacerlo **idempotente** (clave = id de orden/pago) porque los webhooks se reenvían |
| **Costo por lote / margen real** | Agregar `costo_unitario` a `stock_lotes` y copiarlo al movimiento de venta (`costo_aplicado`) para congelar el margen histórico |
| **Devoluciones** | El motivo `devolucion` ya existe en la base: UI = entrada que **suma a un lote existente** (el de la venta original) |
| **Vencimientos / alertas** | `fecha_vencimiento` en el lote + vista de lotes por vencer |
| **Mover entre depósitos** | Agregar `deposito_id` al lote y un par de movimientos transferencia (salida + entrada) |

---

## 9. Checklist para llevarlo a otro proyecto

| Cambiar | En este proyecto | En el nuevo |
|---|---|---|
| Tabla de productos | `products` (`id`, `stock`) | la tuya |
| Unidad de stock | docenas (entero) | unidades/kg… (si es decimal, `numeric` en vez de `integer`) |
| Permisos | `has_stock_access()` (admin o `admin_permissions.section='stock'`) | tu función de roles |
| Prefijo de lote | `LOTE-` | el que quieras (ajustar el regex de `stock_siguiente_codigo_lote`) |
| Lote base | `LOTE-000` | igual, o `INICIAL` |
| Auth | `auth.uid()` (Supabase) | tu sistema (o `current_setting`) |

Pasos:
1. [ ] ¿Ya hay stock/historial? → plan de backfill (sección 5). ¿Proyecto nuevo? → crear directo con lote obligatorio.
2. [ ] Tablas + índices + CHECKs (sección 2/4).
3. [ ] Triggers de movimientos (insert / update=anular / delete=error).
4. [ ] Trigger de edición manual **o** bloquear la edición manual del stock (más simple: solo lectura en el formulario de producto).
5. [ ] RLS + `GRANT` por columna + `REVOKE` de funciones internas.
6. [ ] RPC de ingreso + función de nombre sugerido.
7. [ ] Servicio de front sin escritura directa de stock; modal con selector de lote.
8. [ ] **Pruebas SQL en un Postgres desechable** (ver abajo) antes de tocar la base real.
9. [ ] Backup, correr la migración, verificar `SUM(lotes) = products.stock` para todos.

### Consulta de verificación (debe devolver 0)
```sql
SELECT count(*) FROM products p
WHERE p.stock <> COALESCE((SELECT SUM(cantidad_actual) FROM stock_lotes l WHERE l.product_id = p.id), 0);
```

---

## 10. Pruebas

En este proyecto: `supabase/tests/stock/` (Postgres 15 en Docker, sin tocar Supabase).
- `tests.sh` — **86/86** (sin contar las secciones opcionales de corrección y de lotes como entidad): entradas/salidas, stock negativo, concurrencia (dos ventas simultáneas sobre el mismo lote), edición manual, anulaciones, vista, seguridad por rol (anon / cliente / staff sin permiso / staff con permiso), códigos, lotes (ingreso por RPC, nombres duplicados, venta por lote, anular, seguridad de columnas).
- `backfill.sh` — **16/16**: crea datos "viejos", corre la migración (dos veces) y verifica LOTE-000, motivos históricos, saldos y que ningún stock cambió.

Para reutilizarlas: contenedor `postgres:15-alpine`, cargar un `base.sql` mínimo (roles `anon`/`authenticated`, `auth.uid()`, `products`, `is_admin()`), la migración, y correr el script. Cada test imprime `PASS`/`FAIL`.

---

## 11. Archivos de referencia en ecommerce-men
| Archivo | Contenido |
|---|---|
| `supabase/migration-stock-productos.sql` | Movimientos base, costos, vista de Control, RLS |
| `supabase/migration-stock-lotes.sql` | Lotes, backfill LOTE-000, triggers por lote, RPC de ingreso, seguridad |
| `supabase/migration-stock-tandas.sql` | `stock_tandas` (lote como entidad), crear/agregar/eliminar/renombrar, permisos |
| `supabase/migration-stock-varios.sql` | Lote del sistema VARIOS, eliminar lotes con productos (→ VARIOS) |
| `supabase/tests/stock/{base.sql,tests.sh,backfill.sh}` | Pruebas |
| `src/services/stockService.js` | Acceso a datos |
| `src/pages/admin/sections/Stock/` | Control, Entradas, Salidas, Lotes, `MovimientoModal` |
| `src/components/admin/LoteCards.jsx`, `src/lib/lotesUtils.js` | Tarjetas de lote compartidas |
| `src/pages/admin/sections/Products/ProductsTable.jsx` | Vista *Todos / Por lotes* |
| `docs/stock-control.md` | Documentación del módulo en el proyecto |
