import { useMemo, useState } from 'react'
import { S, ActionBtn, ConfirmModal } from '../../../../../components/admin/AdminKit'
import { useMobile } from '../../../../../hooks/useMobile'
import BrandPhotoUploader from './BrandPhotoUploader'

const EMPTY_PRODUCT_FORM = { nombre: '', docenas: '', precioPorDocena: '', bultos: '', codigo: '', observaciones: '', propietario: '' }

export default function MarcaForm({ marca, index, onUpdate, onDelete, isEditingInitially = true, users = [], addToast }) {
    const isMobile = useMobile()
    const [isExpanded, setIsExpanded] = useState(!marca.collapsed)
    const [isEditing, setIsEditing] = useState(isEditingInitially)
    const [editingProductIndex, setEditingProductIndex] = useState(null)
    const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
    const [fieldErrors, setFieldErrors] = useState({})
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [productToDeleteIndex, setProductToDeleteIndex] = useState(null)

    const knownOwners = useMemo(() => {
        const names = new Set()
        if (marca.propietario?.trim()) names.add(marca.propietario.trim())
        ;(marca.productos || []).forEach(p => { if (p.propietario?.trim()) names.add(p.propietario.trim()) })
        users.forEach(u => { if (u.username) names.add(u.username) })
        return [...names]
    }, [marca.propietario, marca.productos, users])

    const getOwnerColor = (name) => users.find(u => u.username === name)?.color || null

    const calculateSubtotal = () => (parseFloat(productForm.docenas) || 0) * (parseFloat(productForm.precioPorDocena) || 0)

    function notify(msg) { if (addToast) addToast('success', msg) }

    const handleAddProduct = () => {
        const errors = {}
        if (!productForm.nombre) errors.nombre = 'Obligatorio'
        if (!productForm.docenas) errors.docenas = 'Obligatorio'
        if (!productForm.precioPorDocena) errors.precioPorDocena = 'Obligatorio'
        if (!productForm.codigo) errors.codigo = 'Obligatorio'
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

        const newProd = {
            producto_titulo: productForm.nombre,
            cantidad_docenas: parseFloat(productForm.docenas),
            precio_docena: parseFloat(productForm.precioPorDocena),
            bultos: parseFloat(productForm.bultos) || 0,
            codigo: productForm.codigo.trim().toUpperCase(),
            observaciones: productForm.observaciones,
            propietario: productForm.propietario.trim() || '',
        }

        if (editingProductIndex !== null) {
            const updated = [...(marca.productos || [])]
            updated[editingProductIndex] = newProd
            onUpdate(index, { ...marca, productos: updated })
            setEditingProductIndex(null)
            notify('Producto actualizado')
        } else {
            onUpdate(index, { ...marca, productos: [...(marca.productos || []), newProd] })
            notify(`"${newProd.producto_titulo}" agregado`)
        }
        setProductForm(EMPTY_PRODUCT_FORM)
        setFieldErrors({})
    }

    const handleEditProduct = (prodIndex) => {
        const prod = marca.productos[prodIndex]
        setProductForm({
            nombre: prod.producto_titulo, docenas: prod.cantidad_docenas, precioPorDocena: prod.precio_docena,
            bultos: prod.bultos || '', codigo: prod.codigo, observaciones: prod.observaciones || '', propietario: prod.propietario || '',
        })
        setEditingProductIndex(prodIndex)
        setIsExpanded(true)
    }

    const handleCancelEdit = () => {
        setProductForm(EMPTY_PRODUCT_FORM)
        setEditingProductIndex(null)
        setFieldErrors({})
    }

    const confirmDeleteProduct = () => {
        if (productToDeleteIndex !== null) {
            onUpdate(index, { ...marca, productos: marca.productos.filter((_, i) => i !== productToDeleteIndex) })
            notify('Producto eliminado')
            setShowDeleteConfirm(false)
            setProductToDeleteIndex(null)
        }
    }

    const ownerColor = getOwnerColor(marca.propietario)
    const totalMarca = (marca.productos || []).reduce((s, p) => s + (parseFloat(p.cantidad_docenas) || 0) * (parseFloat(p.precio_docena) || 0), 0)
    const totalDocenas = (marca.productos || []).reduce((s, p) => s + (parseFloat(p.cantidad_docenas) || 0), 0)
    const bultosCalculados = (marca.productos || []).reduce((s, p) => s + (parseFloat(p.bultos) || 0), 0)

    const ownerResumen = useMemo(() => {
        const map = {}
        ;(marca.productos || []).forEach(p => {
            const owner = p.propietario?.trim() || marca.propietario?.trim() || 'Sin asignar'
            if (!map[owner]) map[owner] = { items: 0, docenas: 0, total: 0 }
            map[owner].items += 1
            map[owner].docenas += parseFloat(p.cantidad_docenas) || 0
            map[owner].total += (parseFloat(p.cantidad_docenas) || 0) * (parseFloat(p.precio_docena) || 0)
        })
        return Object.entries(map)
    }, [marca.productos, marca.propietario])

    return (
        <div style={{ border: '1px solid #1e293b', borderRadius: '4px', overflow: 'hidden', background: '#161b2e', position: 'relative' }}>
            {showDeleteConfirm && (
                <ConfirmModal
                    title="¿Eliminar producto?"
                    message="Esta acción no se puede deshacer."
                    onConfirm={confirmDeleteProduct}
                    onCancel={() => { setShowDeleteConfirm(false); setProductToDeleteIndex(null) }}
                />
            )}

            {/* Header */}
            <div style={{ background: 'rgba(15,23,42,0.4)', ...(ownerColor ? { borderLeft: `4px solid ${ownerColor}` } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1rem 0.75rem', cursor: 'pointer' }} onClick={() => setIsExpanded(v => !v)}>
                    <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0, background: ownerColor ? `${ownerColor}22` : '#1e293b',
                        border: `2px solid ${ownerColor ? ownerColor + '55' : '#334155'}`,
                    }}>📦</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem' }} onClick={e => e.stopPropagation()}>
                            {isEditing ? (
                                <input style={{ ...S.inlineInput, fontWeight: 700, maxWidth: '180px' }} value={marca.nombre}
                                    onChange={e => onUpdate(index, { ...marca, nombre: e.target.value })} />
                            ) : (
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{marca.nombre}</h3>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Boleta:</span>
                                {isEditing ? (
                                    <input style={{ ...S.inlineInput, width: '96px', color: '#ef4444', fontWeight: 700 }} placeholder="N°"
                                        value={marca.codigo_boleta || ''} onChange={e => onUpdate(index, { ...marca, codigo_boleta: e.target.value })} />
                                ) : (
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: marca.codigo_boleta ? '#ef4444' : '#475569' }}>
                                        {marca.codigo_boleta || 'sin boleta'}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#64748b' }}>person</span>
                                <select
                                    style={{ ...S.inlineInput, minWidth: '130px', borderColor: ownerColor || '#334155' }}
                                    value={marca.propietario || ''}
                                    onChange={e => onUpdate(index, { ...marca, propietario: e.target.value })}
                                >
                                    <option value="">Sin propietario</option>
                                    {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                                {totalDocenas > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{totalDocenas} doc.</span>}
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#1e293b', color: '#94a3b8' }}>
                                    {marca.productos?.length || 0} prod.
                                </span>
                                {totalMarca > 0 && (
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'monospace' }}>
                                        ${totalMarca.toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <span className="material-symbols-outlined" style={{ color: '#64748b', marginTop: '0.15rem' }}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 0.75rem' }}>
                    <button
                        onClick={e => { e.stopPropagation(); setIsEditing(v => !v); setIsExpanded(true) }}
                        style={{ ...S.btnGhost, padding: '0.375rem 0.75rem', fontSize: '0.7rem', background: isEditing ? '#10b981' : 'var(--admin-primary)', color: 'white', border: 'none' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{isEditing ? 'check' : 'edit'}</span>
                        {isEditing ? 'Listo' : 'Editar'}
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(index) }}
                        style={{ ...S.btnGhost, padding: '0.375rem 0.75rem', fontSize: '0.7rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>delete</span>
                        Eliminar marca
                    </button>
                </div>
            </div>

            {/* Modal editar producto */}
            {editingProductIndex !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1160, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', width: '100%', maxWidth: '560px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Editando producto #{editingProductIndex + 1}</p>
                            <button onClick={handleCancelEdit} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <ProductFormFields
                            productForm={productForm} setProductForm={setProductForm} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors}
                            marca={marca} knownOwners={knownOwners} getOwnerColor={getOwnerColor} listId={`owners-modal-${marca.id}`}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderTop: '1px solid #1e293b' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                {calculateSubtotal() > 0 ? `Subtotal: $${calculateSubtotal().toLocaleString('es-AR')}` : ''}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleCancelEdit} style={S.btnGhost}>Cancelar</button>
                                <button onClick={handleAddProduct} style={{ ...S.btnPrimary, background: '#f97316' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>save</span> Guardar cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenido expandido */}
            {isExpanded && (
                <div style={{ padding: '1rem', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {marca.productos && marca.productos.length > 0 ? (
                        isMobile ? (
                            <div style={{ border: '1px solid #1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                                {marca.productos.map((prod, idx) => {
                                    const ownerName = prod.propietario?.trim() || marca.propietario?.trim() || ''
                                    const color = getOwnerColor(ownerName)
                                    const subtotal = (parseFloat(prod.cantidad_docenas) || 0) * (parseFloat(prod.precio_docena) || 0)
                                    return (
                                        <div key={idx} style={{ padding: '0.75rem', borderBottom: '1px solid #1e293b' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{prod.producto_titulo}</p>
                                                    <p style={{ margin: '0.15rem 0 0', color: '#64748b', fontSize: '0.7rem', fontFamily: 'monospace' }}>{prod.codigo}</p>
                                                    {ownerName && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', marginTop: '0.25rem', color: color || '#9ca3af' }}>
                                                            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: color || '#9ca3af' }} />{ownerName}
                                                        </span>
                                                    )}
                                                </div>
                                                {isEditing && (
                                                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                                        <ActionBtn icon="edit" color="var(--admin-primary)" title="Editar" onClick={() => handleEditProduct(idx)} />
                                                        <ActionBtn icon="delete" color="#ef4444" title="Eliminar" onClick={() => { setProductToDeleteIndex(idx); setShowDeleteConfirm(true) }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem' }}>
                                                <MiniStat label="Doc." value={prod.cantidad_docenas} />
                                                <MiniStat label="$/Doc." value={`$${parseFloat(prod.precio_docena || 0).toLocaleString('es-AR')}`} />
                                                <MiniStat label="Bultos" value={prod.bultos || 0} />
                                                <MiniStat label="Total" value={`$${subtotal.toLocaleString('es-AR')}`} highlight />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{ border: '1px solid #1e293b', borderRadius: '2px', overflowX: 'auto' }}>
                                <table className="admin-orders__table">
                                    <thead>
                                        <tr>
                                            <th className="admin-orders__th">Producto</th>
                                            <th className="admin-orders__th">Código</th>
                                            <th className="admin-orders__th" style={{ textAlign: 'center' }}>Doc.</th>
                                            <th className="admin-orders__th admin-orders__th--right">$/Doc.</th>
                                            <th className="admin-orders__th" style={{ textAlign: 'center' }}>Bultos</th>
                                            <th className="admin-orders__th admin-orders__th--right">Subtotal</th>
                                            <th className="admin-orders__th">Propietario</th>
                                            {isEditing && <th className="admin-orders__th" />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marca.productos.map((prod, idx) => {
                                            const ownerName = prod.propietario?.trim() || marca.propietario?.trim() || ''
                                            const color = getOwnerColor(ownerName)
                                            return (
                                                <tr key={idx} className="admin-orders__row">
                                                    <td className="admin-orders__td admin-orders__td--white">{prod.producto_titulo}</td>
                                                    <td className="admin-orders__td admin-orders__td--mono">{prod.codigo}</td>
                                                    <td className="admin-orders__td" style={{ textAlign: 'center', color: 'white', fontWeight: 700 }}>{prod.cantidad_docenas}</td>
                                                    <td className="admin-orders__td admin-orders__td--right admin-orders__td--mono">${parseFloat(prod.precio_docena).toLocaleString('es-AR')}</td>
                                                    <td className="admin-orders__td" style={{ textAlign: 'center' }}>{prod.bultos || 0}</td>
                                                    <td className="admin-orders__td admin-orders__td--right" style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        ${(prod.cantidad_docenas * prod.precio_docena).toLocaleString('es-AR')}
                                                    </td>
                                                    <td className="admin-orders__td">
                                                        {ownerName ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}>
                                                                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: color || '#9ca3af' }} />{ownerName}
                                                            </span>
                                                        ) : <span style={{ color: '#475569' }}>—</span>}
                                                    </td>
                                                    {isEditing && (
                                                        <td className="admin-orders__td">
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                                <ActionBtn icon="edit" color="var(--admin-primary)" title="Editar" onClick={() => handleEditProduct(idx)} />
                                                                <ActionBtn icon="delete" color="#ef4444" title="Eliminar" onClick={() => { setProductToDeleteIndex(idx); setShowDeleteConfirm(true) }} />
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem', border: '1px dashed #334155', borderRadius: '2px' }}>
                            {isEditing ? 'Completá el formulario para agregar el primer producto' : 'Sin productos registrados'}
                        </div>
                    )}

                    {isEditing && editingProductIndex === null && (
                        <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid #1e293b', borderRadius: '2px', padding: '1rem' }}>
                            <p style={{ ...S.label, marginBottom: '0.75rem' }}>+ Nuevo producto</p>
                            <ProductFormFields
                                productForm={productForm} setProductForm={setProductForm} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors}
                                marca={marca} knownOwners={knownOwners} getOwnerColor={getOwnerColor} listId={`owners-${marca.id}`}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                    {calculateSubtotal() > 0 ? `Subtotal: $${calculateSubtotal().toLocaleString('es-AR')}` : ''}
                                </span>
                                <button onClick={handleAddProduct} style={S.btnPrimary}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span> Agregar producto
                                </button>
                            </div>
                        </div>
                    )}

                    {ownerResumen.length > 1 && (
                        <div style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.4)', border: '1px solid #1e293b', borderRadius: '2px' }}>
                            <p style={{ ...S.label, marginBottom: '0.625rem' }}>Resumen por propietario</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {ownerResumen.map(([name, data]) => {
                                    const color = getOwnerColor(name)
                                    const totalAmt = ownerResumen.reduce((s, [, v]) => s + v.total, 0)
                                    const pct = totalAmt > 0 ? ((data.total / totalAmt) * 100).toFixed(0) : 0
                                    return (
                                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '2px', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                                            <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '999px', background: color || '#9ca3af' }} />
                                            <span style={{ fontWeight: 700, color: 'white' }}>{name}</span>
                                            <span style={{ color: '#64748b' }}>· {data.items} prod · {data.docenas} doc</span>
                                            <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>${data.total.toLocaleString('es-AR')}</span>
                                            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>({pct}%)</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', background: 'rgba(15,23,42,0.4)', padding: '0.75rem 1rem', borderRadius: '2px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Bultos calculados: <span style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem', marginLeft: '0.25rem' }}>{bultosCalculados}</span>
                        </div>
                        <div style={{ width: '1px', height: '1.25rem', background: '#334155' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Bultos personalizados:</span>
                            <input type="number" style={{ ...S.inlineInput, width: '80px' }} placeholder="Auto"
                                value={marca.bultos_personalizados || ''} onChange={e => onUpdate(index, { ...marca, bultos_personalizados: e.target.value })} />
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(sobrescribe el calculado)</span>
                        </div>
                    </div>

                    <BrandPhotoUploader
                        photos={marca.fotos || []}
                        onPhotosChange={newPhotos => onUpdate(index, { ...marca, fotos: newPhotos })}
                        maxPhotos={5}
                        brandName={marca.nombre}
                        onError={msg => addToast && addToast('error', msg)}
                    />
                </div>
            )}
        </div>
    )
}

function MiniStat({ label, value, highlight }) {
    return (
        <div style={{ background: highlight ? 'rgba(16,185,129,0.12)' : '#0f172a', borderRadius: '2px', padding: '0.375rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.6rem', color: highlight ? '#10b981' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: highlight ? '#10b981' : 'white' }}>{value}</p>
        </div>
    )
}

function ProductFormFields({ productForm, setProductForm, fieldErrors, setFieldErrors, marca, knownOwners, listId }) {
    const setField = (field) => (e) => {
        setProductForm(p => ({ ...p, [field]: e.target.value }))
        if (e.target.value) setFieldErrors(p => ({ ...p, [field]: undefined }))
    }
    const errInput = (err) => ({ ...S.input, borderColor: err ? '#ef4444' : '#334155' })

    return (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 7rem', gap: '0.5rem' }}>
                <div>
                    <label style={S.label}>Nombre *</label>
                    <input style={errInput(fieldErrors.nombre)} placeholder="Nombre del producto" value={productForm.nombre} onChange={setField('nombre')} />
                    {fieldErrors.nombre && <p style={{ fontSize: '0.65rem', color: '#ef4444', margin: '0.2rem 0 0' }}>{fieldErrors.nombre}</p>}
                </div>
                <div>
                    <label style={S.label}>Código *</label>
                    <input style={{ ...errInput(fieldErrors.codigo), textTransform: 'uppercase' }} placeholder="Cód." value={productForm.codigo} onChange={setField('codigo')} />
                    {fieldErrors.codigo && <p style={{ fontSize: '0.65rem', color: '#ef4444', margin: '0.2rem 0 0' }}>{fieldErrors.codigo}</p>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div>
                    <label style={S.label}>Docenas *</label>
                    <input type="number" style={{ ...errInput(fieldErrors.docenas), textAlign: 'center' }} placeholder="0" value={productForm.docenas} onChange={setField('docenas')} />
                    {fieldErrors.docenas && <p style={{ fontSize: '0.65rem', color: '#ef4444', margin: '0.2rem 0 0' }}>{fieldErrors.docenas}</p>}
                </div>
                <div>
                    <label style={S.label}>$ / Docena *</label>
                    <input type="number" style={errInput(fieldErrors.precioPorDocena)} placeholder="0" value={productForm.precioPorDocena} onChange={setField('precioPorDocena')} />
                    {fieldErrors.precioPorDocena && <p style={{ fontSize: '0.65rem', color: '#ef4444', margin: '0.2rem 0 0' }}>{fieldErrors.precioPorDocena}</p>}
                </div>
                <div>
                    <label style={S.label}>Bultos</label>
                    <input type="number" style={{ ...S.input, textAlign: 'center' }} placeholder="0" value={productForm.bultos} onChange={setField('bultos')} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                    <label style={S.label}>Observaciones</label>
                    <input style={S.input} placeholder="Opcional" value={productForm.observaciones} onChange={setField('observaciones')} />
                </div>
                <div>
                    <label style={S.label}>Propietario <span style={{ textTransform: 'none', opacity: 0.6 }}>(si es distinto)</span></label>
                    <input list={listId} style={S.input} placeholder={marca.propietario || 'Sin cambio'} value={productForm.propietario} onChange={setField('propietario')} />
                    <datalist id={listId}>{knownOwners.map(n => <option key={n} value={n} />)}</datalist>
                </div>
            </div>
        </div>
    )
}
