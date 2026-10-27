# Control de stock (docenas) sobre `products.stock`

> Reemplaza al módulo anterior (entradas por boleta / `stock_entradas` / `stock_salidas`), que se eliminó.
> Contexto, decisiones y checklist: [plan-control-stock-productos.md](plan-control-stock-productos.md).

Admin → **Stock** (`/admin/stock/{control,entradas,salidas}`). Permiso delegable: `stock`.

## Estado
- Base: `supabase/migration-stock-productos.sql` — **pendiente de correr en Supabase real** (SQL Editor). Idempotente; borra las tablas del módulo viejo si existieran.
- Front implementado; build OK. **No probado en navegador** (sin browser tool).
- Pruebas SQL: `supabase/tests/stock/` — **44/44 PASS** (Postgres 15 en Docker).
  Ejecutar: contenedor `postgres:15-alpine` llamado `stocktest`, cargar `tests/stock/base.sql`, luego `migration-stock-productos.sql`, luego `bash supabase/tests/stock/tests.sh`.

## Modelo
| Qué | Dónde |
|---|---|
| Único stock (docenas) | `products.stock` |
| Entradas y salidas | `stock_movimientos` (`tipo` entrada/salida, producto + cantidad, fecha, nota, `saldo`, `user_id`) |
| Costos | `product_costs` (`cost_price` automático a futuro, `cost_price_rounded` a mano) |
| Pantalla de Control | vista `stock_control_productos` (única fuente de nivel, margen y valores) |

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
