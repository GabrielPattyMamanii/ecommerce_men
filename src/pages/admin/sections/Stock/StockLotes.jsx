import { useCallback, useEffect, useMemo, useState } from 'react'
import { S, ActionBtn } from '../../../../components/admin/AdminKit'
import { formatDocenas } from '../../../../lib/stockUtils'
import { listLotes, listTandas, corregirLote } from '../../../../services/stockService'
import { agruparLotes, rangoFechas } from '../../../../lib/lotesUtils'
import { Barra, LoteCard } from '../../../../components/admin/LoteCards'
import { PageHeader, Modal, cellStyle, headStyle } from './StockUi'

const muted = { color: 'var(--admin-text-muted)' }

/**
 * Corrección de "cuánto entró" de un producto en un lote. La base ajusta por DIFERENCIA (no pisa el stock),
 * conserva el id del lote y rechaza cargar menos de lo ya salido.
 */
function CorregirCantidad({ item, onDone, onCancel }) {
    const salido = Math.max(item.cantidad_inicial - item.cantidad_actual, 0)
    const [value, setValue] = useState(String(item.cantidad_inicial))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const n = Number(value)
    const valido = value !== '' && Number.isInteger(n) && n >= salido && n !== item.cantidad_inicial
    const nuevoActual = item.cantidad_actual + (n - item.cantidad_inicial)

    async function guardar(e) {
        e.preventDefault()
        setSaving(true); setError(null)
        try { await corregirLote(item.id, n); onDone() }
        catch (err) { setError(err.message) } finally { setSaving(false) }
    }

    return (
        <form onSubmit={guardar} style={{ display: 'grid', gap: '0.4rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="number" min={salido} step={1} value={value} autoFocus disabled={saving}
                    onChange={e => setValue(e.target.value)} aria-label="Cantidad que entró realmente"
                    style={{ ...S.inlineInput, width: '90px' }} />
                <button type="submit" disabled={!valido || saving} style={{ ...S.btnPrimary, opacity: !valido || saving ? 0.5 : 1 }}>
                    {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" onClick={onCancel} disabled={saving} style={S.btnGhost}>Cancelar</button>
            </div>
            <small style={{ ...muted, fontFamily: 'monospace' }}>
                Ya salieron {formatDocenas(salido)} doc.: no puedes cargar menos.
                {valido && ` Quedarán ${formatDocenas(nuevoActual)} disponibles (${n > item.cantidad_inicial ? '+' : ''}${n - item.cantidad_inicial}).`}
            </small>
            {error && <small role="alert" style={{ color: '#ef4444' }}>{error}</small>}
        </form>
    )
}

/** Detalle: los productos que pertenecen a UN lote. */
function DetalleModal({ lote, onClose, onChanged }) {
    const [q, setQ] = useState('')
    const [editing, setEditing] = useState(null) // id de la fila (stock_lotes.id) que se está corrigiendo
    const items = useMemo(() => {
        const t = q.trim().toLowerCase()
        return lote.items
            .filter(i => !t || (i.products?.name ?? '').toLowerCase().includes(t) || (i.products?.code ?? '').toLowerCase().includes(t))
            .sort((a, b) => (a.products?.name ?? '').localeCompare(b.products?.name ?? '', 'es'))
    }, [lote.items, q])

    return (
        <Modal title={lote.codigo} onClose={onClose}>
            <p style={{ ...muted, margin: '-0.5rem 0 1rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {rangoFechas(lote)} · {formatDocenas(lote.actual)} de {formatDocenas(lote.inicial)} docenas · {lote.items.length} {lote.items.length === 1 ? 'producto' : 'productos'}
            </p>
            {lote.items.length > 6 && (
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto o código…"
                    aria-label="Buscar producto en el lote" style={{ ...S.input, marginBottom: '0.75rem' }} />
            )}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Producto', 'Inicial', 'Actual'].map(h => <th key={h} style={headStyle}>{h}</th>)}</tr></thead>
                    <tbody>
                        {items.length === 0 && <tr><td colSpan={3} style={{ ...cellStyle, textAlign: 'center' }}>Sin resultados.</td></tr>}
                        {items.map(i => (
                            <tr key={i.id}>
                                <td style={{ ...cellStyle, fontFamily: 'inherit', fontWeight: 600 }}>
                                    {i.products?.name ?? '—'}
                                    {i.products?.code && <div style={{ ...muted, fontFamily: 'monospace', fontWeight: 400, fontSize: '0.65rem' }}>{i.products.code}</div>}
                                    <div style={{ marginTop: '0.35rem' }}><Barra actual={i.cantidad_actual} inicial={i.cantidad_inicial} /></div>
                                    {editing === i.id && (
                                        <CorregirCantidad item={i} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); onChanged() }} />
                                    )}
                                </td>
                                <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                                    {formatDocenas(i.cantidad_inicial)}{' '}
                                    {editing !== i.id && (
                                        <ActionBtn icon="edit" color="#38bdf8" title="Corregir cuánto entró (sin perder ventas)" onClick={() => setEditing(i.id)} />
                                    )}
                                </td>
                                <td style={{ ...cellStyle, fontWeight: 700, color: i.cantidad_actual === 0 ? 'var(--admin-text-muted)' : undefined }}>{formatDocenas(i.cantidad_actual)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" onClick={onClose} style={S.btnGhost}>Cerrar</button>
            </div>
        </Modal>
    )
}

/**
 * Lotes (tandas): una tarjeta por lote (LOTE-000, LOTE-001…); al entrar se ven los productos de ese lote.
 * Una tanda con el mismo nombre en varios productos es UN solo lote en pantalla.
 * Solo lectura: las cantidades las mueven entradas, salidas y ajustes.
 */
export default function StockLotes() {
    const [rows, setRows] = useState([])
    const [tandas, setTandas] = useState([])
    const [q, setQ] = useState('')
    const [soloConStock, setSoloConStock] = useState(true)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [abierto, setAbierto] = useState(null) // codigo del lote abierto

    const load = useCallback(async () => {
        try {
            const [l, t] = await Promise.all([listLotes(), listTandas()])
            setRows(l); setTandas(t); setError(null)
        }
        catch (err) { setError(err.message) } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])

    const lotes = useMemo(() => {
        const t = q.trim().toLowerCase()
        return agruparLotes(rows, { soloConStock, tandas })
            .filter(g => !t || g.codigo.toLowerCase().includes(t)
                || g.items.some(i => (i.products?.name ?? '').toLowerCase().includes(t) || (i.products?.code ?? '').toLowerCase().includes(t)))
    }, [rows, tandas, q, soloConStock])

    const detalle = abierto ? lotes.find(l => l.codigo === abierto) : null

    return (
        <div>
            <PageHeader title="Lotes / tandas" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input
                    type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar lote, producto o código…"
                    aria-label="Buscar lote" style={{ ...S.input, maxWidth: '300px' }}
                />
                <button onClick={() => setSoloConStock(v => !v)}
                    style={{ ...S.btnGhost, ...(soloConStock ? { background: 'var(--admin-primary)', color: 'white' } : {}) }}>
                    Solo con stock
                </button>
                <button onClick={load} style={S.btnGhost} title="Actualizar">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                </button>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.75rem', ...muted }}>
                Los lotes se crean en Productos → Por lotes, y cada uno agrupa los productos que llegaron juntos. LOTE-000 es la "tanda vieja": el stock que había antes de usar lotes.
                La cantidad actual baja con las ventas y sube con ajustes. Si cargaste mal cuánto entró, corrígelo con el lápiz dentro del lote:
                se ajusta por diferencia y no se pierden las ventas ya hechas.
            </p>

            {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
            {loading ? <p style={muted}>Cargando…</p> : lotes.length === 0 ? (
                <p style={{ ...muted, textAlign: 'center', padding: '2rem 0' }}>No hay lotes para mostrar.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {lotes.map(l => <LoteCard key={l.codigo} lote={l} onOpen={setAbierto} />)}
                </div>
            )}

            {detalle && <DetalleModal key={detalle.codigo} lote={detalle} onClose={() => setAbierto(null)} onChanged={load} />}
        </div>
    )
}
