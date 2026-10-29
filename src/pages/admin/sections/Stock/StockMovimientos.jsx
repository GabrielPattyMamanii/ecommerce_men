import { useCallback, useEffect, useState } from 'react'
import { S, ActionBtn, ConfirmModal, ToastStack, useToasts } from '../../../../components/admin/AdminKit'
import { formatDocenas } from '../../../../lib/stockUtils'
import { listControl, listMovimientos, anularMovimiento } from '../../../../services/stockService'
import { PageHeader, cellStyle, headStyle } from './StockUi'
import MovimientoModal from './MovimientoModal'

const COPY = {
    entrada: { title: 'Entradas', nuevo: 'Entrada (ajuste)', vacio: 'Sin entradas todavía.', anular: 'Se anulará la entrada y se descontarán esas docenas de su lote y del stock.' },
    salida:  { title: 'Salidas',  nuevo: 'Nueva salida',  vacio: 'Sin salidas todavía.',  anular: 'Se anulará la salida y esas docenas vuelven a su lote y al stock.' },
}

const MOTIVO_LABEL = { ingreso: 'Ingreso', venta: 'Venta', ajuste: 'Ajuste', devolucion: 'Devolución' }

/** Historial + alta de entradas o salidas. `tipo`: 'entrada' | 'salida'. */
export default function StockMovimientos({ tipo }) {
    const [rows, setRows] = useState([])
    const [productos, setProductos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [creating, setCreating] = useState(false)
    const [toAnular, setToAnular] = useState(null)
    const [busy, setBusy] = useState(false)
    const { toasts, addToast, dismissToast } = useToasts()

    const load = useCallback(async () => {
        try {
            const [m, p] = await Promise.all([listMovimientos(tipo), listControl()])
            setRows(m); setProductos(p); setError(null)
        } catch (err) { setError(err.message) } finally { setLoading(false) }
    }, [tipo])
    useEffect(() => { setLoading(true); load() }, [load])

    async function confirmAnular() {
        setBusy(true)
        try {
            await anularMovimiento(toAnular.id)
            addToast('success', 'Movimiento anulado. El stock fue ajustado.')
            setToAnular(null); load()
        } catch (err) { addToast('error', err.message); setToAnular(null) } finally { setBusy(false) }
    }

    const c = COPY[tipo]
    return (
        <div>
            <PageHeader title={c.title}>
                <button style={S.btnPrimary} onClick={() => setCreating(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span> {c.nuevo}
                </button>
            </PageHeader>
            {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
            {loading ? <p style={{ color: 'var(--admin-text-muted)' }}>Cargando…</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['Fecha', 'Producto', 'Lote', 'Motivo', 'Docenas', 'Saldo', 'Nota', ''].map(h => <th key={h} style={headStyle}>{h}</th>)}</tr></thead>
                        <tbody>
                            {rows.length === 0 && <tr><td colSpan={8} style={{ ...cellStyle, textAlign: 'center' }}>{c.vacio}</td></tr>}
                            {rows.map(r => {
                                const anulado = !!r.anulado_at
                                const st = anulado ? { opacity: 0.5, textDecoration: 'line-through' } : {}
                                return (
                                    <tr key={r.id}>
                                        <td style={{ ...cellStyle, ...st }}>{r.fecha}</td>
                                        <td style={{ ...cellStyle, ...st }}>{r.products?.name ?? '—'}</td>
                                        <td style={{ ...cellStyle, ...st }}>{r.stock_lotes?.codigo ?? '—'}</td>
                                        <td style={{ ...cellStyle, ...st }}>{MOTIVO_LABEL[r.motivo] ?? r.motivo ?? '—'}</td>
                                        <td style={{ ...cellStyle, ...st }}>{formatDocenas(r.cantidad)}</td>
                                        <td style={{ ...cellStyle, ...st }}>{r.saldo ?? '—'}</td>
                                        <td style={{ ...cellStyle, ...st }}>{r.nota || '—'}</td>
                                        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                                            {anulado
                                                ? <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Anulado</span>
                                                : <ActionBtn icon="undo" color="#ef4444" title="Anular" onClick={() => setToAnular(r)} />}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {creating && (
                <MovimientoModal
                    tipo={tipo} productos={productos} addToast={addToast}
                    onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }}
                />
            )}
            {toAnular && (
                <ConfirmModal title="Anular movimiento" busy={busy} confirmLabel="Anular" busyLabel="Anulando…"
                    message={c.anular} onConfirm={confirmAnular} onCancel={() => setToAnular(null)} />
            )}
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
