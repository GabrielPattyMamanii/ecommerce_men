import { useCallback, useEffect, useMemo, useState } from 'react'
import { S, ActionBtn, ToastStack, useToasts } from '../../../../components/admin/AdminKit'
import { LoteCard } from '../../../../components/admin/LoteCards'
import { agruparLotes, rangoFechas } from '../../../../lib/lotesUtils'
import { formatDocenas, formatMoney } from '../../../../lib/stockUtils'
import { listControl, listLotes, listTandas, saveCostoRedondeado } from '../../../../services/stockService'
import { PageHeader, cellStyle, headStyle } from './StockUi'
import MovimientoModal from './MovimientoModal'

const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'bajo', label: 'Stock bajo' },
    { key: 'agotado', label: 'Agotados' },
]

const muted = { color: 'var(--admin-text-muted)' }
const activo = on => (on ? { background: 'var(--admin-primary)', color: 'white' } : {})

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

/**
 * Tabla de productos: nombre, stock, precio normal, precio mayorista, precio costo y costo redondeado.
 * `loteDe` (opcional): fila del lote del producto → el stock se muestra "en este lote" (actual / inicial).
 */
function TablaProductos({ rows, loteDe, onSaved, addToast, onMov }) {
    const cols = ['Producto', loteDe ? 'Stock en el lote (doc.)' : 'Stock (doc.)', 'Precio normal', 'Precio mayorista', 'Precio costo', 'Precio redondeado', '']
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{cols.map((h, i) => <th key={i} style={headStyle}>{h}</th>)}</tr></thead>
                <tbody>
                    {rows.length === 0 && <tr><td colSpan={cols.length} style={{ ...cellStyle, textAlign: 'center' }}>No hay productos para mostrar.</td></tr>}
                    {rows.map(r => {
                        const lote = loteDe?.(r.product_id)
                        return (
                            <tr key={r.product_id}>
                                <td style={{ ...cellStyle, fontFamily: 'inherit', fontWeight: 600 }}>{r.titulo}</td>
                                <td style={{ ...cellStyle, fontWeight: 700 }}>
                                    {lote
                                        ? <>{formatDocenas(lote.cantidad_actual)} <span style={{ ...muted, fontWeight: 400 }}>/ {formatDocenas(lote.cantidad_inicial)}</span></>
                                        : formatDocenas(r.stock)}
                                </td>
                                <td style={cellStyle}>{formatMoney(r.precio)}</td>
                                <td style={cellStyle}>{formatMoney(r.precio_mayorista)}</td>
                                <td style={cellStyle}>{formatMoney(r.precio_costo)}</td>
                                <td style={cellStyle}><CostoRedondeadoCell row={r} onSaved={onSaved} addToast={addToast} /></td>
                                <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                                    <ActionBtn icon="move_to_inbox" color="#10b981" title="Registrar entrada" onClick={() => onMov({ tipo: 'entrada', productId: r.product_id })} />{' '}
                                    <ActionBtn icon="outbox" color="#38bdf8" title="Registrar salida" onClick={() => onMov({ tipo: 'salida', productId: r.product_id })} />
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default function StockControl() {
    const [rows, setRows] = useState([])
    const [lotesRows, setLotesRows] = useState([])
    const [tandasRows, setTandasRows] = useState([])
    const [filtro, setFiltro] = useState('todos')
    const [q, setQ] = useState('')
    const [vista, setVista] = useState('lista') // 'lista' | 'lotes'
    const [soloConStock, setSoloConStock] = useState(true)
    const [selectedLote, setSelectedLote] = useState(null) // nombre del lote abierto
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [mov, setMov] = useState(null) // { tipo, productId }
    const { toasts, addToast, dismissToast } = useToasts()

    const load = useCallback(async () => {
        try {
            const [control, lotes, tandas] = await Promise.all([
                listControl(),
                listLotes().catch(() => []),   // sin permiso o migración pendiente: la vista por lotes queda vacía
                listTandas().catch(() => []),
            ])
            setRows(control); setLotesRows(lotes); setTandasRows(tandas); setError(null)
        } catch (err) { setError(err.message) } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])

    // Lotes con sus productos. Los productos sin ninguna fila de lote se listan en VARIOS (0/0).
    const loteGroups = useMemo(
        () => agruparLotes(lotesRows, {
            soloConStock, tandas: tandasRows,
            productos: rows.map(r => ({ id: r.product_id, name: r.titulo, code: r.codigo })),
        }),
        [lotesRows, tandasRows, soloConStock, rows]
    )
    const loteGroup = vista === 'lotes' && selectedLote ? loteGroups.find(g => g.codigo === selectedLote) ?? null : null
    const itemPorProducto = useMemo(() => new Map((loteGroup?.items ?? []).map(i => [i.product_id, i])), [loteGroup])
    const enGrillaDeLotes = vista === 'lotes' && !loteGroup

    const visibles = useMemo(() => {
        const t = q.trim().toLowerCase()
        const base = loteGroup ? rows.filter(r => itemPorProducto.has(r.product_id)) : rows
        return base.filter(r => (filtro === 'todos' || r.nivel === filtro) && (!t || r.titulo.toLowerCase().includes(t) || (r.codigo ?? '').toLowerCase().includes(t)))
    }, [rows, loteGroup, itemPorProducto, filtro, q])

    function cambiarVista(v) { setVista(v); setSelectedLote(null) }

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
                <div role="group" aria-label="Forma de mostrar los productos" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => cambiarVista('lista')} aria-pressed={vista === 'lista'} style={{ ...S.btnGhost, ...activo(vista === 'lista') }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>view_list</span> Lista
                    </button>
                    <button onClick={() => cambiarVista('lotes')} aria-pressed={vista === 'lotes'} style={{ ...S.btnGhost, ...activo(vista === 'lotes') }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>inventory_2</span> Por lotes
                    </button>
                </div>
                {!enGrillaDeLotes && (
                    <>
                        <input
                            type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código o título…"
                            aria-label="Buscar producto" style={{ ...S.input, maxWidth: '280px' }}
                        />
                        {FILTROS.map(f => (
                            <button key={f.key} onClick={() => setFiltro(f.key)} style={{ ...S.btnGhost, ...activo(filtro === f.key) }}>
                                {f.label}
                            </button>
                        ))}
                    </>
                )}
                {enGrillaDeLotes && (
                    <button onClick={() => setSoloConStock(v => !v)} style={{ ...S.btnGhost, ...activo(soloConStock) }}>Solo con stock</button>
                )}
                <button onClick={load} style={S.btnGhost} title="Actualizar">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                </button>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', ...muted }}>
                Stock en docenas. El costo redondeado se carga a mano. Stock bajo = 5 docenas o menos.
            </p>

            {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
            {loading ? <p style={muted}>Cargando…</p> : enGrillaDeLotes ? (
                loteGroups.length === 0 ? (
                    <p role="status" style={{ ...muted, textAlign: 'center', padding: '2rem 0' }}>
                        No hay lotes para mostrar{soloConStock ? ' con stock (prueba desactivar "Solo con stock")' : ''}.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                        {loteGroups.map(g => <LoteCard key={g.codigo} lote={g} onOpen={setSelectedLote} />)}
                    </div>
                )
            ) : (
                <>
                    {loteGroup && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <button onClick={() => { setSelectedLote(null); setQ(''); setFiltro('todos') }} style={S.btnGhost}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span> Lotes
                            </button>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--admin-text)' }}>{loteGroup.codigo}</h3>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', ...muted }}>
                                {rangoFechas(loteGroup)} · {formatDocenas(loteGroup.actual)} de {formatDocenas(loteGroup.inicial)} docenas · {loteGroup.items.length} {loteGroup.items.length === 1 ? 'producto' : 'productos'}
                            </span>
                        </div>
                    )}
                    <TablaProductos
                        rows={visibles}
                        loteDe={loteGroup ? id => itemPorProducto.get(id) : undefined}
                        onSaved={load} addToast={addToast} onMov={setMov}
                    />
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
