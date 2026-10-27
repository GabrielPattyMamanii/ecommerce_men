import { useCallback, useEffect, useMemo, useState } from 'react'
import { S, ActionBtn, ToastStack, useToasts } from '../../../../components/admin/AdminKit'
import { formatDocenas, formatMoney, formatPct } from '../../../../lib/stockUtils'
import { listControl, saveCostoRedondeado } from '../../../../services/stockService'
import { PageHeader, NivelBadge, cellStyle, headStyle } from './StockUi'
import MovimientoModal from './MovimientoModal'

const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'bajo', label: 'Stock bajo' },
    { key: 'agotado', label: 'Agotados' },
]

/** Costo redondeado: se carga a mano; guarda al salir del campo o con Enter. */
function CostoRedondeadoCell({ row, onSaved, addToast }) {
    const inicial = row.precio_costo_redondeado ?? ''
    const [value, setValue] = useState(String(inicial))
    const [saving, setSaving] = useState(false)
    useEffect(() => { setValue(String(row.precio_costo_redondeado ?? '')) }, [row.precio_costo_redondeado])

    async function commit() {
        if (value === String(inicial)) return
        setSaving(true)
        try {
            await saveCostoRedondeado(row.product_id, value)
            onSaved()
        } catch (err) {
            addToast('error', err.message)
            setValue(String(inicial))
        } finally { setSaving(false) }
    }

    return (
        <input
            type="number" min={0} step="0.01" value={value} disabled={saving} placeholder="—"
            aria-label={`Costo redondeado de ${row.titulo}`}
            onChange={e => setValue(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            style={{ ...S.inlineInput, width: '110px', opacity: saving ? 0.6 : 1 }}
        />
    )
}

function Totales({ rows }) {
    // Suma solo filas con valor (null = sin precio/costo, no suma 0 engañoso).
    const sum = key => rows.reduce((s, r) => s + (r[key] == null ? 0 : Number(r[key])), 0)
    const sinCosto = rows.filter(r => r.stock > 0 && r.valor_costo == null).length
    const sinPrecio = rows.filter(r => r.stock > 0 && r.valor_venta == null).length
    const item = (label, value) => (
        <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{label}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--admin-text)' }}>{value}</div>
        </div>
    )
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '1rem', padding: '1rem 1.25rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: '16px' }}>
            {item('Productos', rows.length)}
            {item('Docenas en stock', formatDocenas(rows.reduce((s, r) => s + r.stock, 0)))}
            {item('Valor a costo', formatMoney(sum('valor_costo')))}
            {item('Valor a venta', formatMoney(sum('valor_venta')))}
            {(sinCosto > 0 || sinPrecio > 0) && (
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', alignSelf: 'center' }}>
                    {sinCosto > 0 && `${sinCosto} con stock sin costo. `}{sinPrecio > 0 && `${sinPrecio} con stock sin precio.`}
                </div>
            )}
        </div>
    )
}

export default function StockControl() {
    const [rows, setRows] = useState([])
    const [filtro, setFiltro] = useState('todos')
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [mov, setMov] = useState(null) // { tipo, productId }
    const { toasts, addToast, dismissToast } = useToasts()

    const load = useCallback(async () => {
        try { setRows(await listControl()); setError(null) }
        catch (err) { setError(err.message) } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])

    const visibles = useMemo(() => {
        const t = q.trim().toLowerCase()
        return rows.filter(r => (filtro === 'todos' || r.nivel === filtro) && (!t || r.titulo.toLowerCase().includes(t) || (r.codigo ?? '').toLowerCase().includes(t)))
    }, [rows, filtro, q])

    const cols = ['Código', 'Título', 'Stock (doc.)', 'Precio', 'Precio costo', 'Costo redondeado', 'Margen', 'Valor costo', 'Valor venta', 'Nivel', '']

    return (
        <div>
            <PageHeader title="Control de mercancía">
                <button style={S.btnPrimary} onClick={() => setMov({ tipo: 'entrada' })}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>move_to_inbox</span> Entrada
                </button>
                <button style={S.btnPrimary} onClick={() => setMov({ tipo: 'salida' })}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>outbox</span> Salida
                </button>
            </PageHeader>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input
                    type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código o título…"
                    aria-label="Buscar producto" style={{ ...S.input, maxWidth: '280px' }}
                />
                {FILTROS.map(f => (
                    <button key={f.key} onClick={() => setFiltro(f.key)}
                        style={{ ...S.btnGhost, ...(filtro === f.key ? { background: 'var(--admin-primary)', color: 'white' } : {}) }}>
                        {f.label}
                    </button>
                ))}
                <button onClick={load} style={S.btnGhost} title="Actualizar">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                </button>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                Stock en docenas; el precio es el precio minorista por docena. Costo redondeado a mano; el margen usa el redondeado
                (si no hay, el costo). Stock bajo = 5 docenas o menos.
            </p>

            {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
            {loading ? <p style={{ color: 'var(--admin-text-muted)' }}>Cargando…</p> : (
                <>
                    <Totales rows={visibles} />
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr>{cols.map((h, i) => <th key={i} style={headStyle}>{h}</th>)}</tr></thead>
                            <tbody>
                                {visibles.length === 0 && <tr><td colSpan={cols.length} style={{ ...cellStyle, textAlign: 'center' }}>No hay productos para mostrar.</td></tr>}
                                {visibles.map(r => (
                                    <tr key={r.product_id}>
                                        <td style={cellStyle}>{r.codigo || <span style={{ color: 'var(--admin-text-muted)' }} title="Cargalo en Productos">—</span>}</td>
                                        <td style={{ ...cellStyle, fontFamily: 'inherit', fontWeight: 600 }}>
                                            {r.titulo}
                                            {r.sin_control && <span title="Se vende como Disponible aunque el stock sea 0" style={{ marginLeft: '0.4rem', fontSize: '0.6rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>sin control</span>}
                                        </td>
                                        <td style={{ ...cellStyle, fontWeight: 700 }}>{formatDocenas(r.stock)}</td>
                                        <td style={cellStyle}>{formatMoney(r.precio)}</td>
                                        <td style={cellStyle}>{formatMoney(r.precio_costo)}</td>
                                        <td style={cellStyle}><CostoRedondeadoCell row={r} onSaved={load} addToast={addToast} /></td>
                                        <td style={cellStyle}>{formatMoney(r.margen)} <span style={{ color: 'var(--admin-text-muted)' }}>({formatPct(r.margen_pct)})</span></td>
                                        <td style={cellStyle}>{formatMoney(r.valor_costo)}</td>
                                        <td style={cellStyle}>{formatMoney(r.valor_venta)}</td>
                                        <td style={cellStyle}><NivelBadge nivel={r.nivel} /></td>
                                        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                                            <ActionBtn icon="move_to_inbox" color="#10b981" title="Registrar entrada" onClick={() => setMov({ tipo: 'entrada', productId: r.product_id })} />{' '}
                                            <ActionBtn icon="outbox" color="#38bdf8" title="Registrar salida" onClick={() => setMov({ tipo: 'salida', productId: r.product_id })} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {mov && (
                <MovimientoModal
                    tipo={mov.tipo} productos={rows} presetProductId={mov.productId} addToast={addToast}
                    onClose={() => setMov(null)} onSaved={() => { setMov(null); load() }}
                />
            )}
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
