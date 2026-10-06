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
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { convertToWebP } from '../../../../lib/imageUtils'
import { S, ToggleSwitch } from '../../../../components/admin/AdminKit'
import ProductFormModal from './components/ProductFormModal'
import { formatCurrency } from '../../../../lib/productPricing'

/* ── Cuadros de color del producto (nunca texto/hex visible) ── */
function ColorSwatches({ colors }) {
    if (!colors?.length) {
        return <span style={{ color: 'var(--admin-text-subtle)' }}>—</span>
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

/* ── Card de producto — grilla responsive (misma card en desktop y mobile) ── */
function ProductCard({ product, onEdit, onDelete, onToggleVisibility, toggling }) {
    const stock = product.stock
    const badge = product.unlimited_stock
        ? { text: 'Disponible', dot: 'var(--admin-green)' }
        : stock === 0
            ? { text: 'Sin stock', dot: 'var(--admin-red)' }
            : stock < 5
                ? { text: `${stock} · Stock bajo`, dot: '#eab308' }
                : { text: `${stock} en stock`, dot: 'var(--admin-green)' }
    const hasWholesale = !product.price_on_request && product.wholesale_price

    return (
        <article className={`admin-pcard${product.visible ? '' : ' admin-pcard--hidden'}`}>
            <div className="admin-pcard__head">
                <span className="admin-pcard__id">#{product.id.slice(0, 8)}</span>
                <ToggleSwitch
                    checked={product.visible}
                    onChange={() => onToggleVisibility(product)}
                    label={product.visible ? `Ocultar ${product.name} del catálogo` : `Mostrar ${product.name} en el catálogo`}
                    disabled={toggling}
                />
            </div>

            <div className="admin-pcard__media">
                {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} loading="lazy" />
                ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>image</span>
                )}
                {product.visible ? (
                    <span className="admin-pcard__badge" style={{ '--dot': badge.dot }}>{badge.text}</span>
                ) : (
                    <span className="admin-pcard__badge admin-pcard__badge--hidden">Oculto</span>
                )}
            </div>

            <div className="admin-pcard__meta">
                <span className="admin-pcard__cat">{product.categories?.name || 'Sin categoría'}</span>
                {product.colors?.length > 0 ? (
                    <ColorSwatches colors={product.colors} />
                ) : (
                    <span className="admin-pcard__sizes">
                        {product.sizes?.length ? product.sizes.join(', ') : 'Sin talles'}
                    </span>
                )}
            </div>

            <h3 className="admin-pcard__name">{product.name}</h3>

            <div className="admin-pcard__price">
                <div>
                    <div className="admin-pcard__price-label">
                        {product.price_on_request ? 'Precio' : hasWholesale ? 'Minorista' : 'Precio venta'}
                    </div>
                    {product.price_on_request ? (
                        <div className="admin-pcard__price-main admin-pcard__price-main--ask">A consultar</div>
                    ) : (
                        <div className="admin-pcard__price-main">{formatCurrency(product.retail_price)}</div>
                    )}
                </div>
                {hasWholesale && (
                    <div style={{ textAlign: 'right' }}>
                        <div className="admin-pcard__price-label">Mayorista</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                            {formatCurrency(product.wholesale_price)}
                        </div>
                    </div>
                )}
            </div>

            <div className="admin-pcard__actions">
                <button type="button" className="admin-pcard__btn admin-pcard__btn--edit" onClick={() => onEdit(product)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>edit</span>
                    Editar
                </button>
                <button
                    type="button" className="admin-pcard__btn admin-pcard__btn--icon admin-pcard__btn--danger"
                    title="Eliminar producto" aria-label={`Eliminar ${product.name}`}
                    onClick={() => onDelete(product.id, product.name)}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>delete</span>
                </button>
            </div>
        </article>
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
    const [categoryFilter, setCategoryFilter] = useState('all')

    /* ─ Chips de categoría con conteo + lista filtrada ─ */
    const categoryChips = useMemo(() => {
        const map = new Map()
        for (const p of products) {
            const key = p.category_id || 'none'
            const entry = map.get(key) ?? { key, name: p.categories?.name || 'Sin categoría', count: 0 }
            entry.count += 1
            map.set(key, entry)
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
    }, [products])
    const filteredProducts = categoryFilter === 'all'
        ? products
        : products.filter(p => (p.category_id || 'none') === categoryFilter)
    const visibleCount = products.filter(p => p.visible).length

    /* ─ Fetch ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('products')
            .select('id, name, description, retail_price, wholesale_price, weight_kg, height_cm, width_cm, length_cm, dozen_height, dozen_width, dozen_length, dozen_weight, price_on_request, stock, unlimited_stock, images, sizes, colors, size_guide, visible, created_at, category_id, categories(name)')
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
                weight_kg:         values.weight_kg !== '' ? parseFloat(values.weight_kg) : null,
                height_cm:         values.height_cm !== '' ? parseFloat(values.height_cm) : null,
                width_cm:          values.width_cm !== '' ? parseFloat(values.width_cm) : null,
                length_cm:         values.length_cm !== '' ? parseFloat(values.length_cm) : null,
                dozen_height:      values.price_on_request ? null : (values.dozen_height !== '' ? parseFloat(values.dozen_height) : null),
                dozen_width:       values.price_on_request ? null : (values.dozen_width !== '' ? parseFloat(values.dozen_width) : null),
                dozen_length:      values.price_on_request ? null : (values.dozen_length !== '' ? parseFloat(values.dozen_length) : null),
                dozen_weight:      values.price_on_request ? null : (values.dozen_weight !== '' ? parseFloat(values.dozen_weight) : null),
                price_on_request:  values.price_on_request,
                stock:             values.stock !== '' ? parseInt(values.stock, 10) : 0,
                unlimited_stock:   Boolean(values.unlimited_stock),
                category_id:       values.category_id || null,
                images:            [...existingUrls, ...uploadedUrls],
                sizes:             Array.isArray(values.sizes) ? values.sizes : [],
                colors:            Array.isArray(values.colors) ? values.colors : [],
                size_guide:        values.size_guide ?? null,
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
        const { data, error: err } = await supabase.from('products').delete().eq('id', id).select('id')
        if (err) {
            // 23503 = foreign_key_violation: el producto figura en pedidos (order_items)
            setError(err.code === '23503'
                ? `No se puede eliminar "${name}" porque forma parte de pedidos existentes. Ocultalo del catálogo con el interruptor de la card.`
                : `No se pudo eliminar "${name}": ${err.message}`)
        } else if (!data?.length) {
            // RLS bloquea el DELETE sin devolver error: 0 filas afectadas
            setError(`No se eliminó "${name}": la base de datos rechazó la operación (probablemente falta una policy de DELETE en products para tu usuario).`)
        } else {
            load()
        }
        if (err || !data?.length) window.scrollTo({ top: 0, behavior: 'smooth' })
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
        <section aria-label="Inventario de productos">

            {/* ── Encabezado de sección ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid var(--admin-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--admin-text)', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Productos
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--admin-text-faint)', letterSpacing: 0, textTransform: 'none' }}>
                            ({products.length} productos)
                        </span>
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={load} style={S.btnGhost} title="Actualizar">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                        Actualizar
                    </button>
                    <button onClick={openAddModal} style={S.btnPrimary}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                        Nuevo producto
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
                    color: 'var(--admin-red)', fontFamily: 'monospace', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                    {error}
                </div>
            )}

            {/* ── Listado de productos: tabla en desktop (≥1024px), cards en mobile/tablet ── */}
            {loading ? (
                <div className="admin-orders">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--admin-text-faint)' }}>
                        <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cargando inventario…</span>
                    </div>
                </div>
            ) : products.length === 0 ? (
                <div className="admin-orders">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--admin-border-strong)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>inventory_2</span>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No products — add one above</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="admin-products-toolbar">
                        <div className="admin-products-chips" role="group" aria-label="Filtrar por categoría">
                            <button type="button" className="admin-products-chip" aria-pressed={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
                                Todos<span>{products.length}</span>
                            </button>
                            {categoryChips.map(c => (
                                <button key={c.key} type="button" className="admin-products-chip" aria-pressed={categoryFilter === c.key} onClick={() => setCategoryFilter(c.key)}>
                                    {c.name}<span>{c.count}</span>
                                </button>
                            ))}
                        </div>
                        <div className="admin-products-summary">
                            <span><i style={{ background: 'var(--admin-green)' }} />Visibles: <b>{visibleCount}</b></span>
                            <span><i style={{ background: 'var(--admin-text-subtle)' }} />Ocultos: <b>{products.length - visibleCount}</b></span>
                        </div>
                    </div>

                    <div className="admin-products-grid">
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                                onToggleVisibility={toggleVisibility}
                                toggling={togglingId === product.id}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}
