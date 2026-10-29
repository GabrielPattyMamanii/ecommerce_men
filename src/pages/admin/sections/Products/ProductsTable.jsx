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
import { NuevoLoteModal, AgregarProductoModal } from './components/LoteModals'
import { listTandas, agregarATanda, eliminarTanda } from '../../../../services/stockService'
import { matchesCodeSearch } from './components/productCodeUtils'
import { formatCurrency } from '../../../../lib/productPricing'
import { agruparLotes, rangoFechas, CODIGO_VARIOS } from '../../../../lib/lotesUtils'
import { LoteCard, Barra } from '../../../../components/admin/LoteCards'

/* Minúsculas y sin tildes, para comparar texto de búsqueda. */
function normalizeSearch(value) {
    return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

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
function ProductCard({ product, brandName, lote, onEdit, onDelete, onToggleVisibility, toggling }) {
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
                <span className="admin-pcard__id" title={product.code ? `ID #${product.id.slice(0, 8)}` : undefined}>{product.code || `#${product.id.slice(0, 8)}`}</span>
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

            {brandName && (
                <div className="admin-pcard__brand-row">
                    <span className="admin-pcard__brand" title={`Marca: ${brandName}`}>{brandName}</span>
                </div>
            )}

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

            {lote && (
                <div style={{ display: 'grid', gap: '0.35rem', margin: '0.25rem 0 0.75rem', padding: '0.6rem 0.75rem', border: '1px solid var(--admin-border-strong)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        <b style={{ color: 'var(--admin-text)' }}>{lote.codigo}</b>
                        <span style={{ color: 'var(--admin-text-muted)' }}>{lote.cantidad_actual} de {lote.cantidad_inicial} doc.</span>
                    </div>
                    <Barra actual={lote.cantidad_actual} inicial={lote.cantidad_inicial} />
                </div>
            )}

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
    const [brands, setBrands] = useState([])
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
    const [brandFilter, setBrandFilter] = useState('all')
    const [search, setSearch] = useState('')

    /* ─ Vista: todos los productos, o agrupados por lote (tarjetas de lote → productos del lote) ─ */
    const [viewMode, setViewMode] = useState('todos') // 'todos' | 'lotes'
    const [lotesRows, setLotesRows] = useState([])
    const [tandasRows, setTandasRows] = useState([])
    const [soloConStock, setSoloConStock] = useState(true)
    const [selectedLote, setSelectedLote] = useState(null) // nombre del lote abierto
    const [newLoteOpen, setNewLoteOpen] = useState(false)
    const [addExistingOpen, setAddExistingOpen] = useState(false)
    const [creatingInTanda, setCreatingInTanda] = useState(null) // lote al que entra el producto NUEVO que se está creando
    const loteGroups = useMemo(() => agruparLotes(lotesRows, { soloConStock, tandas: tandasRows, productos: products }), [lotesRows, tandasRows, soloConStock, products])
    const loteGroup = viewMode === 'lotes' && selectedLote ? loteGroups.find(g => g.codigo === selectedLote) ?? null : null
    const loteByProduct = useMemo(() => new Map((loteGroup?.items ?? []).map(i => [i.product_id, i])), [loteGroup])
    // Productos sobre los que trabajan chips, búsqueda y grilla: todos, o solo los del lote abierto.
    const baseProducts = useMemo(
        () => (loteGroup ? products.filter(p => loteByProduct.has(p.id)) : products),
        [products, loteGroup, loteByProduct]
    )
    const showingLoteGrid = viewMode === 'lotes' && !loteGroup
    // Productos sin lote (los creados fuera de lotes: viven en VARIOS): son los que "Agregar producto existente" ofrece.
    // Se calcula sobre TODAS las filas de stock_lotes, incluidas las que ya quedaron en 0.
    const productosSinLote = useMemo(() => {
        const conLote = new Set(lotesRows.filter(r => r.codigo !== CODIGO_VARIOS).map(r => r.product_id))
        return products.filter(p => !conLote.has(p.id))
    }, [products, lotesRows])

    /* ─ Chips de categoría con conteo + lista filtrada ─ */
    const categoryChips = useMemo(() => {
        const map = new Map()
        for (const p of baseProducts) {
            const key = p.category_id || 'none'
            const entry = map.get(key) ?? { key, name: p.categories?.name || 'Sin categoría', count: 0 }
            entry.count += 1
            map.set(key, entry)
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
    }, [baseProducts])
    const brandNames = useMemo(() => new Map(brands.map(b => [b.id, b.name])), [brands])
    // Chips de marca: solo las marcas que tienen productos (+ "Sin marca" si hay productos sin marca).
    const brandChips = useMemo(() => {
        const map = new Map()
        for (const p of baseProducts) {
            const key = p.brand_id && brandNames.has(p.brand_id) ? p.brand_id : 'none'
            const entry = map.get(key) ?? { key, name: key === 'none' ? 'Sin marca' : brandNames.get(key), count: 0 }
            entry.count += 1
            map.set(key, entry)
        }
        return [...map.values()].sort((a, b) =>
            a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name))
    }, [baseProducts, brandNames])
    // Si la marca elegida ya no tiene productos (ej. se borró el último), volver a "Todas".
    const activeBrandFilter = brandFilter === 'all' || brandChips.some(c => c.key === brandFilter) ? brandFilter : 'all'
    // Búsqueda por nombre o código: sin distinguir mayúsculas ni tildes.
    const searchTerm = normalizeSearch(search)
    const filteredProducts = baseProducts.filter(p =>
        (categoryFilter === 'all' || (p.category_id || 'none') === categoryFilter)
        && (activeBrandFilter === 'all' || (brandNames.has(p.brand_id) ? p.brand_id : 'none') === activeBrandFilter)
        && (!searchTerm || normalizeSearch(p.name).includes(searchTerm) || matchesCodeSearch(p.code, search))
    )
    const visibleCount = baseProducts.filter(p => p.visible).length

    /* ─ Fetch ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('products')
            .select('id, code, name, description, retail_price, wholesale_price, weight_kg, height_cm, width_cm, length_cm, dozen_height, dozen_width, dozen_length, dozen_weight, price_on_request, stock, unlimited_stock, images, sizes, colors, size_guide, visible, created_at, category_id, brand_id, categories(name)')
            .order('created_at', { ascending: false })
        if (err) {
            setError(err.message)
        } else {
            // Costos: tabla relacionada product_costs (1 fila por producto, misma clave que products.id).
            // Si falla (sin permiso o migración pendiente) el listado sigue funcionando sin costos.
            const { data: costs } = await supabase.from('product_costs').select('product_id, cost_price, cost_price_rounded')
            const costById = new Map((costs ?? []).map(c => [c.product_id, c]))
            setProducts((data ?? []).map(p => ({
                ...p,
                cost_price: costById.get(p.id)?.cost_price ?? null,
                cost_price_rounded: costById.get(p.id)?.cost_price_rounded ?? null,
            })))
        }
        setLoading(false)
        loadLotes()
    }

    // Lotes (tandas): solo los ve quien tenga acceso a Stock. Si falla o no hay acceso, la vista por lotes queda vacía.
    async function loadLotes() {
        const { data } = await supabase
            .from('stock_lotes')
            .select('id, product_id, codigo, fecha_ingreso, cantidad_inicial, cantidad_actual, created_at')
        setLotesRows(data ?? [])
        try { setTandasRows(await listTandas()) } catch { setTandasRows([]) }
    }

    async function loadCategories() {
        const { data } = await supabase.from('categories').select('id, name').order('name', { ascending: true })
        setCategories(data ?? [])
    }

    async function loadBrands() {
        const { data } = await supabase.from('brands').select('id, name').order('name', { ascending: true })
        setBrands(data ?? [])
    }

    useEffect(() => { load(); loadCategories(); loadBrands() }, [])

    /* ─ Guardar producto: alta o edición, con subida de imágenes nuevas a Storage ─ */
    async function handleSave(values, onSuccess) {
        setSaving(true)
        setModalError(null)
        try {
            // Producto NUEVO dentro de un lote: nace con stock 0 y entra por el lote (ingreso en el Kardex).
            const tandaCodigo = editingProduct ? null : creatingInTanda
            const tandaQty = tandaCodigo ? parseInt(values.stock, 10) : 0
            if (tandaCodigo && !(tandaQty > 0)) {
                throw new Error(`Indica cuántas docenas de este producto entran al lote ${tandaCodigo}.`)
            }

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
                code:              values.code?.trim().toUpperCase() || null,
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
                stock:             tandaCodigo ? 0 : (values.stock !== '' ? parseInt(values.stock, 10) : 0),
                unlimited_stock:   Boolean(values.unlimited_stock),
                category_id:       values.category_id || null,
                brand_id:          values.brand_id || null,
                images:            [...existingUrls, ...uploadedUrls],
                sizes:             Array.isArray(values.sizes) ? values.sizes : [],
                colors:            Array.isArray(values.colors) ? values.colors : [],
                size_guide:        values.size_guide ?? null,
            }

            let productId = editingProduct?.id
            if (editingProduct) {
                const { error: err } = await supabase.from('products').update(payload).eq('id', productId)
                if (err) throw err
            } else {
                const { data: created, error: err } = await supabase.from('products').insert(payload).select('id').single()
                if (err) throw err
                productId = created.id
            }

            // Carga al lote (después del alta). Si falla, el producto ya existe: se avisa sin repetir el alta.
            if (tandaCodigo) {
                try {
                    await agregarATanda({ codigo: tandaCodigo, productId, cantidad: tandaQty })
                } catch (tandaErr) {
                    setError(`El producto se creó, pero no se pudo cargar al lote ${tandaCodigo}: ${tandaErr.message}. Agrégalo desde "Agregar producto existente".`)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                }
            }

            // Costos → product_costs (misma clave: product_id = products.id).
            // El producto ya quedó guardado; si solo falla el costo se avisa sin repetir el alta.
            const toCost = v => (v === '' || v == null ? null : parseFloat(v))
            const cost = { cost_price: toCost(values.cost_price), cost_price_rounded: toCost(values.cost_price_rounded) }
            const hadCost = editingProduct && (editingProduct.cost_price != null || editingProduct.cost_price_rounded != null)
            if (cost.cost_price !== null || cost.cost_price_rounded !== null || hadCost) {
                const { error: costErr } = await supabase.from('product_costs').upsert({ product_id: productId, ...cost }, { onConflict: 'product_id' })
                if (costErr) {
                    setError(`El producto se guardó, pero no se pudo guardar el costo: ${costErr.message}`)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                }
            }

            onSuccess()
            setShowModal(false)
            setEditingProduct(null)
            load()
        } catch (err) {
            setModalError(err.code === '23505' && /code/i.test(err.message ?? '')
                ? 'Ya existe otro producto con ese código. Usá uno distinto.'
                : err.message)
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
        setCreatingInTanda(null)
        setEditingProduct(null)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }
    function openAddInLote() {
        // En VARIOS (lote del sistema) se crea igual que fuera de lotes: el stock inicial, si hay, entra a VARIOS.
        setCreatingInTanda(loteGroup && !loteGroup.sistema ? loteGroup.codigo : null)
        setEditingProduct(null)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }
    function openEditModal(product) {
        setCreatingInTanda(null)
        setEditingProduct(product)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }

    /* ─ Eliminar un lote vacío (la base rechaza si ya tiene productos) ─ */
    async function handleDeleteLote(codigo, cantProductos) {
        const aviso = cantProductos > 0
            ? `Los ${cantProductos} ${cantProductos === 1 ? 'producto pasará' : 'productos pasarán'} a ${CODIGO_VARIOS} con sus cantidades y su historial. El stock total de cada producto no cambia.`
            : 'Está vacío.'
        if (!window.confirm(`¿Eliminar el lote "${codigo}"? ${aviso} Esta acción no se puede deshacer.`)) return
        setError(null)
        try {
            await eliminarTanda(codigo)
            setSelectedLote(null)
            load()
        } catch (err) {
            setError(err.message)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    /* ════════════════ RENDER ════════════════ */
    return (
        <section aria-label="Stock de productos">

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
                tandaCodigo={!editingProduct ? creatingInTanda : null}
                onClose={() => setShowModal(false)}
                categories={categories}
                brands={brands}
                existingProducts={products}
                onSwitchToProduct={openEditModal}
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
                    <div className="admin-products-chips" role="group" aria-label="Forma de mostrar los productos" style={{ marginBottom: '1.25rem' }}>
                        <button type="button" className="admin-products-chip" aria-pressed={viewMode === 'todos'}
                            onClick={() => { setViewMode('todos'); setSelectedLote(null) }}>
                            Todos los productos<span>{products.length}</span>
                        </button>
                        <button type="button" className="admin-products-chip" aria-pressed={viewMode === 'lotes'}
                            onClick={() => { setViewMode('lotes'); setSelectedLote(null) }}>
                            Por lotes<span>{loteGroups.length}</span>
                        </button>
                    </div>

                    {showingLoteGrid ? (
                        <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <button type="button" onClick={() => setNewLoteOpen(true)} style={S.btnPrimary}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                                    Nuevo lote
                                </button>
                                <button type="button" onClick={() => setSoloConStock(v => !v)}
                                    style={{ ...S.btnGhost, ...(soloConStock ? { background: 'var(--admin-primary)', color: 'white' } : {}) }}>
                                    Solo con stock
                                </button>
                                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-faint)' }}>
                                    Cada lote agrupa los productos que ingresaron juntos. {CODIGO_VARIOS} reúne los productos sin lote (los creados fuera de los lotes) y no se puede eliminar; LOTE-000 es la "tanda vieja" (stock previo al sistema de lotes).
                                </span>
                            </div>
                            {loteGroups.length === 0 ? (
                                <p role="status" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--admin-text-faint)' }}>
                                    No hay lotes para mostrar{soloConStock ? ' con stock (prueba desactivar "Solo con stock")' : ''}. Crea uno con &ldquo;Nuevo lote&rdquo;.
                                </p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                                    {loteGroups.map(g => <LoteCard key={g.codigo} lote={g} onOpen={setSelectedLote} />)}
                                </div>
                            )}
                        </>
                    ) : (
                    <>
                    {loteGroup && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <button type="button" onClick={() => { setSelectedLote(null); setSearch(''); setCategoryFilter('all'); setBrandFilter('all') }} style={S.btnGhost}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
                                Lotes
                            </button>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--admin-text)' }}>{loteGroup.codigo}</h3>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--admin-text-faint)' }}>
                                {rangoFechas(loteGroup)} · {loteGroup.actual} de {loteGroup.inicial} docenas · {loteGroup.items.length} {loteGroup.items.length === 1 ? 'producto' : 'productos'}
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginLeft: 'auto' }}>
                                {!loteGroup.sistema && (
                                    <button type="button" onClick={() => handleDeleteLote(loteGroup.codigo, loteGroup.items.length)} style={S.btnGhost}
                                        title={loteGroup.items.length ? `Eliminar el lote (sus productos pasan a ${CODIGO_VARIOS})` : 'Eliminar este lote vacío'}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                        Eliminar lote
                                    </button>
                                )}
                                {!loteGroup.sistema && (
                                    <button type="button" onClick={() => setAddExistingOpen(true)} style={S.btnGhost}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>playlist_add</span>
                                        Agregar producto sin lote
                                    </button>
                                )}
                                <button type="button" onClick={openAddInLote} style={S.btnPrimary}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                                    Nuevo producto
                                </button>
                            </div>
                        </div>
                    )}

                    {loteGroup && loteGroup.sistema && (
                        <p style={{ margin: '-0.5rem 0 1.25rem', fontSize: '0.75rem', color: 'var(--admin-text-faint)' }}>
                            {CODIGO_VARIOS} agrupa los productos que no pertenecen a ningún lote: los que creas fuera de los lotes
                            y los que quedan cuando se elimina un lote. Este lote no se puede eliminar ni renombrar.
                        </p>
                    )}
                    {loteGroup && !loteGroup.sistema && loteGroup.items.length === 0 && (
                        <p role="status" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--admin-text-faint)' }}>
                            Este lote está vacío. Crea un producto nuevo o agrega uno sin lote con la cantidad que llegó.
                        </p>
                    )}

                    <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '1rem' }}>
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: 'var(--admin-text-faint)', pointerEvents: 'none' }}>search</span>
                        <input
                            type="search" className="admin-products-search" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o código…" aria-label="Buscar productos por nombre o código"
                            style={{ ...S.input, paddingLeft: '2.4rem', paddingRight: search ? '2.4rem' : undefined }}
                        />
                        {search && (
                            <button
                                type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"
                                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-text-faint)', display: 'flex', padding: '0.2rem' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                            </button>
                        )}
                    </div>

                    <div className="admin-products-toolbar">
                        <div className="admin-products-chips" role="group" aria-label="Filtrar por categoría">
                            <button type="button" className="admin-products-chip" aria-pressed={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
                                Todos<span>{baseProducts.length}</span>
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

                    {brandChips.length > 0 && (
                        <div className="admin-products-chips" role="group" aria-label="Filtrar por marca" style={{ margin: '-0.5rem 0 1.25rem' }}>
                            <button type="button" className="admin-products-chip" aria-pressed={activeBrandFilter === 'all'} onClick={() => setBrandFilter('all')}>
                                Todas las marcas<span>{baseProducts.length}</span>
                            </button>
                            {brandChips.map(c => (
                                <button key={c.key} type="button" className="admin-products-chip" aria-pressed={activeBrandFilter === c.key} onClick={() => setBrandFilter(c.key)}>
                                    {c.name}<span>{c.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {searchTerm && (
                        <p aria-live="polite" style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--admin-text-faint)', fontFamily: 'monospace' }}>
                            {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{search.trim()}&rdquo;
                        </p>
                    )}

                    {filteredProducts.length === 0 && baseProducts.length > 0 && (
                        <div role="status" style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center',
                            padding: '2.5rem 1rem', border: '1px solid rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.08)',
                            borderRadius: '12px', color: 'var(--admin-text)',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#eab308' }}>search_off</span>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                                {searchTerm
                                    ? `No existe ningún producto con el nombre o código “${search.trim()}”.`
                                    : 'No hay productos con los filtros elegidos.'}
                            </p>
                            {searchTerm && (categoryFilter !== 'all' || activeBrandFilter !== 'all') && (
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-faint)' }}>
                                    La búsqueda se aplica solo dentro de la categoría y la marca elegidas.
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {searchTerm && <button type="button" onClick={() => setSearch('')} style={S.btnGhost}>Limpiar búsqueda</button>}
                                {(categoryFilter !== 'all' || activeBrandFilter !== 'all') && (
                                    <button type="button" onClick={() => { setCategoryFilter('all'); setBrandFilter('all') }} style={S.btnGhost}>Quitar filtros</button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="admin-products-grid">
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                brandName={brandNames.get(product.brand_id)}
                                lote={loteByProduct.get(product.id)}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                                onToggleVisibility={toggleVisibility}
                                toggling={togglingId === product.id}
                            />
                        ))}
                    </div>
                    </>
                    )}
                </>
            )}

            {newLoteOpen && (
                <NuevoLoteModal
                    onClose={() => setNewLoteOpen(false)}
                    onCreated={async codigo => {
                        setNewLoteOpen(false)
                        await loadLotes()
                        setSelectedLote(codigo) // se abre vacío, listo para cargarle productos
                    }}
                />
            )}
            {addExistingOpen && loteGroup && (
                <AgregarProductoModal
                    codigo={loteGroup.codigo}
                    products={productosSinLote}
                    onClose={() => setAddExistingOpen(false)}
                    onAdded={() => { setAddExistingOpen(false); load() }}
                />
            )}
        </section>
    )
}
