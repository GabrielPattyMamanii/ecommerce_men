/**
 * lotesUtils — agrupa filas de `stock_lotes` por nombre de lote (LOTE-000, LOTE-001…).
 * Una tanda con el mismo nombre en varios productos es UN solo lote en pantalla.
 */

/** Lote del sistema donde viven los productos que no pertenecen a ningún lote. No se elimina ni se renombra. */
export const CODIGO_VARIOS = 'VARIOS'

/** "2026-10-29" o "2026-03-01 → 2026-10-29" si el lote reúne varias fechas. */
export const rangoFechas = g => (g.desde === g.hasta ? g.desde : `${g.desde} → ${g.hasta}`)

/**
 * rows: filas de stock_lotes ({ codigo, fecha_ingreso, cantidad_inicial, cantidad_actual, … }).
 * tandas: filas de `stock_tandas` ({ codigo, fecha, es_sistema }). Un lote recién creado todavía no tiene
 *   productos: se muestra igual (items vacío) para poder cargarle productos.
 * productos: (opcional) catálogo completo. Los productos que no tienen NINGUNA fila de lote (creados fuera
 *   de lotes con stock 0) se listan dentro de VARIOS con 0/0, porque ahí es donde pertenecen.
 *
 * Devuelve [{ codigo, items, inicial, actual, desde, hasta, sistema }]:
 * primero los lotes del sistema (VARIOS), después el más reciente primero (LOTE-000, la "tanda vieja", al final).
 * Los lotes del sistema muestran todos sus productos aunque estén en 0, sin importar `soloConStock`.
 */
export function agruparLotes(rows, { soloConStock = true, tandas = [], productos = null } = {}) {
    const sistema = new Set([CODIGO_VARIOS, ...tandas.filter(t => t.es_sistema).map(t => t.codigo)])
    const porCodigo = new Map()
    const conProductos = new Set(rows.map(r => r.codigo))
    for (const t of tandas) {
        if (conProductos.has(t.codigo)) continue
        porCodigo.set(t.codigo, { codigo: t.codigo, items: [], inicial: 0, actual: 0, desde: t.fecha, hasta: t.fecha })
    }
    for (const r of rows) {
        if (soloConStock && r.cantidad_actual <= 0 && !sistema.has(r.codigo)) continue
        const g = porCodigo.get(r.codigo) ?? { codigo: r.codigo, items: [], inicial: 0, actual: 0, desde: r.fecha_ingreso, hasta: r.fecha_ingreso }
        g.items.push(r)
        g.inicial += r.cantidad_inicial
        g.actual += r.cantidad_actual
        if (r.fecha_ingreso < g.desde) g.desde = r.fecha_ingreso
        if (r.fecha_ingreso > g.hasta) g.hasta = r.fecha_ingreso
        porCodigo.set(r.codigo, g)
    }

    // Productos sin ninguna fila de lote → viven en VARIOS (con 0/0). Solo si VARIOS existe en la base.
    if (productos) {
        const tandaVarios = tandas.find(t => t.codigo === CODIGO_VARIOS)
        if (tandaVarios || porCodigo.has(CODIGO_VARIOS)) {
            const g = porCodigo.get(CODIGO_VARIOS)
                ?? { codigo: CODIGO_VARIOS, items: [], inicial: 0, actual: 0, desde: tandaVarios.fecha, hasta: tandaVarios.fecha }
            const conFilas = new Set(rows.map(r => r.product_id))
            for (const p of productos) {
                if (conFilas.has(p.id)) continue
                g.items.push({
                    id: `sin-${p.id}`, product_id: p.id, codigo: CODIGO_VARIOS, fecha_ingreso: g.desde, created_at: '',
                    cantidad_inicial: 0, cantidad_actual: 0, products: { name: p.name, code: p.code }, sintetico: true,
                })
            }
            porCodigo.set(CODIGO_VARIOS, g)
        }
    }

    return [...porCodigo.values()]
        .map(g => ({ ...g, sistema: sistema.has(g.codigo) }))
        .sort((a, b) =>
            (b.sistema - a.sistema)
            || b.hasta.localeCompare(a.hasta)
            || b.codigo.localeCompare(a.codigo, 'es', { numeric: true }))
}
