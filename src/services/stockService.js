/**
 * stockService — acceso a datos del control de stock (products.stock, en docenas).
 *
 * Reglas:
 *  - Lecturas de stock, costo, margen y nivel SOLO desde la vista `stock_control_productos`.
 *  - Nunca se escribe `products.stock`: lo mueven los triggers de `stock_movimientos`
 *    (la base rechaza la edición a mano).
 *  - Los movimientos no se editan ni se borran: se anulan.
 *  - Cada movimiento pertenece a UN lote (tanda). Las salidas descuentan del lote que se elige
 *    a mano (no hay FIFO automático). Los lotes (LOTE-001, LOTE-002…) se crean desde Productos →
 *    "Por lotes" (`crearTanda`) y se les cargan productos (`agregarATanda`).
 *  - `stock_lotes.cantidad_actual` solo lo mueven los movimientos (la base rechaza escribirlo).
 *  - Antes de guardar salidas se relee el stock real del lote; la base sigue siendo la defensa final.
 */
import { supabase } from './supabaseClient'

/** Traduce un error de Supabase/Postgres a un mensaje claro para el usuario. */
export function stockErrorMessage(error) {
    const msg = error?.message ?? String(error ?? '')
    if (/stock_lotes_prod_codigo_key|stock_tandas_codigo_key/i.test(msg)) return 'Ya existe un lote con ese nombre. Elige otro nombre.'
    if (/Stock insuficiente|ya está anulado|solo se anula|no se edita a mano|no existe|Elige el lote|ya no tiene esas docenas|al menos un producto|No puedes cargar menos|es la misma que|entero mayor o igual a 0|ya está en el lote|ya tiene productos|mayor a 0|no puede estar vacío|es del sistema/i.test(msg)) return msg
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
/**
 * Filas de Control (vista `stock_control_productos`) + `precio_mayorista` (products.wholesale_price),
 * que la vista no trae: se pide aparte y se une por id.
 */
export async function listControl() {
    const [rows, prods] = await Promise.all([
        run(supabase.from('stock_control_productos').select('*').order('titulo')),
        run(supabase.from('products').select('id, wholesale_price')),
    ])
    const mayorista = new Map(prods.map(p => [p.id, p.wholesale_price]))
    return rows.map(r => ({ ...r, precio_mayorista: mayorista.get(r.product_id) ?? null }))
}

export const listMovimientos = tipo =>
    run(supabase.from('stock_movimientos')
        .select('id, product_id, tipo, motivo, cantidad, fecha, nota, saldo, anulado_at, created_at, lote_id, products(name), stock_lotes(codigo)')
        .eq('tipo', tipo)
        .order('fecha', { ascending: false }).order('created_at', { ascending: false })
        .limit(500))

/** Lotes (tandas) con su producto. Los más recientes primero. */
export const listLotes = () =>
    run(supabase.from('stock_lotes')
        .select('id, product_id, codigo, fecha_ingreso, cantidad_inicial, cantidad_actual, nota, created_at, products(name, code)')
        .order('fecha_ingreso', { ascending: false }).order('created_at', { ascending: false })
        .limit(2000))

/** Lotes como tales (incluye los vacíos, recién creados y sin productos todavía). */
export const listTandas = () =>
    run(supabase.from('stock_tandas').select('id, codigo, fecha, nota, es_sistema, created_at').order('created_at', { ascending: false }))

/** Nombre por defecto del próximo lote (LOTE-001, LOTE-002…). Se puede editar al crearlo. */
export const siguienteCodigoLote = () => run(supabase.rpc('stock_siguiente_codigo_lote'))

/** Crea un lote VACÍO (desde Productos → Por lotes). `codigo` vacío → la base asigna LOTE-NNN. */
export const crearTanda = ({ codigo, fecha, nota }) =>
    run(supabase.rpc('stock_crear_tanda', { p_codigo: codigo?.trim() || null, p_fecha: fecha || null, p_nota: nota || null }))

/**
 * Carga un producto (nuevo o existente) a un lote con la cantidad que ENTRA, en docenas.
 * La base crea la fila del producto en el lote y el movimiento de ingreso (suma al stock del producto).
 */
export const agregarATanda = ({ codigo, productId, cantidad, nota }) =>
    run(supabase.rpc('stock_agregar_a_tanda', { p_codigo: codigo, p_product: productId, p_cantidad: cantidad, p_nota: nota || null }))

/**
 * Elimina un lote. Sus productos (si tiene) pasan a VARIOS con sus cantidades e historial.
 * VARIOS (lote del sistema) no se puede eliminar. Devuelve cuántos productos pasaron a VARIOS.
 */
export const eliminarTanda = codigo => run(supabase.rpc('stock_eliminar_tanda', { p_codigo: codigo }))

/** Cantidad real de cada lote, justo antes de guardar. Devuelve { [lote_id]: { codigo, cantidad_actual } }. */
async function freshLotes(loteIds) {
    const rows = await run(supabase.from('stock_lotes').select('id, codigo, cantidad_actual').in('id', [...new Set(loteIds)]))
    return Object.fromEntries(rows.map(r => [r.id, r]))
}

/**
 * Registra varias líneas sobre lotes EXISTENTES en una sola operación (un único INSERT = atómico).
 * motivo: 'venta' (salida) | 'ajuste' (entrada o salida).
 * lines: [{ product_id, lote_id, cantidad }]
 */
export async function createMovimientos(tipo, lines, { fecha, nota, motivo }) {
    if (tipo === 'salida') {
        const need = {}
        for (const l of lines) need[l.lote_id] = (need[l.lote_id] ?? 0) + l.cantidad
        const disp = await freshLotes(Object.keys(need))
        for (const [id, total] of Object.entries(need)) {
            const quedan = disp[id]?.cantidad_actual ?? 0
            if (total > quedan) {
                throw new Error(`Stock insuficiente en el lote ${disp[id]?.codigo ?? ''}: quedan ${quedan} docenas disponibles y se intentan sacar ${total}.`)
            }
        }
    }
    return run(supabase.from('stock_movimientos').insert(
        lines.map(l => ({ product_id: l.product_id, lote_id: l.lote_id, tipo, motivo, cantidad: l.cantidad, fecha, nota: nota || null }))
    ))
}

/**
 * Corrige cuánto entró en un lote (ej. 30 → 35) sin perder las ventas: la base ajusta por DIFERENCIA
 * (también la cantidad actual y el stock del producto), conserva el id del lote, rechaza cargar menos
 * de lo ya salido y deja un movimiento de ajuste en el Kardex.
 */
export const corregirLote = (loteId, nuevaInicial, nota) =>
    run(supabase.rpc('stock_corregir_lote', { p_lote: loteId, p_nueva_inicial: nuevaInicial, p_nota: nota || null }))

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
