/**
 * ProductsTable.jsx — Admin: Inventory Management (Tarea 5.2)
 * Rutas: /admin/productos
 *
 * Operaciones Supabase:
 *  - SELECT  products
 *  - INSERT/UPDATE producto vía popup (ProductFormModal): name, description,
 *    price, stock, category_id, images (subidas a Storage bucket product-images)
 *  - DELETE  producto con confirmación
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { convertToWebP } from '../../../../lib/imageUtils'
import { S, ActionBtn, ToggleSwitch } from '../../../../components/admin/AdminKit'
import ProductFormModal from './components/ProductFormModal'

/* ── Miniatura de producto (o placeholder si no tiene imágenes) ── */
function ProductThumb({ src, name }) {
    if (!src) {
        return (
            <div style={{
                width: '40px', height: '40px', borderRadius: '2px', background: '#1e293b',
                border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#475569', flexShrink: 0,
            }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>image</span>
            </div>
        )
    }
    return (
        <img
            src={src} alt={name}
            style={{ width: '40px', height: '40px', borderRadius: '2px', objectFit: 'cover', border: '1px solid #334155', flexShrink: 0 }}
        />
    )
}

/* ── Cuadros de color del producto (nunca texto/hex visible) ── */
function ColorSwatches({ colors }) {
    if (!colors?.length) {
        return <span style={{ color: '#475569' }}>—</span>
    }
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {colors.map(hex => (
                <span
                    key={hex}
                    title={hex}
                    style={{
                        width: '14px', height: '14px', borderRadius: '3px', display: 'inline-block',
                        background: hex, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
                    }}
                />
            ))}
        </div>
    )
}

/* ── Badge de stock con color según nivel ── */
function StockBadge({ value }) {
    const color = value === 0 ? '#ef4444' : value < 5 ? '#eab308' : '#10b981'
    return (
        <span style={{
            fontFamily: 'monospace', fontWeight: 600, color,
            fontSize: '0.875rem',
        }}>
            {value}
        </span>
    )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function ProductsTable() {
    const [products, setProducts]     = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(null)

    /* ─ Formulario alta/edición (popup compartido) ─ */
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [modalKey, setModalKey] = useState(0) // fuerza remount del popup en cada apertura
    const [modalError, setModalError] = useState(null)
    const [saving, setSaving]   = useState(false)
    const [togglingId, setTogglingId] = useState(null)

    /* ─ Fetch ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('products')
            .select('id, name, description, retail_price, wholesale_price, dozen_height, dozen_width, dozen_length, dozen_weight, price_on_request, stock, images, sizes, colors, visible, created_at, category_id, categories(name)')
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setProducts(data ?? [])
        setLoading(false)
    }

    async function loadCategories() {
        const { data } = await supabase.from('categories').select('id, name').order('name', { ascending: true })
        setCategories(data ?? [])
    }

    useEffect(() => { load(); loadCategories() }, [])

    /* ─ Guardar producto: alta o edición, con subida de imágenes nuevas a Storage ─ */
    async function handleSave(values, onSuccess) {
        setSaving(true)
        setModalError(null)
        try {
            const existingUrls = values.images.filter(img => typeof img === 'string')
            const newFiles     = values.images.filter(img => typeof img !== 'string')

            const uploadedUrls = []
            for (const file of newFiles) {
                const webpFile = await convertToWebP(file, { quality: 0.85, maxWidth: 1600, maxHeight: 1600 })
                const fileName = `${crypto.randomUUID()}.webp`
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, webpFile)
                if (uploadError) throw uploadError
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
                uploadedUrls.push(publicUrl)
            }

            const payload = {
                name:              values.name.trim(),
                description:       values.description.trim() || null,
                retail_price:      values.price_on_request ? null : parseFloat(values.retail_price),
                wholesale_price:   values.price_on_request ? null : (values.wholesale_price !== '' ? parseFloat(values.wholesale_price) : null),
                dozen_height:      values.price_on_request ? null : (values.dozen_height !== '' ? parseFloat(values.dozen_height) : null),
                dozen_width:       values.price_on_request ? null : (values.dozen_width !== '' ? parseFloat(values.dozen_width) : null),
                dozen_length:      values.price_on_request ? null : (values.dozen_length !== '' ? parseFloat(values.dozen_length) : null),
                dozen_weight:      values.price_on_request ? null : (values.dozen_weight !== '' ? parseFloat(values.dozen_weight) : null),
                price_on_request:  values.price_on_request,
                stock:             parseInt(values.stock, 10),
                category_id:       values.category_id || null,
                images:            [...existingUrls, ...uploadedUrls],
                sizes:             Array.isArray(values.sizes) ? values.sizes : [],
                colors:            Array.isArray(values.colors) ? values.colors : [],
            }

            const { error: err } = editingProduct
                ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
                : await supabase.from('products').insert(payload)
            if (err) throw err

            onSuccess()
            setShowModal(false)
            setEditingProduct(null)
            load()
        } catch (err) {
            setModalError(err.message)
        } finally {
            setSaving(false)
        }
    }

    /* ─ Eliminar producto ─ */
    async function handleDelete(id, name) {
        if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
        setError(null)
        const { error: err } = await supabase.from('products').delete().eq('id', id)
        if (err) setError(err.message)
        else load()
    }

    /* ─ Mostrar/ocultar producto del catálogo público ─
       Actualización optimista sobre `products` en memoria — nunca llama a
       load(), que dispara setLoading(true) y reemplaza toda la tabla por el
       spinner (la "mini recarga" que se sentía al togglear). Si el update
       falla, revierte el estado local y muestra el error. */
    async function toggleVisibility(product) {
        const nextVisible = !product.visible
        setTogglingId(product.id)
        setError(null)
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, visible: nextVisible } : p))
        try {
            const { error: err } = await supabase.from('products').update({ visible: nextVisible }).eq('id', product.id)
            if (err) throw err
        } catch (err) {
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, visible: !nextVisible } : p))
            setError(err.message)
        } finally {
            setTogglingId(null)
        }
    }

    /* ─ Abrir popup en modo alta / edición ─ */
    function openAddModal() {
        setEditingProduct(null)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }
    function openEditModal(product) {
        setEditingProduct(product)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }

    /* ════════════════ RENDER ════════════════ */
    return (
        <section aria-label="Products inventory">

            {/* ── Encabezado de sección ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Inventory Management
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Products
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({products.length} SKUs)
                        </span>
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={load} style={S.btnGhost} title="Refresh">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                        Refresh
                    </button>
                    <button onClick={openAddModal} style={S.btnPrimary}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                        Add Product
                    </button>
                </div>
            </div>

            <ProductFormModal
                key={modalKey}
                isOpen={showModal}
                initialProduct={editingProduct}
                onClose={() => setShowModal(false)}
                categories={categories}
                onSave={handleSave}
                saving={saving}
                error={modalError}
            />

            {/* ── Error banner ── */}
            {error && (
                <div role="alert" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem',
                    color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                    {error}
                </div>
            )}

            {/* ── Tabla de productos ── */}
            <div className="admin-orders">
                <div className="admin-orders__table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                            <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loading inventory…</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>inventory_2</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No products — add one above</p>
                        </div>
                    ) : (
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    {['Image', 'ID', 'Name', 'Description', 'Category', 'Sizes', 'Colors', 'Price', 'Stock', 'Visible', 'Actions'].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`admin-orders__th${i === 10 ? ' admin-orders__th--right' : ''}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id} className="admin-orders__row">

                                        {/* Image */}
                                        <td className="admin-orders__td">
                                            <ProductThumb src={product.images?.[0]} name={product.name} />
                                        </td>

                                        {/* ID */}
                                        <td className="admin-orders__td admin-orders__td--mono" style={{ color: '#475569', fontSize: '0.7rem' }}>
                                            #{product.id.slice(0, 8)}
                                        </td>

                                        {/* Name */}
                                        <td className="admin-orders__td admin-orders__td--white" style={{ fontWeight: 500 }}>
                                            {product.name}
                                        </td>

                                        {/* Description */}
                                        <td className="admin-orders__td" style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {product.description || '—'}
                                        </td>

                                        {/* Category */}
                                        <td className="admin-orders__td" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                            {product.categories?.name || '—'}
                                        </td>

                                        {/* Sizes */}
                                        <td className="admin-orders__td" style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {product.sizes?.length ? product.sizes.join(', ') : '—'}
                                        </td>

                                        {/* Colors */}
                                        <td className="admin-orders__td">
                                            <ColorSwatches colors={product.colors} />
                                        </td>

                                        {/* Price */}
                                        <td className="admin-orders__td admin-orders__td--mono admin-orders__td--white">
                                            {product.price_on_request ? (
                                                <span style={{ color: '#eab308', fontSize: '0.8rem', fontWeight: 600 }}>Consultar</span>
                                            ) : (
                                                <div>
                                                    <div>${Number(product.retail_price).toFixed(2)}</div>
                                                    {product.wholesale_price && (
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                            ${Number(product.wholesale_price).toFixed(2)} mayorista
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Stock */}
                                        <td className="admin-orders__td admin-orders__td--mono">
                                            <StockBadge value={product.stock} />
                                        </td>

                                        {/* Visible */}
                                        <td className="admin-orders__td">
                                            <ToggleSwitch
                                                checked={product.visible}
                                                onChange={() => toggleVisibility(product)}
                                                label={product.visible ? `Ocultar ${product.name} del catálogo` : `Mostrar ${product.name} en el catálogo`}
                                                disabled={togglingId === product.id}
                                            />
                                        </td>

                                        {/* Actions */}
                                        <td className="admin-orders__td admin-orders__td--right">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                <ActionBtn
                                                    icon="edit" color="var(--admin-primary)" title="Edit product"
                                                    onClick={() => openEditModal(product)}
                                                />
                                                <ActionBtn
                                                    icon="delete" color="#ef4444" title="Delete product"
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </section>
    )
}
