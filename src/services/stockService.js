/**
 * stockService — acceso a datos del control de stock (products.stock, en docenas).
 *
 * Reglas:
 *  - Lecturas de stock, costo, margen y nivel SOLO desde la vista `stock_control_productos`.
 *  - Nunca se escribe `products.stock`: lo mueven los triggers de `stock_movimientos`
 *    (la base rechaza la edición a mano).
 *  - Los movimientos no se editan ni se borran: se anulan.
 *  - Antes de guardar salidas se relee el stock real; la base sigue siendo la defensa final.
 */
import { supabase } from './supabaseClient'

/** Traduce un error de Supabase/Postgres a un mensaje claro para el usuario. */
export function stockErrorMessage(error) {
    const msg = error?.message ?? String(error ?? '')
    if (/Stock insuficiente|ya está anulado|solo se anula|no se edita a mano|no existe/i.test(msg)) return msg
    if (/row-level security|permission denied/i.test(msg)) return 'No tienes permiso para esta operación en Stock.'
    if (/check constraint|violates check/i.test(msg)) return 'Algún valor no es válido (las cantidades y costos deben ser positivos).'
    return msg || 'Error inesperado al guardar. No se realizó ningún cambio.'
}

async function run(promise) {
    const { data, error } = await promise
    if (error) throw new Error(stockErrorMessage(error))
    return data
}

/* ── Lecturas ── */
export const listControl = () =>
    run(supabase.from('stock_control_productos').select('*').order('titulo'))

export const listMovimientos = tipo =>
    run(supabase.from('stock_movimientos')
        .select('id, product_id, tipo, cantidad, fecha, nota, saldo, anulado_at, created_at, products(name)')
        .eq('tipo', tipo)
        .order('fecha', { ascending: false }).order('created_at', { ascending: false })
        .limit(500))

/** Stock real de la base, justo antes de guardar. Devuelve { [product_id]: stock }. */
async function freshStock(productIds) {
    const rows = await run(supabase.from('products').select('id, stock').in('id', [...new Set(productIds)]))
    return Object.fromEntries(rows.map(r => [r.id, r.stock]))
}

/**
 * Registra varias líneas en una sola operación (un único INSERT = atómico).
 * lines: [{ product_id, cantidad }]
 */
export async function createMovimientos(tipo, lines, { fecha, nota }) {
    if (tipo === 'salida') {
        const need = {}
        for (const l of lines) need[l.product_id] = (need[l.product_id] ?? 0) + l.cantidad
        const disp = await freshStock(Object.keys(need))
        for (const [id, total] of Object.entries(need)) {
            if (total > (disp[id] ?? 0)) {
                throw new Error(`Stock insuficiente: quedan ${disp[id] ?? 0} docenas disponibles y se intentan sacar ${total}.`)
            }
        }
    }
    return run(supabase.from('stock_movimientos').insert(
        lines.map(l => ({ product_id: l.product_id, tipo, cantidad: l.cantidad, fecha, nota: nota || null }))
    ))
}

/** Anula un movimiento (revierte el stock; el registro queda). */
export const anularMovimiento = id =>
    run(supabase.from('stock_movimientos').update({ anulado_at: new Date().toISOString() }).eq('id', id))

/** Guarda el costo redondeado (a mano). `value` null/'' lo deja vacío. */
export function saveCostoRedondeado(productId, value) {
    const v = value === '' || value == null ? null : Number(value)
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
        return Promise.reject(new Error('El costo redondeado debe ser un número mayor o igual a 0.'))
    }
    return run(supabase.from('product_costs').upsert({ product_id: productId, cost_price_rounded: v }, { onConflict: 'product_id' }))
}
