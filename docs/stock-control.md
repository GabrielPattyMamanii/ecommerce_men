# Control de stock (docenas) sobre `products.stock`

> Reemplaza al módulo anterior (entradas por boleta / `stock_entradas` / `stock_salidas`), que se eliminó.
> Contexto, decisiones y checklist: [plan-control-stock-productos.md](plan-control-stock-productos.md).

Admin → **Stock** (`/admin/stock/{control,entradas,salidas,lotes}`). Permiso delegable: `stock`.

## Estado
- Base: `supabase/migration-stock-productos.sql` — **pendiente de correr en Supabase real** (SQL Editor). Idempotente; borra las tablas del módulo viejo si existieran.
- Front implementado; build OK. **No probado en navegador** (sin browser tool).
- Pruebas SQL: `supabase/tests/stock/` — **50/50 PASS** (Postgres 15 en Docker).
  Ejecutar: contenedor `postgres:15-alpine` llamado `stocktest`, cargar `tests/stock/base.sql`, luego `migration-stock-productos.sql`, luego `bash supabase/tests/stock/tests.sh`.

## Modelo
| Qué | Dónde |
|---|---|
| Único stock (docenas) | `products.stock` |
| Entradas y salidas | `stock_movimientos` (`tipo` entrada/salida, producto + cantidad, fecha, nota, `saldo`, `user_id`) |
| Costos | `product_costs` (`cost_price` automático a futuro, `cost_price_rounded` a mano) |
| Pantalla de Control | vista `stock_control_productos` (única fuente de nivel, margen y valores) |

- **Relación products ↔ product_costs:** `product_costs.product_id` es a la vez clave primaria y clave foránea hacia `products.id` (uno a uno, `ON DELETE CASCADE`). Un trigger crea la fila de costos vacía al crear cada producto (y la migración rellena los existentes), así siempre están sincronizadas; al borrar un producto se borra su costo.
- **Costos desde Productos:** el popup tiene "Precio de costo" y "Costo redondeado" (opcionales, por docena). Al guardar, `ProductsTable.jsx` hace upsert en `product_costs` con el `id` del producto. Si el producto se guarda y solo falla el costo, se avisa en el banner de la página sin repetir el alta.
- **Código** = `products.code` (opcional, único, MAYÚSCULAS, normalizado por trigger; índice `products_code_key`). Se carga en el popup de Productos y se muestra en Control. Es el identificador previsto para la importación por JSON.
- **Precio** = `products.retail_price` (único precio; se vende por docena). `null` (precio a consultar) → se muestra "—", nunca 0.
- **Costo efectivo** = `cost_price_rounded` si existe, si no `cost_price`. Margen, valor a costo y valor a venta se calculan en la vista.
- **Stock bajo** = 5 docenas o menos (`stock_umbral_bajo()`); agotado = 0.

## Reglas (las hace cumplir la base)
- `products.stock` se puede **editar a mano** en el popup de Productos (decisión del usuario, 2026-10-27; antes estaba bloqueado). Una edición manual **no genera movimiento**: Entradas y Salidas siempre parten del stock actual, y el historial no registra ese cambio.
- Stock nunca negativo: salida mayor al stock, o anular una entrada que lo dejaría negativo → rechazado. Bloqueo de fila, probado con dos conexiones simultáneas.
- Los movimientos **no se editan ni se borran**: se **anulan** (`anulado_at`), lo que revierte el stock y deja el registro.
- Un INSERT con varias líneas es atómico (todo o nada).
- **Costos en tabla aparte a propósito:** `products` es de lectura pública (catálogo); una columna de costo ahí quedaría visible para cualquier visitante con la anon key.
- Acceso: movimientos → `is_admin()` o permiso `stock`. Costos → `is_admin()` o permiso `stock`/`productos` (`has_costs_access()`; **pendiente revisar**, ver plan). `anon` sin acceso a nada de esto.

## Front
`src/pages/admin/sections/Stock/` (`StockLayout`, `StockControl`, `StockMovimientos`, `MovimientoModal`, `StockUi`), `src/services/stockService.js`, `src/lib/stockUtils.js`.
El popup de Productos tiene el stock editable y lo envía al guardar (producto nuevo: stock inicial opcional, vacío = 0).

## Límites conocidos
- Los productos que ya tenían `products.stock > 0` conservan ese número, que ahora se interpreta como **docenas**. Sin movimiento de origen (el historial arranca vacío).
- La tienda online y las órdenes **no** descuentan stock (fuera de alcance por ahora). Cuando se conecten, deben hacerlo con `service_role` o registrando salidas.
- `cost_price` queda vacío hasta que exista la función de cálculo (pendiente).

## Lotes / tandas (Kardex por lote) — agregado 2026-10-29
Migración: `supabase/migration-stock-lotes.sql` — **pendiente de correr en Supabase real** (después de `migration-stock-productos.sql`; corre en una transacción, idempotente).
Pruebas: `tests/stock/tests.sh` (**107/107 PASS**) y `tests/stock/backfill.sh` (**16/16 PASS**, migración de datos viejos; levanta su propio contenedor).
Para `tests.sh`: contenedor `stocktest`, cargar `base.sql`, `migration-stock-productos.sql`, `migration-stock-lotes.sql`.

**No toca** webhooks, órdenes ni checkout: las ventas online siguen sin descontar stock. El descuento por lote ocurre SOLO al registrar una **salida/venta manual** desde Admin → Stock.

| Qué | Dónde |
|---|---|
| Lotes | `stock_lotes` (`codigo`, `fecha_ingreso`, `cantidad_inicial` fija, `cantidad_actual` dinámica, `nota`). Único por `(product_id, codigo)` |
| Movimiento → lote | `stock_movimientos.lote_id` (obligatorio) y `motivo`: `ingreso` / `venta` / `ajuste` / `devolucion`. `tipo` sigue siendo el sentido (entrada/salida) |
| Invariante | `products.stock` = suma de `cantidad_actual` de sus lotes (verificado en las pruebas) |

Reglas:
- **Venta (salida):** descuenta del lote **elegido a mano** (sin FIFO). Falla con "Stock insuficiente en el lote X" si no alcanza.
- **Ingreso (entrada "Tanda nueva"):** crea un lote por producto con el mismo nombre, en una sola transacción (`stock_registrar_ingreso`). Nombre por defecto `LOTE-001`, `LOTE-002`… (siguiente al mayor existente, `stock_siguiente_codigo_lote()`), editable; se guarda en MAYÚSCULAS.
- **LOTE-000 = "tanda vieja":** la migración deja el stock que existía en `LOTE-000` (inicial = actual = stock) y asigna a él todos los movimientos históricos (entrada→`ingreso`, salida→`venta`). Los productos sin stock ni historial no reciben lote vacío.
- **Editar `products.stock` a mano (popup de Productos)** ya no desincroniza: un trigger lo convierte en un movimiento `ajuste` contra `LOTE-000` (nota "Ajuste manual desde Productos"). Si el cambio es una baja mayor a lo que tiene `LOTE-000`, se **rechaza** (la edición completa falla) y hay que bajar desde Stock → Salida → *Ajuste* eligiendo el lote. Un producto creado con stock inicial N nace con `LOTE-000` de N.
- **Anular:** devuelve/descuenta en SU lote. No se puede anular el ingreso de un lote que ya tuvo ventas (hay que anular antes la venta).
- **Seguridad:** `cantidad_actual` no es escribible por clientes (`GRANT` por columna; solo los triggers `SECURITY DEFINER`). Los lotes no se borran; sí se pueden renombrar (`codigo`, `nota`). `stock_aplicar_delta` ya no es invocable por clientes.
- Sin costo por lote (el costo sigue en `product_costs`, por producto). Los `Entradas`/`Salidas` de la vista de Control cuentan también los ajustes.

Front: `MovimientoModal` (motivo + nombre de tanda + selector de lote), `StockLotes.jsx` (pestaña **Lotes**, solo lectura), columnas Lote/Motivo en Entradas y Salidas, `stockService.js` (`listLotes`, `registrarIngreso`, `siguienteCodigoLote`).
Pendiente / no incluido: UI de **devoluciones** (el motivo existe en la base), renombrar lotes desde la pantalla, costo por lote, descuento por lote desde las ventas online.

### Corregir la cantidad de un lote — agregado 2026-10-29
Migración: `supabase/migration-stock-corregir-lote.sql` (solo crea una función; **pendiente de correr en Supabase real**, después de `migration-stock-lotes.sql`).
Problema que resuelve: se cargó una tanda con 30 y eran 35 y ya hubo ventas. Editar a mano "pisaría" el stock y perdería las ventas.
- `stock_corregir_lote(lote_id, nueva_inicial, nota)` (RPC, `SECURITY DEFINER` con chequeo explícito `has_stock_access()`): ajusta por **diferencia** `cantidad_inicial` y, vía un movimiento `ajuste`, `cantidad_actual` y `products.stock`. Ej.: inicial 30, salieron 8, actual 22 → corregir a 35 → inicial 35, actual 27.
- El lote conserva su `id` (no se borra ni reinserta): las ventas siguen vinculadas.
- **Mínimo permitido = lo ya salido** (`inicial − actual`); por debajo se rechaza sin cambiar nada. Misma cantidad, negativa o lote inexistente también se rechazan.
- Concurrencia: bloquea el lote (`FOR UPDATE`); una venta simultánea espera y ve la cantidad ya corregida (probado).
- Auditoría: queda un movimiento `ajuste` con quién (`user_id`), cuándo y la nota (por defecto "Corrección de cantidad del lote X: 30 → 35").
- UI: Stock → Lotes → entrar al lote → lápiz junto a "Inicial" de cada producto.
- Verificación (debe dar 0 filas): cada lote ≠ LOTE-000 = suma de sus movimientos vigentes; ver `tests.sh` sección 11.

### Los lotes se crean desde Productos → "Por lotes" — agregado 2026-10-29
Migración: `supabase/migration-stock-tandas.sql` (**pendiente de correr en Supabase real**, después de `migration-stock-lotes.sql`; en una transacción, idempotente, no cambia ninguna cantidad).
Pruebas: `tests.sh` **174/174** y `backfill.sh` (incluye esta migración sobre datos ya migrados).

**Por qué hizo falta una tabla nueva:** un lote era solo un *nombre repetido* en las filas de `stock_lotes` (una por producto), así que no podía existir un lote vacío. Ahora:
| Tabla | Qué es |
|---|---|
| `stock_tandas` (`codigo` único, `fecha`, `nota`) | **El lote** (LOTE-000, LOTE-001…). Puede estar vacío |
| `stock_lotes` (`product_id`, `codigo` → `stock_tandas.codigo`, `cantidad_inicial/actual`) | Cuánto hay de **cada producto** en ese lote |

La migración crea un lote por cada nombre ya existente (LOTE-000, LOTE-001…) y agrega la clave foránea `stock_lotes.codigo → stock_tandas.codigo` (`ON UPDATE CASCADE`: renombrar un lote lo renombra en todos sus productos). El resto (movimientos, triggers, corrección) no cambia.

Flujo en pantalla (Productos → botón **Por lotes**):
1. **Nuevo lote** → nombre `LOTE-NNN` sugerido y editable + fecha + nota. Se crea **vacío** y se abre.
2. Dentro del lote: **Nuevo producto** (formulario normal; el campo stock pasa a "Docenas que entran al LOTE-X" y es obligatorio) o **Agregar producto existente** (elige producto + docenas; **lista solo los productos que no están en ningún lote**, es decir los creados fuera de lotes).
3. Un lote vacío se puede **eliminar**; con productos, no.
- Un producto nuevo creado en un lote nace con stock 0 y entra por `stock_agregar_a_tanda` (queda el movimiento `ingreso` en el Kardex). Si el alta del producto sale bien pero falla la carga al lote, se avisa para reintentar con "Agregar producto existente".
- **Stock → Entrada** ya **no crea lotes**: solo sirve para *ajustes* a un lote existente. Stock → Lotes sigue siendo la vista de solo lectura (+ corregir cantidad).

Funciones (todas `SECURITY DEFINER` con chequeo `has_lotes_access()`): `stock_crear_tanda`, `stock_agregar_a_tanda`, `stock_eliminar_tanda`, `stock_renombrar_tanda` (sin pantalla todavía), `stock_siguiente_codigo_lote`, y `stock_registrar_ingreso` (se mantiene pero la UI ya no la usa).

**Permisos:** crear lotes y cargarles productos lo puede hacer **admin o staff con permiso `productos` o `stock`** (`has_lotes_access()`); antes era solo `stock`. Ese staff también **ve** los lotes (tarjetas en Productos). Los clientes no leen ni escriben nada. **Ya nadie escribe `stock_lotes`/`stock_tandas` directo** (`REVOKE INSERT/UPDATE`): solo las funciones y los triggers.
Siguen siendo solo de `stock`: registrar ventas/ajustes en Kardex, anular movimientos y **corregir cantidad**.

### Lote VARIOS (productos sin lote) — agregado 2026-10-29
Migración: `supabase/migration-stock-varios.sql` (**pendiente de correr en Supabase real**, después de `migration-stock-tandas.sql`; transacción, idempotente, **no mueve ningún dato existente**).
Pruebas: `tests.sh` **174/174**; `backfill.sh` **38/38** (incluye esta migración sobre datos viejos: LOTE-000 y LOTE-001 quedan intactos).

**Qué es:** un lote **del sistema** (`stock_tandas.es_sistema = true`) donde viven los productos que no pertenecen a ningún lote. Antes, lo "suelto" caía en `LOTE-000` (la tanda vieja); ahora cae en **VARIOS** y `LOTE-000` queda solo con el stock histórico.

| Situación | Dónde va |
|---|---|
| Producto creado fuera de lotes con stock inicial N | VARIOS (N/N) + ajuste en el Kardex |
| Producto creado fuera de lotes sin stock | Sin fila; en pantalla aparece en VARIOS con 0/0 |
| Edición manual de `products.stock` — **suba** | VARIOS |
| Edición manual — **baja** | Se descuenta de VARIOS si alcanza; si no, de LOTE-000 (productos que ya tenían su stock en la tanda vieja); si ninguno alcanza solo, se rechaza y hay que usar Stock → Salida eligiendo lote |
| Ajuste (Stock → Entrada) sin lote elegido | VARIOS (el selector lo ofrece aunque el producto aún no tenga fila) |

**Eliminar lotes:** ahora se puede eliminar **cualquier lote que no sea del sistema**, tenga o no productos (`stock_eliminar_tanda` devuelve cuántos productos pasaron a VARIOS). Sus productos pasan a VARIOS **con cantidades e historial**: inicial y actual se suman a la fila de VARIOS del producto, el stock total no cambia, y los movimientos del Kardex se conservan apuntando a VARIOS con una marca en la nota `(lote LOTE-003 eliminado: pasó a VARIOS)`. Un movimiento de un lote eliminado se puede anular igual (devuelve a VARIOS). La UI pide confirmación e indica cuántos productos se mueven.
**VARIOS no se puede eliminar ni renombrar**: lo garantiza un trigger en la base (también contra SQL directo), no solo la pantalla.

Detalles de implementación:
- El Kardex es inmutable. Para re-apuntar los movimientos al eliminar un lote, `stock_eliminar_tanda` activa una bandera de sesión (`app.stock_reparent`) que solo respeta el trigger de movimientos; los clientes no pueden ponerla.
- El nombre sugerido para un lote nuevo sigue al mayor `LOTE-NNN` existente: si eliminás `LOTE-002` y era el último, el próximo vuelve a llamarse `LOTE-002` (las notas del Kardex "(lote LOTE-002 eliminado…)" siguen identificando el anterior).
- "Agregar producto sin lote" (dentro de un lote normal) lista los productos que no tienen fila en ningún lote salvo VARIOS; sus docenas actuales no se mueven, las que entran se suman al lote.
- Un producto con filas en `stock_lotes` o `stock_movimientos` no se puede borrar del catálogo (claves `RESTRICT`); se oculta con el interruptor.

### Stock → Control simplificado + vista "Por lotes" — 2026-10-29
- **Tabla de Control:** solo **Producto, Stock (doc.), Precio normal, Precio mayorista, Precio costo y Precio redondeado** (editable a mano), más los botones de entrada/salida por fila. Se quitaron Código, Margen, Valor costo, Valor venta, Nivel y la barra de totales (sus valores en dinero estaban mal calculados porque el precio normal es por unidad, no por docena). Los filtros Todos / Stock bajo / Agotados y la búsqueda siguen.
- **Selector Lista / Por lotes:** *Lista* es la tabla de siempre. *Por lotes* muestra una tarjeta por lote (las mismas de Productos y Stock → Lotes, con VARIOS primero); al entrar a una se ve la misma tabla solo con los productos de ese lote, y la columna de stock pasa a ser **"Stock en el lote"** (actual / inicial). "← Lotes" vuelve a las tarjetas.
- **Datos:** `listControl()` une `products.wholesale_price` (la vista `stock_control_productos` no lo trae) como `precio_mayorista`. **No hay cambios en la base ni migración nueva.** La vista sigue calculando margen y valores; la pantalla simplemente no los muestra.
