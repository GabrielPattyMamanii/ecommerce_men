/**
 * stockUtils — presentación del stock (docenas) y dinero.
 *
 * El stock, costo, margen, valores y nivel NO se calculan acá: vienen ya
 * calculados por la vista `stock_control_productos`. Las pantallas solo muestran
 * lo que devuelve la base. Valores null (sin precio / sin costo) se muestran "—".
 */

export const NIVEL_META = {
    normal:  { label: 'Normal',     color: '#10b981' },
    bajo:    { label: 'Stock bajo', color: '#f59e0b' },
    agotado: { label: 'Agotado',    color: '#ef4444' },
}

/** Docenas siempre enteras. */
export function formatDocenas(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return '0'
    return String(Math.trunc(v))
}

/** Dinero o "—" cuando el valor es null/undefined/no numérico (nunca 0 ni NaN). */
export function formatMoney(n) {
    if (n === null || n === undefined || n === '') return '—'
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    return v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

export function formatPct(n) {
    if (n === null || n === undefined || n === '') return '—'
    const v = Number(n)
    return Number.isFinite(v) ? `${v.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%` : '—'
}
