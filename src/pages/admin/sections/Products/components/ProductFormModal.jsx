import { useState, useEffect } from 'react'
import { S, ToggleSwitch } from '../../../../../components/admin/AdminKit'
import ProductImageUploader from './ProductImageUploader'
import ProductSizeManager from './ProductSizeManager'
import ProductColorManager from './ProductColorManager'

const EMPTY_FORM = {
  name: '',
  description: '',
  retail_price: '',
  wholesale_price: '',
  unit_height: '',
  unit_width: '',
  unit_length: '',
  unit_weight: '',
  dozen_height: '',
  dozen_width: '',
  dozen_length: '',
  dozen_weight: '',
  stock: '',
  category_id: '',
  price_on_request: false,
}

/**
 * El padre le pasa un `key` distinto cada vez que abre el popup (ver
 * ProductsTable), por lo que este componente se remonta en cada apertura y
 * el estado inicial de abajo se recalcula desde `initialProduct` sin
 * necesidad de sincronizarlo luego con un efecto.
 */
export default function ProductFormModal({ isOpen, initialProduct = null, onClose, categories, onSave, saving, error }) {
    const isEditMode = Boolean(initialProduct)
    const [form, setForm] = useState(() => (
        initialProduct
            ? {
                name:              initialProduct.name || '',
                description:       initialProduct.description || '',
                retail_price:      initialProduct.retail_price ?? '',
                wholesale_price:   initialProduct.wholesale_price ?? '',
                unit_height:       initialProduct.unit_height ?? '',
                unit_width:        initialProduct.unit_width ?? '',
                unit_length:       initialProduct.unit_length ?? '',
                unit_weight:       initialProduct.unit_weight ?? '',
                dozen_height:      initialProduct.dozen_height ?? '',
                dozen_width:       initialProduct.dozen_width ?? '',
                dozen_length:      initialProduct.dozen_length ?? '',
                dozen_weight:      initialProduct.dozen_weight ?? '',
                stock:             initialProduct.stock ?? '',
                category_id:       initialProduct.category_id || '',
                price_on_request:  initialProduct.price_on_request ?? false,
            }
            : EMPTY_FORM
    ))
    const [images, setImages] = useState(() => (initialProduct?.images ? [...initialProduct.images] : []))
    const [sizes, setSizes] = useState(() => (initialProduct?.sizes ? [...initialProduct.sizes] : []))
    const [colors, setColors] = useState(() => (initialProduct?.colors ? [...initialProduct.colors] : []))
    const [imageError, setImageError] = useState(null)
    const [validationError, setValidationError] = useState(null)

    const [applyDiscount, setApplyDiscount] = useState(false)
    const [discountPercent, setDiscountPercent] = useState(20)

    useEffect(() => {
        if (applyDiscount && form.retail_price) {
            const retail = parseFloat(form.retail_price)
            if (!isNaN(retail)) {
                const discount = (100 - discountPercent) / 100
                const wholesale = (retail * discount).toFixed(2)
                setForm(prev => ({ ...prev, wholesale_price: wholesale }))
            }
        }
    }, [applyDiscount, discountPercent, form.retail_price])

    if (!isOpen) return null

    function resetAndClose() {
        setImageError(null)
        setValidationError(null)
        onClose()
    }

    function handleSubmit(e) {
        e.preventDefault()
        setValidationError(null)

        if (!form.price_on_request && !form.retail_price) {
            setValidationError('Precio minorista es obligatorio o activa "Precio a consultar"')
            return
        }

        if (!form.stock) {
            setValidationError('Stock es obligatorio')
            return
        }

        onSave({ ...form, images, sizes, colors }, resetAndClose)
    }

    return (
        <div
            onClick={saving ? undefined : resetAndClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={isEditMode ? 'Editar producto' : 'Nuevo producto'}
                style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#161b2e' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--admin-primary)' }}>{isEditMode ? 'edit' : 'add_box'}</span>
                        {isEditMode ? 'Editar producto' : 'Nuevo producto'}
                    </h2>
                    <button onClick={resetAndClose} disabled={saving} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {(error || validationError) && (
                            <div role="alert" style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '2px', padding: '0.75rem 1rem', color: '#ef4444',
                                fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                                {error || validationError}
                            </div>
                        )}

                        <div>
                            <label style={S.label}>Nombre *</label>
                            <input
                                required value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="Nombre del producto" style={S.input}
                            />
                        </div>

                        <div>
                            <label style={S.label}>Descripción</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="Opcional" rows={3}
                                style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Precio a consultar */}
                        <div style={{ border: '1px solid #1e293b', borderRadius: '2px', padding: '0.875rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                <ToggleSwitch
                                    checked={form.price_on_request}
                                    onChange={() => setForm(p => ({ ...p, price_on_request: !p.price_on_request }))}
                                    label="Precio a consultar"
                                    disabled={saving}
                                />
                                <div>
                                    <div style={{ ...S.label, marginBottom: '0.25rem', cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, price_on_request: !p.price_on_request }))}>
                                        Precio "A Consultar"
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', lineHeight: 1.4 }}>
                                        Se muestra "Consultar precio" en el catálogo en lugar del precio fijo
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Precios y stock - deshabilitados si price_on_request */}
                        <div style={{ opacity: form.price_on_request ? 0.4 : 1, pointerEvents: form.price_on_request ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={S.label}>Precio Minorista ($) *</label>
                                    <input
                                        type="number" min="0" step="0.01" value={form.retail_price}
                                        onChange={e => setForm(p => ({ ...p, retail_price: e.target.value }))}
                                        placeholder="0.00" style={S.input}
                                    />
                                </div>
                                <div>
                                    <label style={S.label}>Precio Mayorista ($)</label>
                                    <input
                                        type="number" min="0" step="0.01" value={form.wholesale_price}
                                        onChange={e => setForm(p => ({ ...p, wholesale_price: e.target.value }))}
                                        placeholder="0.00" style={{ ...S.input, opacity: applyDiscount ? 0.6 : 1 }}
                                        readOnly={applyDiscount}
                                    />
                                </div>
                            </div>

                            {/* Dimensiones de la unidad (retail) — opcional pero necesarias para envío */}
                            <div style={{ border: '1px solid #1e293b', borderRadius: '2px', padding: '0.875rem', marginBottom: '1rem' }}>
                                <div style={{ ...S.label, marginBottom: '0.75rem' }}>Dimensiones de la unidad (obligatoria para envío)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <div>
                                        <label style={S.label}>Alto (cm)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.unit_height}
                                            onChange={e => setForm(p => ({ ...p, unit_height: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={S.label}>Ancho (cm)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.unit_width}
                                            onChange={e => setForm(p => ({ ...p, unit_width: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={S.label}>Largo (cm)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.unit_length}
                                            onChange={e => setForm(p => ({ ...p, unit_length: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={S.label}>Peso (kg)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.unit_weight}
                                            onChange={e => setForm(p => ({ ...p, unit_weight: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dimensiones de la docena — opcional, solo relevante si hay precio mayorista */}
                            <div style={{ border: '1px solid #1e293b', borderRadius: '2px', padding: '0.875rem', marginBottom: '1rem' }}>
                                <div style={{ ...S.label, marginBottom: '0.75rem' }}>Dimensiones de la docena (opcional)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <div>
                                        <label style={S.label}>Alto (cm)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.dozen_height}
                                            onChange={e => setForm(p => ({ ...p, dozen_height: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={S.label}>Ancho (cm)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.dozen_width}
                                            onChange={e => setForm(p => ({ ...p, dozen_width: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={S.label}>Largo (cm)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.dozen_length}
                                            onChange={e => setForm(p => ({ ...p, dozen_length: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={S.label}>Peso (kg)</label>
                                        <input
                                            type="number" min="0" step="0.01" value={form.dozen_weight}
                                            onChange={e => setForm(p => ({ ...p, dozen_weight: e.target.value }))}
                                            placeholder="0.00" style={S.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Descuento automático */}
                            <div style={{ border: '1px solid #1e293b', borderRadius: '2px', padding: '0.875rem', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: applyDiscount ? '0.875rem' : 0 }}>
                                    <input
                                        type="checkbox" checked={applyDiscount}
                                        onChange={e => setApplyDiscount(e.target.checked)}
                                    />
                                    <span style={{ ...S.label, marginBottom: 0, cursor: 'pointer' }}>Aplicar descuento automático</span>
                                </label>
                                {applyDiscount && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <input
                                            type="number" min="0" max="100" value={discountPercent}
                                            onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                            style={{ ...S.inlineInput, width: '60px' }}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>% de descuento</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stock - siempre editable */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={S.label}>Stock *</label>
                            <input
                                type="number" min="0" value={form.stock}
                                onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                                placeholder="0" style={S.input}
                            />
                        </div>

                        <div>
                            <label style={S.label}>Categoría</label>
                            <select
                                value={form.category_id}
                                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                                style={S.input}
                            >
                                <option value="">— Sin categoría —</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <ProductSizeManager sizes={sizes} onSizesChange={setSizes} />

                        <ProductColorManager colors={colors} onColorsChange={setColors} images={images} />

                        <ProductImageUploader images={images} onImagesChange={setImages} onError={setImageError} />
                        {imageError && (
                            <p style={{ margin: 0, color: '#eab308', fontFamily: 'monospace', fontSize: '0.75rem' }}>{imageError}</p>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #1e293b', position: 'sticky', bottom: 0, background: '#161b2e' }}>
                        <button type="button" onClick={resetAndClose} disabled={saving} style={S.btnGhost}>Cancelar</button>
                        <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                                {saving ? 'progress_activity' : 'save'}
                            </span>
                            {saving ? 'Guardando…' : isEditMode ? 'Guardar cambios' : 'Guardar producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
