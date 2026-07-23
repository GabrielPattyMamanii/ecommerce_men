import { useEffect, useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'

const EMPTY_PARAMS = {
    gastosViaje: '',
    costoPilotajeXBulto: '',
    cantidadBultosTOTAL: '',
    cantidadBultosAPagar: '',
    porcentajesMarcas: [],
}

export default function ShippingConfigModal({ isOpen, onClose, initialParams, availableBrands = [], onSave }) {
    const [params, setParams] = useState(EMPTY_PARAMS)
    const [newPorcentaje, setNewPorcentaje] = useState({ descripcion: '', porcentaje: '' })

    useEffect(() => {
        if (initialParams) {
            setParams({
                gastosViaje: initialParams.gastosViaje || '',
                costoPilotajeXBulto: initialParams.costoPilotajeXBulto || '',
                cantidadBultosTOTAL: initialParams.cantidadBultosTOTAL || '',
                cantidadBultosAPagar: initialParams.cantidadBultosAPagar || '',
                porcentajesMarcas: initialParams.porcentajesMarcas || [],
            })
        }
    }, [initialParams])

    if (!isOpen) return null

    const handleAddPorcentaje = () => {
        const porc = parseFloat(newPorcentaje.porcentaje)
        if (!newPorcentaje.descripcion.trim() || isNaN(porc)) return
        setParams(prev => ({
            ...prev,
            porcentajesMarcas: [
                ...prev.porcentajesMarcas,
                { id: Date.now(), descripcion: newPorcentaje.descripcion, rawPorcentaje: porc, porcentaje: porc / 2, saved: false },
            ],
        }))
        setNewPorcentaje({ descripcion: '', porcentaje: '' })
    }

    const removePorcentaje = (id) => {
        setParams(prev => ({ ...prev, porcentajesMarcas: prev.porcentajesMarcas.filter(p => p.id !== id) }))
    }

    const handleSave = () => {
        const cleanParams = {
            gastosViaje: parseFloat(params.gastosViaje) || 0,
            costoPilotajeXBulto: parseFloat(params.costoPilotajeXBulto) || 0,
            cantidadBultosTOTAL: parseFloat(params.cantidadBultosTOTAL) || 0,
            cantidadBultosAPagar: parseFloat(params.cantidadBultosAPagar) || 0,
            porcentajesMarcas: params.porcentajesMarcas.map(p => ({ ...p, saved: true })),
        }
        onSave(cleanParams)
        onClose()
    }

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label="Configuración de envío y costos"
                style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#161b2e' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--admin-primary)' }}>calculate</span>
                        Configuración de envío y costos
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {/* Costos generales */}
                    <div>
                        <p style={S.label}>Costos generales</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ ...S.label, marginBottom: '0.25rem' }}>Gastos de viaje ($)</label>
                                <input type="number" style={S.input} placeholder="0.00" value={params.gastosViaje}
                                    onChange={e => setParams({ ...params, gastosViaje: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ ...S.label, marginBottom: '0.25rem' }}>Costo pilotaje x bulto (USD)</label>
                                <input type="number" style={S.input} placeholder="0.00" value={params.costoPilotajeXBulto}
                                    onChange={e => setParams({ ...params, costoPilotajeXBulto: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Bultos */}
                    <div>
                        <p style={S.label}>Estimaciones de bultos</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ ...S.label, marginBottom: '0.25rem' }}>Cantidad bultos TOTAL (real)</label>
                                <input type="number" style={S.input} placeholder="0" value={params.cantidadBultosTOTAL}
                                    onChange={e => setParams({ ...params, cantidadBultosTOTAL: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ ...S.label, marginBottom: '0.25rem' }}>Cantidad bultos A PAGAR (cálculo)</label>
                                <input type="number" style={S.input} placeholder="0" value={params.cantidadBultosAPagar}
                                    onChange={e => setParams({ ...params, cantidadBultosAPagar: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Comisiones por marca */}
                    <div>
                        <p style={S.label}>Comisiones por marca</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ ...S.label, marginBottom: '0.25rem' }}>Marca</label>
                                <select style={S.input} value={newPorcentaje.descripcion}
                                    onChange={e => setNewPorcentaje({ ...newPorcentaje, descripcion: e.target.value })}>
                                    <option value="">Seleccionar marca…</option>
                                    {availableBrands.map((brand, idx) => <option key={idx} value={brand}>{brand}</option>)}
                                </select>
                            </div>
                            <div style={{ width: '96px' }}>
                                <label style={{ ...S.label, marginBottom: '0.25rem' }}>% com.</label>
                                <input type="number" style={S.input} placeholder="0" value={newPorcentaje.porcentaje}
                                    onChange={e => setNewPorcentaje({ ...newPorcentaje, porcentaje: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleAddPorcentaje()} />
                            </div>
                            <button onClick={handleAddPorcentaje} style={{ ...S.btnPrimary, padding: '0.5rem 0.75rem' }} title="Agregar">
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                            </button>
                        </div>

                        {params.porcentajesMarcas.length > 0 ? (
                            <div style={{ border: '1px solid #1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                                {params.porcentajesMarcas.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', borderBottom: '1px solid #1e293b' }}>
                                        <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{p.descripcion}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                {p.rawPorcentaje ?? (p.porcentaje * 2)}% → <span style={{ color: 'var(--admin-primary)', fontWeight: 700 }}>{p.porcentaje}%</span>
                                            </span>
                                            <button onClick={() => removePorcentaje(p.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1.25rem', color: '#64748b', border: '1px dashed #334155', borderRadius: '2px', fontSize: '0.8rem' }}>
                                No hay porcentajes configurados
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #1e293b', position: 'sticky', bottom: 0, background: '#161b2e' }}>
                    <button onClick={onClose} style={S.btnGhost}>Cancelar</button>
                    <button onClick={handleSave} style={S.btnPrimary}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
                        Guardar configuración
                    </button>
                </div>
            </div>
        </div>
    )
}
