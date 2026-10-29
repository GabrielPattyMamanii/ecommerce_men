import { useEffect, useMemo, useState } from 'react'
import { S, ActionBtn } from '../../../../components/admin/AdminKit'
import { formatDocenas } from '../../../../lib/stockUtils'
import { createMovimientos, listLotes } from '../../../../services/stockService'
import { CODIGO_VARIOS } from '../../../../lib/lotesUtils'
import { Modal, FormError } from './StockUi'

const today = () => new Date().toISOString().slice(0, 10)
const VARIOS_NUEVO = '__varios_nuevo__'
const newLine = product_id => ({ key: crypto.randomUUID(), product_id: product_id ?? '', lote_id: '', cantidad: '' })

const COPY = {
    entrada: {
        title: 'Entrada (ajuste a un lote)',
        motivos: [{ value: 'ajuste', label: 'Ajuste: sumar a un lote existente' }],
        nota: 'Los lotes nuevos se crean en Productos → Por lotes. Acá solo se suma stock a un lote que ya existe (ajustes y correcciones).',
    },
    salida: {
        title: 'Nueva salida',
        motivos: [
            { value: 'venta', label: 'Venta manual' },
            { value: 'ajuste', label: 'Ajuste: descontar de un lote' },
        ],
    },
}

const hint = { color: 'var(--admin-text-muted)', fontFamily: 'monospace' }

/**
 * Registro de entradas (solo ajustes) y salidas (venta manual / ajuste) sobre un LOTE que se ELIGE a mano.
 * No hay FIFO automático. La base valida el stock de cada lote; acá solo se avisa antes.
 * productos: filas de `stock_control_productos` ({ product_id, titulo, stock }).
 */
export default function MovimientoModal({ tipo, productos, presetProductId, onSaved, onClose, addToast }) {
    const esSalida = tipo === 'salida'
    const copy = COPY[tipo]
    const [motivo, setMotivo] = useState(copy.motivos[0].value)
    const [fecha, setFecha] = useState(today())
    const [nota, setNota] = useState('')
    const [lines, setLines] = useState([newLine(presetProductId)])
    const [lotes, setLotes] = useState([])
    const [loadingLotes, setLoadingLotes] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let alive = true
        listLotes()
            .then(l => { if (alive) setLotes(l) })
            .catch(err => { if (alive) setError(err.message) })
            .finally(() => { if (alive) setLoadingLotes(false) })
        return () => { alive = false }
    }, [])

    const loteById = useMemo(() => Object.fromEntries(lotes.map(l => [l.id, l])), [lotes])

    // Lotes que se pueden elegir para un producto: en una salida, solo los que tienen docenas.
    // En un ajuste de entrada siempre se ofrece VARIOS (el lote de los productos sin lote), aunque todavía no tenga fila.
    const lotesDe = productId => {
        const propios = lotes
            .filter(l => l.product_id === productId && (!esSalida || l.cantidad_actual > 0))
            .sort((a, b) => a.fecha_ingreso.localeCompare(b.fecha_ingreso) || a.created_at.localeCompare(b.created_at))
        const tieneVarios = lotes.some(l => l.product_id === productId && l.codigo === CODIGO_VARIOS)
        if (!esSalida && productId && !tieneVarios) {
            propios.push({ id: VARIOS_NUEVO, product_id: productId, codigo: CODIGO_VARIOS, cantidad_actual: 0, cantidad_inicial: 0, fecha_ingreso: today(), created_at: '' })
        }
        return propios
    }

    // Disponible de una línea = docenas del lote − lo que piden las OTRAS líneas del mismo lote.
    const restante = l => (loteById[l.lote_id]?.cantidad_actual ?? 0) - lines
        .filter(o => o.key !== l.key && o.lote_id === l.lote_id)
        .reduce((s, o) => s + (Number(o.cantidad) || 0), 0)

    const elegibles = esSalida ? productos.filter(p => p.stock > 0 || p.product_id === presetProductId) : productos

    const setLine = (key, patch) => setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l))

    // Al elegir producto: si tiene un único lote elegible, se deja elegido; si no, lo elige la persona.
    function pickProduct(key, product_id) {
        const unicos = product_id ? lotesDe(product_id) : []
        setLine(key, { product_id, lote_id: unicos.length === 1 ? unicos[0].id : '' })
    }

    async function submit(e) {
        e.preventDefault()
        setError(null)
        // VARIOS_NUEVO = "VARIOS sin fila todavía": se manda sin lote y la base lo crea.
        const parsed = lines.map(l => ({ product_id: l.product_id, lote_id: l.lote_id === VARIOS_NUEVO ? null : l.lote_id, cantidad: Number(l.cantidad) }))
        for (const [i, l] of parsed.entries()) {
            if (!l.product_id) return setError(`Línea ${i + 1}: elige un producto.`)
            if (!lines[i].lote_id) return setError(`Línea ${i + 1}: elige el lote.`)
            if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) return setError(`Línea ${i + 1}: la cantidad debe ser un entero mayor a 0.`)
            if (esSalida && l.cantidad > restante(lines[i])) {
                return setError(`Línea ${i + 1}: el lote solo tiene ${formatDocenas(restante(lines[i]))} docenas disponibles.`)
            }
        }
        setSaving(true)
        try {
            await createMovimientos(tipo, parsed, { fecha, nota, motivo })
            addToast('success', motivo === 'venta' ? 'Venta registrada.' : 'Ajuste registrado.')
            onSaved()
        } catch (err) {
            setError(err.message) // el formulario queda abierto
        } finally { setSaving(false) }
    }

    return (
        <Modal title={copy.title} onClose={onClose}>
            <form onSubmit={submit}>
                <FormError message={error} />

                {copy.motivos.length > 1 ? (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={S.label} htmlFor="mv-motivo">Motivo</label>
                        <select id="mv-motivo" style={S.input} value={motivo} onChange={e => { setMotivo(e.target.value); setError(null) }}>
                            {copy.motivos.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                ) : (
                    <p style={{ ...hint, margin: '0 0 1rem', fontSize: '0.75rem' }}>{copy.nota}</p>
                )}

                {lines.map((l, i) => {
                    const opciones = l.product_id ? lotesDe(l.product_id) : []
                    return (
                        <div key={l.key} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                            <div style={{ flex: '2 1 220px' }}>
                                <label style={S.label} htmlFor={`mv-p-${l.key}`}>Producto {lines.length > 1 ? i + 1 : ''}</label>
                                <select id={`mv-p-${l.key}`} style={S.input} value={l.product_id} onChange={ev => pickProduct(l.key, ev.target.value)}>
                                    <option value="">— Elegir —</option>
                                    {elegibles.map(p => (
                                        <option key={p.product_id} value={p.product_id}>{p.codigo ? `${p.codigo} · ` : ''}{p.titulo} (stock: {formatDocenas(p.stock)})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: '2 1 200px' }}>
                                <label style={S.label} htmlFor={`mv-l-${l.key}`}>Lote</label>
                                <select id={`mv-l-${l.key}`} style={S.input} value={l.lote_id} disabled={!l.product_id || loadingLotes}
                                    onChange={ev => setLine(l.key, { lote_id: ev.target.value })}>
                                    <option value="">{loadingLotes ? 'Cargando…' : opciones.length ? '— Elegir lote —' : 'Sin lotes disponibles'}</option>
                                    {opciones.map(o => (
                                        <option key={o.id} value={o.id}>
                                            {o.codigo} · {formatDocenas(o.cantidad_actual)} de {formatDocenas(o.cantidad_inicial)} doc. · {o.fecha_ingreso}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: '0 0 90px' }}>
                                <label style={S.label} htmlFor={`mv-q-${l.key}`}>Docenas</label>
                                <input id={`mv-q-${l.key}`} type="number" min={1} step={1} style={S.input}
                                    value={l.cantidad} onChange={ev => setLine(l.key, { cantidad: ev.target.value })} />
                            </div>
                            {lines.length > 1
                                ? <ActionBtn icon="close" color="#ef4444" title="Quitar línea" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} />
                                : <span />}
                            {esSalida && l.lote_id && (
                                <small style={{ ...hint, flexBasis: '100%' }}>Quedan {formatDocenas(restante(l))} en este lote para esta línea</small>
                            )}
                        </div>
                    )
                })}
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
