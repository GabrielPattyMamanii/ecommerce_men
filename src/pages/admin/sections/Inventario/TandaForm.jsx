import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../../../services/supabaseClient'
import { S, ConfirmModal, ToastStack, useToasts } from '../../../../components/admin/AdminKit'
import { convertToWebP } from '../../../../lib/imageUtils'
import { diffEntradasByCodigo, hydrateTandaForm } from '../../../../lib/inventarioUtils'
import MarcaForm from './components/MarcaForm'
import ShippingConfigModal from './components/ShippingConfigModal'

const EMPTY_SHIPPING = { gastosViaje: '', costoPilotajeXBulto: '', cantidadBultosTOTAL: '', cantidadBultosAPagar: '', porcentajesMarcas: [] }

export default function TandaForm() {
    const navigate = useNavigate()
    const { tandaNombre: tandaNombreParam } = useParams()
    const isEditing = Boolean(tandaNombreParam)
    const { toasts, addToast, dismissToast } = useToasts()

    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState([])
    const [tandaId, setTandaId] = useState(null)

    const [formData, setFormData] = useState({ nombre: '', fechaIngreso: new Date().toISOString().split('T')[0], gastos: '', marcas: [] })
    const [shippingParams, setShippingParams] = useState(EMPTY_SHIPPING)
    const [showShippingModal, setShowShippingModal] = useState(false)

    const [newMarcaName, setNewMarcaName] = useState('')
    const [newMarcaBoleta, setNewMarcaBoleta] = useState('')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [deleteMarcaIndex, setDeleteMarcaIndex] = useState(null)

    const [filterBrand, setFilterBrand] = useState('')
    const [filterOwner, setFilterOwner] = useState('')
    const [filterCode, setFilterCode] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    const dateRef = useRef(null)
    const gastosRef = useRef(null)
    const marcaNameRef = useRef(null)
    const marcaBoletaRef = useRef(null)
    const brandsEndRef = useRef(null)

    useEffect(() => {
        supabase.from('app_users').select('id, username, color').order('username').then(({ data }) => { if (data) setUsers(data) })
    }, [])

    async function fetchTandaDetails(nombre) {
        setLoading(true)
        const [entradasRes, tandaRes] = await Promise.all([
            supabase.from('entradas').select('*').eq('tanda_nombre', nombre),
            supabase.from('tandas').select('id, parametros').eq('nombre', nombre).maybeSingle(),
        ])
        if (entradasRes.error) { addToast('error', 'Error al cargar la tanda: ' + entradasRes.error.message); setLoading(false); return }

        if (tandaRes.data) setTandaId(tandaRes.data.id)

        if (entradasRes.data && entradasRes.data.length > 0) {
            const { marcas, shippingParams: hydratedShipping } = hydrateTandaForm(entradasRes.data, tandaRes.data)
            setFormData({ nombre: entradasRes.data[0].tanda_nombre, fechaIngreso: entradasRes.data[0].tanda_fecha, gastos: entradasRes.data[0].gastos || '', marcas })
            setShippingParams(hydratedShipping)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (isEditing && tandaNombreParam) fetchTandaDetails(decodeURIComponent(tandaNombreParam))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing, tandaNombreParam])

    function handleAddMarca() {
        if (!newMarcaName.trim()) return
        const newMarca = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, nombre: newMarcaName.trim(), codigo_boleta: newMarcaBoleta.trim(), productos: [], collapsed: false, propietario: '' }
        setFormData(prev => ({ ...prev, marcas: [...prev.marcas, newMarca] }))
        setNewMarcaName('')
        setNewMarcaBoleta('')
        setTimeout(() => brandsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }

    function handleUpdateMarca(index, updatedMarca) {
        setFormData(prev => { const marcas = [...prev.marcas]; marcas[index] = updatedMarca; return { ...prev, marcas } })
    }

    function confirmDeleteMarca() {
        if (deleteMarcaIndex === null) return
        const nombre = formData.marcas[deleteMarcaIndex]?.nombre || 'la marca'
        setFormData(prev => ({ ...prev, marcas: prev.marcas.filter((_, i) => i !== deleteMarcaIndex) }))
        addToast('success', `"${nombre}" eliminada`)
        setDeleteMarcaIndex(null)
    }

    function handleSortBrands() {
        const sorted = [...formData.marcas].sort((a, b) => (a.codigo_boleta || '').toLowerCase().localeCompare((b.codigo_boleta || '').toLowerCase(), undefined, { numeric: true, sensitivity: 'base' }))
        setFormData(prev => ({ ...prev, marcas: sorted }))
        addToast('success', 'Marcas ordenadas por N° boleta')
    }

    const uniqueBrands = useMemo(() => [...new Set(formData.marcas.map(m => m.nombre).filter(Boolean))].sort(), [formData.marcas])
    const uniqueOwners = useMemo(() => [...new Set(formData.marcas.map(m => m.propietario).filter(Boolean))].sort(), [formData.marcas])
    const uniqueCodes = useMemo(() => [...new Set(formData.marcas.map(m => m.codigo_boleta).filter(Boolean))].sort(), [formData.marcas])

    const resumen = useMemo(() => {
        let totalProductos = 0, totalDocenas = 0, valorEstimado = 0
        formData.marcas.forEach(m => {
            totalProductos += m.productos.length
            m.productos.forEach(p => {
                const doc = parseFloat(p.cantidad_docenas) || 0
                const precio = parseFloat(p.precio_docena) || 0
                totalDocenas += doc
                valorEstimado += doc * precio
            })
        })
        return { totalProductos, totalDocenas, valorEstimado }
    }, [formData.marcas])

    function validateForm() {
        const errors = []
        if (!formData.nombre.trim()) errors.push('El nombre de la tanda es obligatorio')
        if (!formData.fechaIngreso) errors.push('La fecha es obligatoria')
        if (formData.marcas.length === 0) errors.push('Debe agregar al menos una marca')
        const totalProds = formData.marcas.reduce((s, m) => s + m.productos.length, 0)
        if (totalProds === 0) errors.push('Debe agregar al menos un producto')
        return errors
    }

    function handlePreSave() {
        const errors = validateForm()
        if (errors.length > 0) { errors.forEach(e => addToast('error', e)); return }
        setShowConfirmModal(true)
    }

    async function handleConfirmSave() {
        setShowConfirmModal(false)
        setLoading(true)
        try {
            const processedMarcas = await Promise.all(formData.marcas.map(async marca => {
                let photoUrls = []
                if (marca.fotos && marca.fotos.length > 0) {
                    const existingUrls = marca.fotos.filter(p => typeof p === 'string')
                    const newPhotos = marca.fotos.filter(p => typeof p !== 'string')
                    photoUrls = [...existingUrls]
                    for (const photo of newPhotos) {
                        try {
                            const fileToUpload = photo instanceof File ? await convertToWebP(photo, { quality: 0.85, maxWidth: 1920, maxHeight: 1920 }) : photo
                            const fileName = `${formData.nombre}_${marca.nombre}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
                            const { error: uploadError } = await supabase.storage.from('tanda-fotos').upload(fileName, fileToUpload)
                            if (uploadError) throw uploadError
                            const { data: { publicUrl } } = supabase.storage.from('tanda-fotos').getPublicUrl(fileName)
                            photoUrls.push(publicUrl)
                        } catch (err) {
                            addToast('error', `Error al subir foto de ${marca.nombre}: ${err.message}`)
                        }
                    }
                }
                return { ...marca, processedPhotos: photoUrls }
            }))

            // La tanda debe existir en `tandas` ANTES de tocar `entradas`: la FK
            // entradas.tanda_nombre -> tandas.nombre rechaza el insert si la tanda
            // todavía no fue creada (caso "nueva tanda").
            const marcasMetadata = {}
            formData.marcas.forEach(m => {
                marcasMetadata[m.id || m.nombre] = { propietario: m.propietario, bultos_personalizados: m.bultos_personalizados }
            })
            const tandaRecord = { nombre: formData.nombre, fecha: formData.fechaIngreso, parametros: { ...shippingParams, marcasMetadata, gastosViaje: shippingParams.gastosViaje || 0 } }

            let currentTandaId = tandaId
            if (currentTandaId) {
                const { error: tandaError } = await supabase.from('tandas').update(tandaRecord).eq('id', currentTandaId)
                if (tandaError) throw tandaError
            } else {
                const { data: existing } = await supabase.from('tandas').select('id').eq('nombre', formData.nombre).maybeSingle()
                if (existing) {
                    const { error: tandaError } = await supabase.from('tandas').update(tandaRecord).eq('id', existing.id)
                    if (tandaError) throw tandaError
                    currentTandaId = existing.id
                } else {
                    const { data: inserted, error: tandaError } = await supabase.from('tandas').insert([tandaRecord]).select('id').single()
                    if (tandaError) throw tandaError
                    currentTandaId = inserted.id
                }
            }
            setTandaId(currentTandaId)

            const entriesToInsert = []
            processedMarcas.forEach(marca => {
                marca.productos.forEach(prod => {
                    entriesToInsert.push({
                        tanda_nombre: formData.nombre,
                        tanda_fecha: formData.fechaIngreso,
                        marca: marca.nombre,
                        marca_id: marca.id,
                        producto_titulo: prod.producto_titulo,
                        cantidad_docenas: prod.cantidad_docenas,
                        cant_docenas_copy: prod.cantidad_docenas,
                        precio_docena: prod.precio_docena,
                        bultos: prod.bultos || 0,
                        propietario: marca.propietario,
                        propietario_producto: prod.propietario || '',
                        codigo: prod.codigo,
                        observaciones: prod.observaciones,
                        codigo_boleta: marca.codigo_boleta,
                        gastos: formData.gastos || 0,
                        fotos: marca.processedPhotos.length > 0 ? marca.processedPhotos : null,
                    })
                })
            })

            // Si se renombró la tanda, el `tandas.update` de arriba ya cascadeó
            // (ON UPDATE CASCADE) el tanda_nombre de las filas existentes al nuevo
            // nombre, así que siempre se busca por el nombre actual del formulario.
            const { data: existingRows, error: existingError } = await supabase
                .from('entradas').select('id, codigo, cantidad_docenas').eq('tanda_nombre', formData.nombre)
            if (existingError) throw existingError

            const { toInsert, toUpdate, toDelete } = diffEntradasByCodigo(existingRows, entriesToInsert)

            if (toDelete.length > 0) {
                const { error: deleteError } = await supabase.from('entradas').delete().in('id', toDelete)
                if (deleteError) throw deleteError
            }
            if (toUpdate.length > 0) {
                const results = await Promise.all(toUpdate.map(({ id, fields }) => supabase.from('entradas').update(fields).eq('id', id)))
                const err = results.find(r => r.error)?.error
                if (err) throw err
            }
            if (toInsert.length > 0) {
                const { error: insertError } = await supabase.from('entradas').insert(toInsert)
                if (insertError) throw insertError
            }

            navigate('/admin/inventario')
        } catch (e) {
            addToast('error', 'Error al guardar: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e, nextRef) {
        if (e.key === 'Enter') { e.preventDefault(); nextRef?.current?.focus() }
    }

    const filteredMarcas = formData.marcas
        .map((marca, originalIndex) => ({ ...marca, originalIndex }))
        .filter(m => (!filterBrand || m.nombre === filterBrand) && (!filterOwner || m.propietario === filterOwner) && (!filterCode || m.codigo_boleta === filterCode))

    return (
        <section aria-label={isEditing ? 'Editar tanda' : 'Nueva tanda'}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <button onClick={() => navigate('/admin/inventario')} style={{ ...S.btnGhost, padding: '0.375rem 0.75rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Volver
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
                        {isEditing ? 'Editar tanda' : 'Nueva tanda'}
                        {formData.nombre.trim() && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '0.5rem', textTransform: 'none' }}>— {formData.nombre}</span>}
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {resumen.totalProductos > 0 && (
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span style={{ fontWeight: 700, color: 'white' }}>{resumen.totalProductos} prod.</span>
                            <span>{resumen.totalDocenas} doc.</span>
                            <span style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>${resumen.valorEstimado.toLocaleString('es-AR')}</span>
                        </div>
                    )}
                    <button onClick={handlePreSave} disabled={loading || !formData.nombre.trim()} style={{ ...S.btnPrimary, opacity: !formData.nombre.trim() ? 0.5 : 1, cursor: !formData.nombre.trim() ? 'not-allowed' : 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
                        {loading ? 'Guardando…' : 'Guardar tanda'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.25rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={S.label}>Nombre tanda *</label>
                        <input style={{ ...S.input, borderColor: formData.nombre.trim() ? '#10b981' : '#334155' }} placeholder="Ej: Verano 2026…" value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })} onKeyDown={e => handleKeyDown(e, dateRef)} autoFocus />
                    </div>
                    <div>
                        <label style={S.label}>Fecha *</label>
                        <input type="date" style={S.input} value={formData.fechaIngreso} ref={dateRef}
                            onChange={e => setFormData({ ...formData, fechaIngreso: e.target.value })} onKeyDown={e => handleKeyDown(e, gastosRef)} />
                    </div>
                    <div>
                        <label style={S.label}>Gastos ($)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" style={S.input} placeholder="0" value={formData.gastos} ref={gastosRef}
                                onChange={e => setFormData({ ...formData, gastos: e.target.value })} onKeyDown={e => handleKeyDown(e, marcaNameRef)} />
                            <button onClick={() => setShowShippingModal(true)} title="Configurar parámetros de envío" style={{ ...S.btnGhost, padding: '0.5rem 0.75rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>settings</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b' }}>
                        <p style={{ ...S.label, marginBottom: '0.75rem' }}>Agregar marca</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input style={{ ...S.input, flex: 1 }} placeholder="Nombre de la marca…" value={newMarcaName} ref={marcaNameRef}
                                onChange={e => setNewMarcaName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); marcaBoletaRef.current?.focus() } }} />
                            <input style={{ ...S.input, width: '140px' }} placeholder="N° boleta" value={newMarcaBoleta} ref={marcaBoletaRef}
                                onChange={e => setNewMarcaBoleta(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMarca(); setTimeout(() => marcaNameRef.current?.focus(), 10) } }} />
                            <button onClick={handleAddMarca} style={S.btnPrimary}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span> Agregar
                            </button>
                        </div>
                    </div>

                    {formData.marcas.length > 0 && (
                        <div style={{ borderBottom: '1px solid #1e293b' }}>
                            <button onClick={() => setShowFilters(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>filter_list</span> Filtrar y ordenar
                                    {(filterBrand || filterOwner || filterCode) && (
                                        <span style={{ background: 'var(--admin-primary)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                                            {[filterBrand, filterOwner, filterCode].filter(Boolean).length}
                                        </span>
                                    )}
                                </span>
                                <span className="material-symbols-outlined">{showFilters ? 'expand_less' : 'expand_more'}</span>
                            </button>
                            {showFilters && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0 1.25rem 1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1, minWidth: '130px' }}>
                                        <label style={{ ...S.label, marginBottom: '0.25rem' }}>Marca</label>
                                        <select style={S.input} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                                            <option value="">Todas</option>{uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '130px' }}>
                                        <label style={{ ...S.label, marginBottom: '0.25rem' }}>Propietario</label>
                                        <select style={S.input} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                                            <option value="">Todos</option>{uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '130px' }}>
                                        <label style={{ ...S.label, marginBottom: '0.25rem' }}>N° boleta</label>
                                        <select style={S.input} value={filterCode} onChange={e => setFilterCode(e.target.value)}>
                                            <option value="">Todas</option>{uniqueCodes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(filterBrand || filterOwner || filterCode) && (
                                            <button onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode('') }} style={S.btnGhost}>Limpiar</button>
                                        )}
                                        <button onClick={handleSortBrands} style={{ ...S.btnGhost, background: '#4f46e5', color: 'white', border: 'none' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>sort</span> Ordenar por boleta
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredMarcas.map(marca => (
                            <MarcaForm
                                key={marca.id || `marca-${marca.originalIndex}`}
                                index={marca.originalIndex}
                                marca={marca}
                                onUpdate={handleUpdateMarca}
                                onDelete={i => setDeleteMarcaIndex(i)}
                                isEditingInitially={!marca.collapsed}
                                users={users}
                                addToast={addToast}
                            />
                        ))}
                        {formData.marcas.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.4 }}>inventory_2</span>
                                <p style={{ fontSize: '0.85rem' }}>Agregá la primera marca para empezar</p>
                            </div>
                        )}
                        {formData.marcas.length > 0 && filteredMarcas.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin marcas que coincidan con los filtros</div>
                        )}
                        <div ref={brandsEndRef} />
                    </div>
                </div>

                {resumen.totalProductos > 0 && (
                    <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.25rem' }}>
                        <p style={{ ...S.label, marginBottom: '0.75rem' }}>Resumen de la tanda</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'center', background: 'rgba(15,23,42,0.4)', borderRadius: '2px', padding: '0.75rem' }}>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Productos</p>
                                <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>{resumen.totalProductos}</p>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(15,23,42,0.4)', borderRadius: '2px', padding: '0.75rem' }}>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Docenas</p>
                                <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>{resumen.totalDocenas}</p>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.1)', borderRadius: '2px', padding: '0.75rem' }}>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Valor estimado</p>
                                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>${resumen.valorEstimado.toLocaleString('es-AR')}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showConfirmModal && (
                <ConfirmModal
                    title="Confirmar guardado de tanda"
                    message={`Nombre: ${formData.nombre} · Fecha: ${formData.fechaIngreso} · Marcas: ${formData.marcas.length} · Productos: ${resumen.totalProductos} · Gastos: $${parseFloat(formData.gastos || 0).toLocaleString()}`}
                    confirmLabel="Confirmar y guardar" busyLabel="Guardando…"
                    onConfirm={handleConfirmSave} onCancel={() => setShowConfirmModal(false)}
                />
            )}

            {deleteMarcaIndex !== null && (
                <ConfirmModal
                    title="¿Eliminar esta marca?"
                    message={`Se eliminarán también sus ${formData.marcas[deleteMarcaIndex]?.productos?.length || 0} producto(s). Esta acción no se puede deshacer.`}
                    onConfirm={confirmDeleteMarca} onCancel={() => setDeleteMarcaIndex(null)}
                />
            )}

            <ShippingConfigModal
                isOpen={showShippingModal}
                onClose={() => setShowShippingModal(false)}
                availableBrands={uniqueBrands}
                initialParams={shippingParams}
                onSave={setShippingParams}
            />

            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </section>
    )
}
