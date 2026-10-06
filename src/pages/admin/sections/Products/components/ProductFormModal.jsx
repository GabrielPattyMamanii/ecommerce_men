import { useState, useEffect, useContext } from 'react'
import { createPortal } from 'react-dom'
import { ToggleSwitch } from '../../../../../components/admin/AdminKit'
import { AdminThemeContext } from '../../../layout/AdminLayout'
import { PF, pfStyles, PF_UPLOADER_THEME, getPfVars } from './productFormTheme'
import ProductImageUploader from './ProductImageUploader'
import ProductSizeManager from './ProductSizeManager'
import ProductColorManager from './ProductColorManager'
import ProductSizeGuideEditor from './ProductSizeGuideEditor'
import { sizeGuideFromDb, sizeGuideToDb } from './sizeGuideUtils'
import './ProductFormModal.css'

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
  unlimited_stock: false,
  category_id: '',
  price_on_request: false,
}

/* Grupo de 4 campos de dimensiones (alto/ancho/largo/peso), reutilizado para
   la unidad y la docena — ambos comparten exactamente los mismos campos. */
function DimensionsGrid({ prefix, form, setForm }) {
  const fields = [
    ['height', 'Alto (cm)'],
    ['width', 'Ancho (cm)'],
    ['length', 'Largo (cm)'],
    ['weight', 'Peso (kg)'],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
      {fields.map(([suffix, label]) => {
        const key = `${prefix}_${suffix}`
        return (
          <div key={key} style={{ background: PF.color.surfaceContainer, padding: '0.6rem 0.7rem', borderRadius: PF.radius.md, border: `1px solid ${PF.color.border}` }}>
            <label style={{ ...pfStyles.label, marginBottom: '0.3rem', fontSize: '0.62rem' }}>{label}</label>
            <input
              type="number" min="0" step="0.01" value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder="0.00"
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${PF.color.borderStrong}`, color: PF.color.text, fontFamily: PF.font.body, fontSize: '0.85rem', fontWeight: 600, padding: '0.15rem 0', outline: 'none' }}
            />
          </div>
        )
      })}
    </div>
  )
}

/**
 * El padre le pasa un `key` distinto cada vez que abre el popup (ver
 * ProductsTable), por lo que este componente se remonta en cada apertura y
 * el estado inicial de abajo se recalcula desde `initialProduct` sin
 * necesidad de sincronizarlo luego con un efecto.
 */
export default function ProductFormModal({ isOpen, initialProduct = null, onClose, categories, onSave, saving, error }) {
    const theme = useContext(AdminThemeContext)
    const pfVars = getPfVars(theme)
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
                unlimited_stock:   initialProduct.unlimited_stock ?? false,
                category_id:       initialProduct.category_id || '',
                price_on_request:  initialProduct.price_on_request ?? false,
            }
            : EMPTY_FORM
    ))
    const [images, setImages] = useState(() => (initialProduct?.images ? [...initialProduct.images] : []))
    const [sizes, setSizes] = useState(() => (initialProduct?.sizes ? [...initialProduct.sizes] : []))
    const [colors, setColors] = useState(() => (initialProduct?.colors ? [...initialProduct.colors] : []))
    const [sizeGuide, setSizeGuide] = useState(() => sizeGuideFromDb(initialProduct?.size_guide))
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

        onSave({ ...form, images, sizes, colors, size_guide: sizeGuideToDb(sizeGuide, sizes) }, resetAndClose)
    }

    return createPortal((
        <div
            className="pfm"
            onClick={saving ? undefined : resetAndClose}
            style={{ ...pfVars, position: 'fixed', inset: 0, background: 'var(--pf-overlay)', zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={isEditMode ? 'Editar producto' : 'Nuevo producto'}
                style={{
                    background: PF.color.bg, border: `1px solid ${PF.color.border}`, borderRadius: PF.radius.xl,
                    width: '100%', maxWidth: '1180px', maxHeight: '92vh', overflowY: 'auto',
                    fontFamily: PF.font.body, color: PF.color.text,
                    boxShadow: '0 20px 60px var(--pf-modal-shadow)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                    padding: '1.1rem 1.5rem', borderBottom: `1px solid ${PF.color.border}`,
                    position: 'sticky', top: 0, background: 'var(--pf-header-bg)', backdropFilter: 'blur(8px)', zIndex: 1,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: PF.color.accent, flexShrink: 0 }}>{isEditMode ? 'edit' : 'add_box'}</span>
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: PF.color.text, fontFamily: PF.font.headline, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isEditMode ? `Editar Producto${form.name ? `: ${form.name}` : ''}` : 'Nuevo Producto'}
                        </h2>
                    </div>
                    <button onClick={resetAndClose} disabled={saving} style={{ background: 'transparent', border: 'none', color: PF.color.textMuted, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', flexShrink: 0 }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '1.5rem' }}>

                        {(error || validationError) && (
                            <div role="alert" style={{
                                background: PF.color.dangerSoft, border: `1px solid ${PF.color.danger}55`,
                                borderRadius: PF.radius.md, padding: '0.75rem 1rem', color: PF.color.danger,
                                fontFamily: PF.font.body, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                marginBottom: '1.25rem',
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                                {error || validationError}
                            </div>
                        )}

                        <div className="pfm-grid">
                            {/* COLUMNA PRINCIPAL */}
                            <div className="pfm-col">
                                {/* Detalles Generales */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.cardTitle}>Detalles Generales</h3>
                                    <p style={pfStyles.cardSubtitle}>Nombre comercial y descripción pública visible para clientes.</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.1rem' }}>
                                        <div>
                                            <label style={pfStyles.label}>Nombre del Producto <span style={{ color: PF.color.accent }}>*</span></label>
                                            <input
                                                required value={form.name}
                                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                                placeholder="Ej. Remera Básica de Algodón Orgánico" style={pfStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={pfStyles.label}>Descripción</label>
                                            <textarea
                                                value={form.description}
                                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                                placeholder="Opcional" rows={4}
                                                style={{ ...pfStyles.input, resize: 'vertical', lineHeight: 1.5 }}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Multimedia */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.cardTitle}>Multimedia</h3>
                                    <p style={{ ...pfStyles.cardSubtitle, marginBottom: '1.1rem' }}>Sube y organiza las fotografías de catálogo de tu producto.</p>
                                    <ProductImageUploader images={images} onImagesChange={setImages} onError={setImageError} productName={form.name} theme={PF_UPLOADER_THEME} />
                                    {imageError && (
                                        <p style={{ margin: '0.5rem 0 0', color: '#eab308', fontFamily: PF.font.body, fontSize: '0.75rem' }}>{imageError}</p>
                                    )}
                                </section>

                                {/* Precios y Descuentos */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.cardTitle}>Precios y Descuentos</h3>
                                    <p style={{ ...pfStyles.cardSubtitle, marginBottom: '1.1rem' }}>Configura el precio regular, mayorista y reglas comerciales.</p>

                                    {/* Precio a consultar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: PF.color.surfaceContainer, border: `1px solid ${PF.color.border}`, borderRadius: PF.radius.md, marginBottom: '1rem' }}>
                                        <ToggleSwitch
                                            checked={form.price_on_request}
                                            onChange={() => setForm(p => ({ ...p, price_on_request: !p.price_on_request }))}
                                            label="Precio a consultar"
                                            disabled={saving}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: PF.color.text, cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, price_on_request: !p.price_on_request }))}>
                                                Precio &quot;A Consultar&quot;
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: PF.color.textMuted, lineHeight: 1.4 }}>
                                                Se muestra &quot;Consultar precio&quot; en el catálogo en lugar del precio fijo
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ opacity: form.price_on_request ? 0.4 : 1, pointerEvents: form.price_on_request ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
                                            <div style={{ background: PF.color.surfaceContainer, padding: '0.75rem 0.85rem', borderRadius: PF.radius.md, border: `1px solid ${PF.color.border}` }}>
                                                <label style={pfStyles.label}>Precio Normal (PVP) *</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ position: 'absolute', left: 0, color: PF.color.accent, fontFamily: PF.font.headline, fontWeight: 600 }}>$</span>
                                                    <input
                                                        type="number" min="0" step="0.01" value={form.retail_price}
                                                        onChange={e => setForm(p => ({ ...p, retail_price: e.target.value }))}
                                                        placeholder="0.00"
                                                        style={{ width: '100%', paddingLeft: '1.1rem', background: 'transparent', border: 'none', borderBottom: `1px solid ${PF.color.borderStrong}`, color: PF.color.text, fontFamily: PF.font.body, fontSize: '1rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ background: PF.color.surfaceContainer, padding: '0.75rem 0.85rem', borderRadius: PF.radius.md, border: `1px solid ${PF.color.border}` }}>
                                                <label style={pfStyles.label}>Precio Mayorista</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ position: 'absolute', left: 0, color: PF.color.textMuted, fontFamily: PF.font.headline, fontWeight: 600 }}>$</span>
                                                    <input
                                                        type="number" min="0" step="0.01" value={form.wholesale_price}
                                                        onChange={e => setForm(p => ({ ...p, wholesale_price: e.target.value }))}
                                                        placeholder="0.00" readOnly={applyDiscount}
                                                        style={{ width: '100%', paddingLeft: '1.1rem', background: 'transparent', border: 'none', borderBottom: `1px solid ${PF.color.borderStrong}`, color: PF.color.text, fontFamily: PF.font.body, fontSize: '1rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', opacity: applyDiscount ? 0.6 : 1 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Descuento automático */}
                                        <div style={{ padding: '0.85rem', background: PF.color.surfaceContainer, border: `1px solid ${PF.color.border}`, borderRadius: PF.radius.md, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox" checked={applyDiscount}
                                                    onChange={e => setApplyDiscount(e.target.checked)}
                                                    style={{ accentColor: PF.color.accent, width: '15px', height: '15px', cursor: 'pointer' }}
                                                />
                                                <span>
                                                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: PF.color.text }}>Descuento Promocional Automático</span>
                                                    <span style={{ fontSize: '0.7rem', color: PF.color.textMuted }}>Calcula el precio mayorista aplicando un % sobre el minorista.</span>
                                                </span>
                                            </label>
                                            {applyDiscount && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: PF.color.surfaceLowest, padding: '0.4rem 0.7rem', borderRadius: PF.radius.md, border: `1px solid ${PF.color.borderStrong}` }}>
                                                    <input
                                                        type="number" min="0" max="100" value={discountPercent}
                                                        onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                                        style={{ width: '44px', background: 'transparent', border: 'none', textAlign: 'center', color: PF.color.text, fontFamily: PF.font.body, fontWeight: 600, fontSize: '0.85rem', outline: 'none' }}
                                                    />
                                                    <span style={{ fontSize: '0.75rem', color: PF.color.accent, fontWeight: 600 }}>% OFF</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Guía de talles (opcional) */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.cardTitle}>Guía de Talles</h3>
                                    <p style={{ ...pfStyles.cardSubtitle, marginBottom: '1.1rem' }}>Tabla de medidas opcional. Cada talle cargado en &quot;Talles y Colores&quot; es una fila.</p>
                                    <ProductSizeGuideEditor guide={sizeGuide} onGuideChange={setSizeGuide} sizes={sizes} disabled={saving} />
                                </section>

                                {/* Envíos y Paquetería */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.cardTitle}>Envíos y Paquetería</h3>
                                    <p style={{ ...pfStyles.cardSubtitle, marginBottom: '1.1rem' }}>Dimensiones físicas y peso para el cálculo automático de tarifas de entrega.</p>

                                    <div style={{ marginBottom: '1.1rem' }}>
                                        <div style={{ ...pfStyles.label, marginBottom: '0.6rem' }}>Dimensiones de la unidad (obligatoria para envío)</div>
                                        <DimensionsGrid prefix="unit" form={form} setForm={setForm} />
                                    </div>

                                    <div>
                                        <div style={{ ...pfStyles.label, marginBottom: '0.6rem' }}>Dimensiones de la docena (opcional, solo mayorista)</div>
                                        <DimensionsGrid prefix="dozen" form={form} setForm={setForm} />
                                    </div>
                                </section>
                            </div>

                            {/* COLUMNA LATERAL */}
                            <div className="pfm-col">
                                {/* Organización */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.sidebarCardTitle}>Organización</h3>
                                    <div>
                                        <label style={pfStyles.label}>Categoría</label>
                                        <select
                                            value={form.category_id}
                                            onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                                            style={pfStyles.input}
                                        >
                                            <option value="">— Sin categoría —</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </section>

                                {/* Inventario */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.sidebarCardTitle}>Inventario</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={pfStyles.label}>Stock</label>
                                            <input
                                                type="number" min="0" value={form.stock}
                                                onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                                                placeholder="0" style={pfStyles.input}
                                            />
                                            <div style={{ fontSize: '0.7rem', color: PF.color.textMuted, marginTop: '0.4rem', lineHeight: 1.4 }}>
                                                {form.unlimited_stock
                                                    ? 'No se muestra al público mientras "Continuar vendiendo sin stock" esté activo.'
                                                    : 'Opcional — si lo dejás vacío, el producto se crea sin stock (0).'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${PF.color.border}` }}>
                                            <div style={{ paddingRight: '0.5rem' }}>
                                                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: PF.color.text }}>Continuar vendiendo sin stock</span>
                                                <span style={{ fontSize: '0.7rem', color: PF.color.textMuted }}>Se muestra &quot;Disponible&quot; sin importar el stock cargado.</span>
                                            </div>
                                            <ToggleSwitch
                                                checked={form.unlimited_stock}
                                                onChange={() => setForm(p => ({ ...p, unlimited_stock: !p.unlimited_stock }))}
                                                label="Disponible sin control de stock"
                                                disabled={saving}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Talles y Colores */}
                                <section style={pfStyles.card}>
                                    <h3 style={pfStyles.sidebarCardTitle}>Talles y Colores</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <ProductSizeManager sizes={sizes} onSizesChange={setSizes} />
                                        <ProductColorManager colors={colors} onColorsChange={setColors} images={images} />
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '1.1rem 1.5rem',
                        borderTop: `1px solid ${PF.color.border}`, position: 'sticky', bottom: 0,
                        background: 'var(--pf-header-bg)', backdropFilter: 'blur(8px)',
                    }}>
                        <button type="button" onClick={resetAndClose} disabled={saving} style={pfStyles.btnGhost}>Cancelar</button>
                        <button type="submit" disabled={saving} style={{ ...pfStyles.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                                {saving ? 'progress_activity' : 'check'}
                            </span>
                            {saving ? 'Guardando…' : isEditMode ? 'Guardar cambios' : 'Guardar producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ), document.querySelector('.admin-layout') || document.body)
}
