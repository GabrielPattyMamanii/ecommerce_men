/**
 * Modales de la vista "Por lotes" de Productos:
 *  - NuevoLoteModal: crea un lote VACÍO (nombre LOTE-NNN sugerido y editable).
 *  - AgregarProductoModal: carga un producto EXISTENTE a un lote con la cantidad que entra.
 * (Los productos NUEVOS se crean con el formulario de producto, que ya sabe en qué lote entran.)
 */
import { useEffect, useMemo, useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'
import { Modal, FormError } from '../../Stock/StockUi'
import { agregarATanda, crearTanda, siguienteCodigoLote } from '../../../../../services/stockService'

const today = () => new Date().toISOString().slice(0, 10)
const hint = { color: 'var(--admin-text-muted)', fontFamily: 'monospace' }

export function NuevoLoteModal({ onClose, onCreated }) {
    const [codigo, setCodigo] = useState('')
    const [fecha, setFecha] = useState(today())
    const [nota, setNota] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let alive = true
        siguienteCodigoLote().then(c => { if (alive) setCodigo(c ?? '') }).catch(() => { /* la base asigna el nombre */ })
        return () => { alive = false }
    }, [])

    async function submit(e) {
        e.preventDefault()
        setSaving(true); setError(null)
        try {
            const creado = await crearTanda({ codigo, fecha, nota })
            onCreated(creado?.codigo ?? codigo.trim().toUpperCase())
        } catch (err) { setError(err.message) } finally { setSaving(false) }
    }

    return (
        <Modal title="Nuevo lote" onClose={onClose}>
            <form onSubmit={submit}>
                <FormError message={error} />
                <div style={{ marginBottom: '1rem' }}>
                    <label style={S.label} htmlFor="nl-codigo">Nombre del lote</label>
                    <input id="nl-codigo" style={S.input} value={codigo} onChange={e => setCodigo(e.target.value)}
                        placeholder="Automático (LOTE-NNN)" maxLength={60} autoFocus />
                    <small style={hint}>Sugerido por el sistema; puedes cambiarlo.</small>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div>
                        <label style={S.label} htmlFor="nl-fecha">Fecha de ingreso</label>
                        <input id="nl-fecha" type="date" style={S.input} value={fecha} onChange={e => setFecha(e.target.value)} />
                    </div>
                    <div>
                        <label style={S.label} htmlFor="nl-nota">Nota (opcional)</label>
                        <input id="nl-nota" style={S.input} value={nota} onChange={e => setNota(e.target.value)} />
                    </div>
                </div>
                <p style={{ ...hint, fontSize: '0.75rem', margin: '1rem 0 0' }}>
                    El lote se crea vacío: después le cargas los productos que llegaron.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} style={S.btnGhost}>Cancelar</button>
                    <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Creando…' : 'Crear lote'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/** `products`: solo los que NO tienen ningún lote (los creados fuera de lotes). El filtro lo hace quien llama. */
export function AgregarProductoModal({ codigo, products, onClose, onAdded }) {
    const [productId, setProductId] = useState('')
    const [cantidad, setCantidad] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const elegibles = useMemo(
        () => [...products].sort((a, b) => a.name.localeCompare(b.name, 'es')),
        [products]
    )
    const n = Number(cantidad)
    const valido = productId && Number.isInteger(n) && n > 0

    async function submit(e) {
        e.preventDefault()
        if (!valido) return
        setSaving(true); setError(null)
        try {
            await agregarATanda({ codigo, productId, cantidad: n })
            onAdded()
        } catch (err) { setError(err.message) } finally { setSaving(false) }
    }

    return (
        <Modal title={`Agregar producto a ${codigo}`} onClose={onClose}>
            <form onSubmit={submit}>
                <FormError message={error} />
                <div style={{ marginBottom: '1rem' }}>
                    <label style={S.label} htmlFor="ap-prod">Producto sin lote</label>
                    <select id="ap-prod" style={S.input} value={productId} onChange={e => setProductId(e.target.value)} autoFocus>
                        <option value="">— Elegir —</option>
                        {elegibles.map(p => (
                            <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ''}{p.name} (stock: {p.stock ?? 0})</option>
                        ))}
                    </select>
                    {elegibles.length === 0 ? (
                        <small style={hint}>No hay productos sin lote. Los productos que crees fuera de los lotes (en &ldquo;Todos los productos&rdquo;) aparecen acá.</small>
                    ) : (
                        <small style={hint}>Solo se listan los productos sin lote (los que están en VARIOS). Sus docenas actuales no se mueven: las que entran ahora se suman a {codigo}.</small>
                    )}
                </div>
                <div style={{ maxWidth: '160px' }}>
                    <label style={S.label} htmlFor="ap-cant">Docenas que entran</label>
                    <input id="ap-cant" type="number" min={1} step={1} style={S.input} value={cantidad} onChange={e => setCantidad(e.target.value)} />
                </div>
                <p style={{ ...hint, fontSize: '0.75rem', margin: '1rem 0 0' }}>
                    Se suma al stock del producto y queda registrado como ingreso de este lote.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} style={S.btnGhost}>Cancelar</button>
                    <button type="submit" disabled={!valido || saving} style={{ ...S.btnPrimary, opacity: !valido || saving ? 0.5 : 1 }}>
                        {saving ? 'Guardando…' : 'Agregar al lote'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
