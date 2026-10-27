# Plan: control de stock de mercancía sobre la sección Productos

> Documento de contexto + checklist. Diagnóstico: 2026-10-27. Decisiones del usuario y primera implementación: 2026-10-27.
> Pensado para que otra IA (o persona) en otro chat entienda el estado y continúe.
> Marcar cada tarea con `[x]` al completarla. Documentación técnica del módulo ya hecho: [stock-control.md](stock-control.md).

## 0. Reglas del pedido (del usuario)

- Solo **panel admin**. **NO** tocar ventas online (catálogo público), pagos por Mercado Pago, checkout ni Edge Functions de pago.
- Foco en la información de la sección **Productos**. **No** meterse con las **tandas** (Inventario ya fue eliminado del repo).
- Es solo un **control de stock de mercancía**, no un ERP.
- Responder con diagnóstico primero; las preguntas van al final, no paso a paso.

## 1. Pedido original

1. Control de stock: entradas, salidas, control de mercancía.
2. Ingreso de mercancía por un **JSON**.
3. Cada mercancía debe tener: stock, título, precio, precio costo, precio costo redondeado, precio venta.
4. Una sección aparte de control de mercancía.
5. Cómo cargar las **salidas** (ventas que descuentan stock) desde el panel admin, por ahora.
6. Qué más se puede agregar.

## 2. DECISIONES TOMADAS (respuestas del usuario)

| # | Tema | Decisión |
|---|---|---|
| 1 | Fuente del stock | Se usa **`products.stock`** como único stock. Se **eliminó** el módulo anterior (`stock_entradas`/`stock_salidas`, boletas). |
| 2 | Unidad | **Docenas** (todo: stock, cantidades, y el precio es por docena). |
| 3 | Precio | **Un solo precio para todo: `retail_price`** (solo se vende por docena; `wholesale_price` no interviene). Si es `null` (precio a consultar) se muestra "—". |
| 4 | `cost_price` | Se llenará **automáticamente** con una función que se hará más adelante (PENDIENTE). Hoy queda vacío. |
| 5 | `cost_price_rounded` | Se carga **a mano**. Se edita en la pantalla de Control. |
| 6 | Sección | Se usa la sección **Stock** (`/admin/stock`), se puede renombrar. |
| 7 | Salidas | "Lo correcto": registro de salida **desde la sección Stock**. Solo **producto y cantidad** (+ fecha y nota). Sin cliente ni precio vendido. |
| 8 | Permisos de costos | Los ven **staff y admin**. Revisar más adelante (PENDIENTE). |
| 9 | Extras | Se agregan todos los de la sección 5 (Fase F). |
| 10 | Por dónde empezar | **Costos y pantalla de control** (hecho, junto con entradas/salidas porque el stock no se mueve sin ellas). |

### Desviación consciente de lo pedido
- Los costos **no están como columnas de `products`** sino en la tabla **`product_costs`** (1 fila por producto). Motivo de seguridad: `products` se lee con la anon key en el catálogo público, y una columna de costo ahí quedaría visible para cualquier visitante. La vista `stock_control_productos` los junta para la pantalla. Si se prefiere igual en `products`, habría que restringir columnas por privilegios (más frágil).

## 3. PENDIENTE (anotado a pedido del usuario)

> Novedad: ya existe `products.code` (ver F6). Antes de implementar el JSON, los productos existentes necesitan tener su código cargado desde Productos.

- [ ] **P1. Ingreso de mercancía por JSON** — "luego veremos qué hago con esto". NO implementar hasta que el usuario lo retome. Preguntas abiertas cuando se retome: campo identificador (nombre / SKU / ID), crear o rechazar productos inexistentes, y un JSON real de ejemplo. Propuesta de formato en la sección 6.
- [ ] **P2. Permisos de costos y márgenes** — hoy los ven admin y staff con permiso `stock` **o** `productos` (`has_costs_access()` en la migración). Revisar quién debe verlos.
- [ ] **P3. Función que calcula `cost_price` automáticamente** — a definir más adelante (entrada: se desconoce la fórmula/origen). La columna ya existe en `product_costs`.

## 4. Estado actual (2026-10-27)

**Implementado y probado en Postgres local; falta correr en Supabase real y probar en navegador.**

- `supabase/migration-stock-productos.sql` — elimina el módulo viejo; crea `product_costs`, `stock_movimientos`, triggers, guard sobre `products.stock`, vista `stock_control_productos`, RLS. Idempotente.
- `supabase/tests/stock/` — 44 pruebas, 44 PASS (stock negativo, concurrencia, anulación, vista, seguridad).
- Front: `src/pages/admin/sections/Stock/` (Control, Entradas, Salidas, modal de registro), `src/services/stockService.js`, `src/lib/stockUtils.js`.
- Código de producto: `products.code` (migración incluida en `migration-stock-productos.sql`, sección 2b). Se carga en el popup de Productos; se normaliza solo (mayúsculas, sin espacios, vacío = NULL); índice único parcial `products_code_key`.
- Productos: el popup tiene el stock **editable** (se quitó el bloqueo de la base); `ProductsTable.jsx` envía `stock` al guardar.
- Se borró `supabase/migration-stock.sql` (módulo viejo, nunca corrido en Supabase real).

**Para activarlo (acciones del usuario):**
1. Correr `supabase/migration-stock-productos.sql` en Supabase → SQL Editor.
2. Dar el permiso `stock` al staff desde `/admin/usuarios` si corresponde.
3. Probar en el navegador (la IA no tiene browser tool).

**Aviso:** los productos que ya tenían `stock > 0` conservan ese número, ahora leído como **docenas**, sin movimiento de origen. Revisar valores si antes estaban en unidades.

## 5. Checklist de tareas

### Fase A — Base de datos
- [x] A1. Decisiones tomadas (sección 2).
- [x] A2. Módulo viejo eliminado; `products.stock` como única fuente.
- [x] A3. Costos: tabla `product_costs` (`cost_price`, `cost_price_rounded`) — ver desviación en sección 2.
- [x] A4. Tabla `stock_movimientos` + triggers que mueven `products.stock` sin permitir negativo, con saldo y usuario.
- [x] A5. RLS: movimientos (admin/`stock`), costos (admin/`stock`/`productos`), `anon` sin acceso.
- [x] A6. Pruebas SQL (44/44).
- [ ] A7. **Correr la migración en Supabase real** (usuario).

### Fase B — Productos y costos
- [x] B1. ~~Stock fuera del payload~~ REVERTIDO (2026-10-27, pedido del usuario): `ProductsTable.jsx` vuelve a enviar `stock`.
- [x] B2. Costos: `cost_price` (solo lectura, automático a futuro) y `cost_price_rounded` (editable) en la pantalla de Control, no en el popup.
- [x] B3. ~~Stock en solo lectura~~ REVERTIDO: el stock del popup es editable. Se quitó el bloqueo en la base (`products_guard_stock`). Una edición manual no deja movimiento en el historial.

### Fase C — Pantalla de control de mercancía
- [x] C1. Tabla: título, stock, precio, precio costo, costo redondeado, margen (%), valor costo, valor venta, nivel.
- [x] C2. Búsqueda por título, filtros (todos / bajo / agotados), totales.
- [x] C3. `null` → "—" (precio a consultar, sin costo); aviso de productos con stock sin costo/precio.

### Fase D — Entradas y salidas
- [x] D1. Entradas (alta de varias líneas: producto + docenas).
- [x] D2. Salidas desde la sección Stock (también desde Control, por producto), validación antes de guardar + la base como defensa final.
- [x] D3. Anulación de movimientos con registro (no se borran).
- [ ] D4. Historial por producto (kardex): hoy hay historial por tipo (Entradas / Salidas) con saldo, falta la vista unificada por producto.

### Fase E — Importación por JSON
- [ ] E1–E4. **PENDIENTE (P1)**. No implementar hasta que el usuario lo retome.

### Fase F — Extras (todos aprobados, ninguno implementado salvo lo indicado)
- [ ] F1. Stock mínimo **por producto** + alerta (hoy el umbral es fijo: 5 docenas, en `stock_umbral_bajo()`).
- [ ] F2. Ajustes, mermas y devoluciones como tipos de movimiento (hoy solo entrada/salida).
- [ ] F3. Conteo físico con diferencias.
- [ ] F4. Valorización y margen: **ya hecho en Control** (valor a costo / a venta / margen). Falta reporte por período.
- [ ] F5. Exportar CSV/Excel y reportes por período.
- [x] F6. Código de producto: columna `products.code` (única, mayúsculas, opcional), campo en el popup de Productos, visible en tarjeta, Control y selector de movimientos (2026-10-27). Es el identificador previsto para el JSON.
- [ ] F7. Proveedor por entrada.
- [x] F8. Anular movimientos (hecho en D3).

### Cierre
- [ ] Z1. Verificar en navegador (el entorno de la IA no tiene browser tool: lo prueba el usuario).
- [x] Z2. `docs/stock-control.md` reescrito; memoria del proyecto actualizada.

## 6. Referencias

Formato JSON propuesto (solo referencia para P1, sin implementar):

```json
[
  { "producto": "Remera X", "cantidad": 12, "costo": 8500.40, "boleta": "A-123" }
]
```

Cómo se cargan las salidas hoy: **Stock → Salidas → "Nueva salida"** (o el botón de salida en la fila del producto en **Control**): producto + docenas + fecha + nota. Descuenta `products.stock` y queda registrado; se puede anular. Las ventas online y las órdenes **no** descuentan stock (fuera de alcance).
