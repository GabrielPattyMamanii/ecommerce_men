import { useMemo, useState } from 'react'
import { S, ActionBtn } from '../../../../components/admin/AdminKit'
import { formatDocenas } from '../../../../lib/stockUtils'
import { createMovimientos } from '../../../../services/stockService'
import { Modal, FormError } from './StockUi'

const today = () => new Date().toISOString().slice(0, 10)
const newLine = product_id => ({ key: crypto.randomUUID(), product_id: product_id ?? '', cantidad: '' })

const COPY = {
    entrada: { title: 'Nueva entrada', ok: 'Entrada registrada.' },
    salida:  { title: 'Nueva salida',  ok: 'Salida registrada.' },
}

/**
 * Registro de entradas y salidas (producto + cantidad en docenas).
 * Se usa desde Control, Entradas y Salidas. La base valida el stock; acá solo se avisa antes.
 * productos: filas de `stock_control_productos` ({ product_id, titulo, stock }).
 */
export default function MovimientoModal({ tipo, productos, presetProductId, onSaved, onClose, addToast }) {
    const esSalida = tipo === 'salida'
    const [fecha, setFecha] = useState(today())
    const [nota, setNota] = useState('')
    const [lines, setLines] = useState([newLine(presetProductId)])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const porId = useMemo(() => Object.fromEntries(productos.map(p => [p.product_id, p])), [productos])
    // Disponible de una línea = stock − lo que piden las OTRAS líneas del mismo producto.
    const restante = l => (porId[l.product_id]?.stock ?? 0) - lines
        .filter(o => o.key !== l.key && o.product_id === l.product_id)
        .reduce((s, o) => s + (Number(o.cantidad) || 0), 0)
    const elegibles = esSalida ? productos.filter(p => p.stock > 0 || p.product_id === presetProductId) : productos

    const setLine = (key, patch) => setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l))

    async function submit(e) {
        e.preventDefault()
        setError(null)
        const parsed = lines.map(l => ({ product_id: l.product_id, cantidad: Number(l.cantidad) }))
        for (const [i, l] of parsed.entries()) {
            if (!l.product_id) return setError(`Línea ${i + 1}: elige un producto.`)
            if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) return setError(`Línea ${i + 1}: la cantidad debe ser un entero mayor a 0.`)
            if (esSalida && l.cantidad > restante(lines[i])) {
                return setError(`Línea ${i + 1}: solo quedan ${formatDocenas(restante(lines[i]))} docenas disponibles.`)
            }
        }
        setSaving(true)
        try {
            await createMovimientos(tipo, parsed, { fecha, nota })
            addToast('success', COPY[tipo].ok)
            onSaved()
        } catch (err) {
            setError(err.message) // el formulario queda abierto
        } finally { setSaving(false) }
    }

    return (
        <Modal title={COPY[tipo].title} onClose={onClose}>
            <form onSubmit={submit}>
                <FormError message={error} />
                {lines.map((l, i) => (
                    <div key={l.key} style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                        <div>
                            <label style={S.label} htmlFor={`mv-p-${l.key}`}>Producto {lines.length > 1 ? i + 1 : ''}</label>
                            <select id={`mv-p-${l.key}`} style={S.input} value={l.product_id} onChange={ev => setLine(l.key, { product_id: ev.target.value })}>
                                <option value="">— Elegir —</option>
                                {elegibles.map(p => (
                                    <option key={p.product_id} value={p.product_id}>{p.codigo ? `${p.codigo} · ` : ''}{p.titulo} (stock: {formatDocenas(p.stock)})</option>
                                ))}
                            </select>
                            {esSalida && l.product_id && (
                                <small style={{ color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                                    Quedan {formatDocenas(restante(l))} para esta línea
                                </small>
                            )}
                        </div>
                        <div>
                            <label style={S.label} htmlFor={`mv-q-${l.key}`}>Docenas</label>
                            <input id={`mv-q-${l.key}`} type="number" min={1} step={1} style={S.input}
                                value={l.cantidad} onChange={ev => setLine(l.key, { cantidad: ev.target.value })} />
                        </div>
                        {lines.length > 1
                            ? <ActionBtn icon="close" color="#ef4444" title="Quitar línea" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} />
                            : <span />}
                    </div>
                ))}
                <button type="button" style={{ ...S.btnGhost, marginBottom: '1rem' }} onClick={() => setLines(ls => [...ls, newLine()])}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span> Agregar producto
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div>
                        <label style={S.label} htmlFor="mv-fecha">Fecha</label>
                        <input id="mv-fecha" type="date" style={S.input} value={fecha} onChange={e => setFecha(e.target.value)} />
                    </div>
                    <div>
                        <label style={S.label} htmlFor="mv-nota">Nota</label>
                        <input id="mv-nota" style={S.input} value={nota} onChange={e => setNota(e.target.value)} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} style={S.btnGhost}>Cancelar</button>
                    <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
