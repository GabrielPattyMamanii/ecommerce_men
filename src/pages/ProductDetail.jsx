import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabaseClient'
import { formatPrice, isPurchasable, hasWholesale, formatWholesalePrice, isWholesalePurchasable, hasDozenDimensions, formatDozenDimensions, getDozenDimensionEntries, isAvailable, formatCurrency } from '../lib/productPricing'
import { buildConsultWhatsappUrl } from '../lib/whatsappConsult'
import { useContactSettings } from '../hooks/useContactSettings'
import { usePriceVisibility } from '../hooks/usePriceVisibility'

/* ── Componente Stars ── */
function Stars({ rating, size = 'text-[16px]' }) {
    return (
        <div className="flex text-primary">
            {[1, 2, 3, 4, 5].map(n => (
                <span
                    key={n}
                    className={`material-symbols-outlined ${size}`}
                    style={{ fontVariationSettings: `'FILL' ${n <= rating ? 1 : 0.15}` }}
                >
                    star
                </span>
            ))}
        </div>
    )
}

/* ════════════════════════════════════════
   PRODUCT DETAIL — COMPONENTE PRINCIPAL
   ════════════════════════════════════════ */
export default function ProductDetail() {
    const { id } = useParams()
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [activeImage, setActiveImage] = useState(0)
    const [imageHovered, setImageHovered] = useState(false)
    const [activeColor, setActiveColor] = useState(null) // null = sin elección manual todavía; se resuelve en el render
    const [activeSize, setActiveSize] = useState(null) // null = sin elección manual todavía; se resuelve en el render
    const [activeTab, setActiveTab] = useState('specs')
    const [added, setAdded] = useState(false)
    const [chosenMode, setMode] = useState('retail') // elección manual: 'retail' | 'wholesale'
    const [dozens, setDozens] = useState(1)
    const [qty, setQty] = useState(1)

    const [stockMsg, setStockMsg] = useState(null)
    const [checkingStock, setCheckingStock] = useState(false)

    const { items: cartItems, addItem, addWholesaleItem } = useCart()
    const contactSettings = useContactSettings()
    const { showRetail, showWholesale, purchasesEnabled } = usePriceVisibility()

    useEffect(() => {
        async function fetchProduct() {
            setLoading(true)
            setError(null)
            const { data, error: err } = await supabase
                .from('products')
                .select('id, name, description, retail_price, wholesale_price, dozen_height, dozen_width, dozen_length, dozen_weight, price_on_request, stock, unlimited_stock, images, sizes, colors, size_guide')
                .eq('id', id)
                .eq('visible', true)
                .single()
            if (err) setError(err.message)
            else setProduct(data)
            setLoading(false)
        }
        if (id) fetchProduct()
    }, [id])

    // Carrusel automático cada 4s; se pausa mientras el cursor está sobre la imagen
    const imageCount = product?.images?.length ?? 0
    useEffect(() => {
        if (imageCount < 2 || imageHovered) return
        const timer = setInterval(() => {
            setActiveImage(prev => (prev + 1) % imageCount)
        }, 4000)
        return () => clearInterval(timer)
    }, [imageCount, imageHovered, activeImage])

    const sizeGuide = product?.size_guide
    const hasSizeGuide = sizeGuide?.columns?.length > 0 && sizeGuide?.rows?.length > 0
    const TABS = [
        { id: 'specs', label: 'Detalles' },
        ...(hasSizeGuide ? [{ id: 'sizeguide', label: 'Guía de talles' }] : []),
    ]

    /* ── Estados de carga ── */
    if (loading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="bg-background min-h-screen flex flex-col items-center justify-center gap-6 px-4">
                <span className="material-symbols-outlined text-outline text-6xl">inventory_2</span>
                <p className="font-mono text-muted text-sm uppercase tracking-widest">
                    {error || 'Producto no encontrado'}
                </p>
                <Link
                    to="/catalogo"
                    className="px-6 py-3 rounded-full border border-accent text-accent font-mono text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                >
                    Volver al catálogo
                </Link>
            </div>
        )
    }

    // Modo efectivo según la visibilidad de precios configurada en el admin:
    // si un tipo está desactivado, se fuerza el otro y no se muestra el toggle.
    const mode = !showRetail ? 'wholesale' : !showWholesale ? 'retail' : chosenMode
    const showModeToggle = showRetail && showWholesale && hasWholesale(product)

    const images = product.images?.length > 0 ? product.images : []
    const activeImg = images[activeImage] || null
    const sizes = product.sizes?.length > 0 ? product.sizes : []
    const selectedSize = activeSize ?? sizes[0] ?? 'Único'
    const colors = product.colors?.length > 0 ? product.colors : []
    const selectedColor = activeColor ?? colors[0] ?? 'default'
    const maxQty = product.stock > 0 ? product.stock : (product.unlimited_stock ? 99 : 1)
    const consultUrl = product.price_on_request ? buildConsultWhatsappUrl(contactSettings, product.name) : null
    const mainButtonDisabled = product.price_on_request ? !consultUrl : !isPurchasable(product)

    function handleAddToCart() {
        addItem(product, selectedColor, selectedSize, qty)
        setAdded(true)
        setQty(1)
        setTimeout(() => setAdded(false), 2000)
    }

    // Docenas de este producto que ya están en el carrito (cuentan contra el stock)
    const dozensInCart = cartItems.find(i => i.id === `${product.id}-wholesale`)?.qty ?? 0
    const maxDozens = product.unlimited_stock ? Infinity : Math.max(0, (product.stock ?? 0) - dozensInCart)

    function changeDozens(next) {
        setStockMsg(null)
        if (next > maxDozens) {
            setStockMsg(maxDozens === 0
                ? 'Ya tenés en el carrito todas las docenas disponibles.'
                : `Solo hay ${maxDozens} docena${maxDozens === 1 ? '' : 's'} disponible${maxDozens === 1 ? '' : 's'}.`)
            next = maxDozens
        }
        setDozens(Math.max(1, next))
    }

    async function handleAddWholesaleToCart() {
        setStockMsg(null)
        let current = product
        if (!product.unlimited_stock) {
            // Revalidar contra la tabla products: el stock pudo cambiar desde que se cargó la página
            setCheckingStock(true)
            const { data, error: err } = await supabase
                .from('products')
                .select('stock, unlimited_stock')
                .eq('id', product.id)
                .single()
            setCheckingStock(false)
            if (err) {
                setStockMsg('No pudimos verificar el stock. Intentá de nuevo.')
                return
            }
            current = { ...product, ...data }
            setProduct(current)
            if (!data.unlimited_stock) {
                const available = Math.max(0, (data.stock ?? 0) - dozensInCart)
                if (dozens > available) {
                    setDozens(Math.max(1, available))
                    setStockMsg(available === 0
                        ? 'No quedan docenas disponibles para agregar.'
                        : `Solo hay ${available} docena${available === 1 ? '' : 's'} disponible${available === 1 ? '' : 's'}.`)
                    return
                }
            }
        }
        addWholesaleItem(current, dozens)
        setDozens(1)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    function handleConsult() {
        const url = buildConsultWhatsappUrl(contactSettings, product.name)
        if (url) window.open(url, '_blank')
    }

    return (
        <div className="bg-background min-h-screen text-primary font-body antialiased selection:bg-black/10 selection:text-primary">

            {/* ── Grid bg decorative ── */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-0"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '20px 20px',
                }}
                aria-hidden="true"
            />

            <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-10 py-8">

                {/* ── Breadcrumb ── */}
                <nav className="flex items-center gap-2 text-xs font-display tracking-widest text-muted mb-8 uppercase" aria-label="Breadcrumb">
                    <Link to="/" className="hover:text-accent transition-colors">Inicio</Link>
                    <span className="material-symbols-outlined text-[12px] text-accent">chevron_right</span>
                    <Link to="/catalogo" className="hover:text-accent transition-colors">Catálogo</Link>
                    <span className="material-symbols-outlined text-[12px] text-accent">chevron_right</span>
                    <span className="text-primary truncate max-w-[200px]">{product.name}</span>
                </nav>

                {/* ── Main grid: Galería + Panel info ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

                    {/* ═══════════ GALERÍA DE IMÁGENES ═══════════ */}
                    <div className="lg:col-span-7 space-y-4">

                        {/* Imagen principal */}
                        <div
                            className="aspect-[4/5] w-full bg-surface overflow-hidden relative group rounded-2xl transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(59,91,253,0.3)]"
                            onMouseEnter={() => setImageHovered(true)}
                            onMouseLeave={() => setImageHovered(false)}
                        >
                            {/* Stock bajo badge — oculto si el producto está marcado como disponible sin control de stock */}
                            {!product.unlimited_stock && product.stock !== null && product.stock <= 5 && (
                                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider backdrop-blur-sm border
                                        ${product.stock === 0
                                            ? 'bg-red-500/10 border-red-500/30 text-red-700'
                                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700'
                                        }`}>
                                        {product.stock === 0 ? 'Sin Stock' : `Últimas ${product.stock} unidades`}
                                    </span>
                                </div>
                            )}

                            {/* Imagen */}
                            {activeImg ? (
                                <div
                                    className="w-full h-full bg-center bg-contain bg-no-repeat transition-transform duration-700 group-hover:scale-110"
                                    style={{ backgroundImage: `url(${activeImg})` }}
                                    role="img"
                                    aria-label={`${product.name} — vista ${activeImage + 1}`}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-outline text-8xl">image_not_supported</span>
                                </div>
                            )}

                            {/* Flechas de navegación */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setActiveImage(prev => (prev - 1 + images.length) % images.length)}
                                        aria-label="Imagen anterior"
                                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-primary hover:bg-white hover:scale-105 transition-all"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveImage(prev => (prev + 1) % images.length)}
                                        aria-label="Imagen siguiente"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-primary hover:bg-white hover:scale-105 transition-all"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>

                                    {/* Indicadores (puntos) */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                        {images.map((_, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveImage(idx)}
                                                aria-label={`Ir a imagen ${idx + 1}`}
                                                className={`h-2 rounded-full transition-all ${activeImage === idx ? 'w-6 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/60'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(idx)}
                                        aria-label={`Ver imagen ${idx + 1}`}
                                        className={`aspect-square bg-surface overflow-hidden rounded-xl border-2 transition-all relative group ${activeImage === idx
                                                ? 'border-accent'
                                                : 'border-transparent hover:border-accent/40'
                                            }`}
                                    >
                                        <div
                                            className={`w-full h-full bg-center bg-contain bg-no-repeat transition-opacity ${activeImage === idx ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                                                }`}
                                            style={{ backgroundImage: `url(${img})` }}
                                        />
                                        {activeImage === idx && (
                                            <div className="absolute inset-0 bg-accent/10" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ═══════════ PANEL DE INFORMACIÓN ═══════════ */}
                    <div className="lg:col-span-5 flex flex-col">
                        <div className="lg:sticky lg:top-24">

                            {/* Status badge */}
                            <div className="mb-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                <span className="text-primary text-xs font-display font-bold uppercase tracking-widest">
                                    En Stock
                                </span>
                            </div>

                            {/* Nombre del producto */}
                            <h1 className="text-4xl lg:text-5xl font-bold font-display text-primary mb-2 leading-none uppercase tracking-tight">
                                {product.name}
                            </h1>

                            {/* Toggle Por Menor / Por Mayor (solo si el producto tiene precio mayorista) */}
                            {showModeToggle && (
                                <div className="flex mt-4 p-1 rounded-full bg-surface-container w-fit" role="tablist" aria-label="Modalidad de compra">
                                    {[
                                        { id: 'retail', label: 'Por Menor' },
                                        { id: 'wholesale', label: 'Por Mayor' },
                                    ].map(({ id, label }) => (
                                        <button
                                            key={id}
                                            role="tab"
                                            aria-selected={mode === id}
                                            onClick={() => setMode(id)}
                                            className={`px-5 py-2 rounded-full text-xs font-display font-bold uppercase tracking-widest transition-all ${mode === id
                                                    ? 'bg-accent text-white shadow-[0_8px_16px_-8px_rgba(59,91,253,0.5)]'
                                                    : 'text-muted hover:text-accent'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Precio + Stock */}
                            <div className="border-b border-border pb-6 mb-6 mt-4">
                                <div className="flex items-end gap-6">
                                    <p className="text-3xl font-display font-medium text-primary">
                                        {mode === 'wholesale'
                                            ? (hasWholesale(product) ? formatWholesalePrice(product) : 'Consultar precio')
                                            : formatPrice(product)}
                                    </p>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-mono uppercase tracking-wide ${isAvailable(product) ? 'text-green-600' : 'text-red-600'}`}>
                                            {product.unlimited_stock ? 'Disponible' : product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                                        </span>
                                    </div>
                                </div>
                                {mode === 'wholesale' && hasWholesale(product) && (
                                    <p className="text-[11px] text-muted font-mono uppercase tracking-wide mt-1">
                                        Precio por docena · 12 unidades
                                    </p>
                                )}
                            </div>

                            {/* Descripción */}
                            {product.description && (
                                <div className="mb-8 p-4 rounded-2xl bg-surface border border-border relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1 pointer-events-none">
                                        <span className="material-symbols-outlined text-border text-4xl opacity-20">science</span>
                                    </div>
                                    <p className="text-muted text-sm leading-relaxed font-light">
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {/* ── Selector de talla (real, cargado desde el producto) ── */}
                            {sizes.length > 0 && mode === 'retail' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Talle
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sizes.map(label => {
                                            const isActive = selectedSize === label
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => setActiveSize(label)}
                                                    aria-label={`Talla ${label}`}
                                                    aria-pressed={isActive}
                                                    className={`h-10 min-w-10 px-3 rounded-full border-2 flex items-center justify-center text-xs font-display font-bold transition-all
                                                        ${isActive
                                                            ? 'border-accent bg-accent/10 text-accent'
                                                            : 'border-border bg-surface hover:border-accent/50 text-muted hover:text-accent'
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Talles disponibles (solo informativo, modo Por Mayor) ── */}
                            {sizes.length > 0 && mode === 'wholesale' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Talles disponibles
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sizes.map(label => (
                                            <span
                                                key={label}
                                                aria-label={`Talla disponible ${label}`}
                                                className="h-10 min-w-10 px-3 rounded-full border border-border bg-surface flex items-center justify-center text-xs font-display font-bold text-primary"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Selector de color (real, seleccionable — modo Por Menor) ── */}
                            {colors.length > 0 && mode === 'retail' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Color
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {colors.map(hex => {
                                            const isActive = selectedColor === hex
                                            return (
                                                <button
                                                    key={hex}
                                                    onClick={() => setActiveColor(hex)}
                                                    title={hex}
                                                    aria-label={`Color ${hex}`}
                                                    aria-pressed={isActive}
                                                    className={`w-9 h-9 rounded-full transition-all ${isActive
                                                            ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-110'
                                                            : 'ring-1 ring-border hover:ring-accent/50'
                                                        }`}
                                                    style={{ background: hex }}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Colores disponibles (solo informativo, modo Por Mayor) ── */}
                            {colors.length > 0 && mode === 'wholesale' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Color
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {colors.map(hex => (
                                            <span
                                                key={hex}
                                                title={hex}
                                                aria-label={`Color disponible: ${hex}`}
                                                className="w-9 h-9 rounded-full ring-1 ring-border"
                                                style={{ background: hex }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Cantidad (modo Por Menor) ── */}
                            {purchasesEnabled && mode === 'retail' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Cantidad
                                        </span>
                                    </div>
                                    <div className="flex items-center rounded-full bg-surface-container w-fit">
                                        <button
                                            onClick={() => setQty(q => Math.max(1, q - 1))}
                                            disabled={qty <= 1}
                                            aria-label="Reducir cantidad"
                                            className="w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-accent/10 transition-colors text-sm font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            −
                                        </button>
                                        <span className="px-2 text-sm font-bold text-primary font-mono min-w-10 text-center">{qty}</span>
                                        <button
                                            onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                                            disabled={qty >= maxQty}
                                            aria-label="Aumentar cantidad"
                                            className="w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-accent/10 transition-colors text-sm font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Cantidad de docenas (modo Por Mayor) ── */}
                            {purchasesEnabled && mode === 'wholesale' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Cantidad de docenas
                                        </span>
                                    </div>
                                    <div className="flex items-center rounded-full bg-surface-container w-fit">
                                        <button
                                            onClick={() => changeDozens(dozens - 1)}
                                            disabled={dozens <= 1}
                                            aria-label="Reducir docenas"
                                            className="w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-accent/10 transition-colors text-sm font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            −
                                        </button>
                                        <span className="px-2 text-sm font-bold text-primary font-mono min-w-10 text-center" aria-live="polite">{dozens}</span>
                                        <button
                                            onClick={() => changeDozens(dozens + 1)}
                                            disabled={dozens >= maxDozens}
                                            aria-label="Aumentar docenas"
                                            className="w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-accent/10 transition-colors text-sm font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            +
                                        </button>
                                    </div>
                                    {dozensInCart > 0 && !product.unlimited_stock && (
                                        <p className="mt-2 text-[11px] font-mono text-muted uppercase tracking-wide">
                                            {dozensInCart} en el carrito
                                        </p>
                                    )}
                                    {stockMsg && (
                                        <p role="alert" className="mt-2 text-xs font-mono text-red-600">{stockMsg}</p>
                                    )}
                                </div>
                            )}

                            {/* ── Dimensiones de la docena (si el producto las tiene cargadas) ── */}
                            {mode === 'wholesale' && hasDozenDimensions(product) && (
                                <div className="mb-8 rounded-2xl border border-border bg-surface/50 px-4 py-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-accent text-lg">inventory_2</span>
                                        <span className="text-xs font-display font-bold text-muted uppercase tracking-widest">
                                            Dimensiones de la docena
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {getDozenDimensionEntries(product).map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="flex flex-col items-center justify-center rounded-xl bg-surface border border-border py-2 px-1"
                                            >
                                                <span className="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">
                                                    {label}
                                                </span>
                                                <span className="text-sm font-display font-bold text-primary">
                                                    {value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── CTAs ── */}
                            <div className="flex flex-col gap-4 mb-8">

                                {/* Botón principal — Add to Cart (en modo catálogo: consulta por WhatsApp) */}
                                {!purchasesEnabled ? (
                                    consultUrl || buildConsultWhatsappUrl(contactSettings, product.name) ? (
                                        <button
                                            onClick={handleConsult}
                                            id="consult-btn"
                                            className="w-full h-14 rounded-full font-display font-bold text-base sm:text-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 bg-accent text-white hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(59,91,253,0.6)]"
                                        >
                                            CONSULTAR POR WHATSAPP
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </button>
                                    ) : null
                                ) : mode === 'wholesale' ? (
                                    <button
                                        onClick={handleAddWholesaleToCart}
                                        disabled={!isWholesalePurchasable(product) || dozens < 1 || checkingStock || maxDozens < 1}
                                        id="add-to-cart-wholesale-btn"
                                        className={`w-full h-14 rounded-full font-display font-bold text-base sm:text-lg transition-all active:scale-[0.99] flex items-center justify-between px-5 sm:px-8 group relative overflow-hidden
                                            ${!isWholesalePurchasable(product) || dozens < 1
                                                ? 'bg-surface-container text-outline cursor-not-allowed'
                                                : added
                                                    ? 'bg-green-500 text-black'
                                                    : 'bg-accent text-white hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(59,91,253,0.6)]'
                                            }`}                                    >
                                        <span className="z-10 flex items-center gap-2">
                                            {added ? (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                    AGREGADO
                                                </>
                                            ) : !isAvailable(product) ? (
                                                'SIN STOCK'
                                            ) : (
                                                <>
                                                    AGREGAR {dozens} DOCENA{dozens === 1 ? '' : 'S'}
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </>
                                            )}
                                        </span>
                                        <span className="z-10 font-mono text-sm">
                                            {formatCurrency(Number(product.wholesale_price) * dozens)}
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={product.price_on_request ? handleConsult : handleAddToCart}
                                        disabled={mainButtonDisabled}
                                        id="add-to-cart-btn"
                                        className={`w-full h-14 rounded-full font-display font-bold text-base sm:text-lg transition-all active:scale-[0.99] flex items-center justify-between px-5 sm:px-8 group relative overflow-hidden
                                            ${mainButtonDisabled
                                                ? 'bg-surface-container text-outline cursor-not-allowed'
                                                : added
                                                    ? 'bg-green-500 text-black'
                                                    : 'bg-accent text-white hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(59,91,253,0.6)]'
                                            }`}                                    >
                                        <span className="z-10 flex items-center gap-2">
                                            {added ? (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                    AGREGADO
                                                </>
                                            ) : product.price_on_request ? (
                                                'CONSULTAR PRECIO'
                                            ) : !isAvailable(product) ? (
                                                'SIN STOCK'
                                            ) : (
                                                <>
                                                    Comprar ahora
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </>
                                            )}
                                        </span>
                                        {!product.price_on_request && <span className="z-10 font-mono text-sm">{formatCurrency(product.retail_price)}</span>}
                                    </button>
                                )}

                                {/* Botón secundario — Ver catálogo */}
                                <Link
                                    to="/catalogo"
                                    className="w-full h-12 rounded-full bg-transparent border border-border text-muted hover:border-accent hover:text-accent hover:bg-accent/5 font-display text-sm tracking-wider transition-all flex items-center justify-center gap-2 uppercase"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                    Ver más productos
                                </Link>
                            </div>

                            {/* ── Tabs de especificaciones ── */}
                            <div className="border-t border-border">
                                <div className="flex gap-6 mb-4 border-b border-border" role="tablist">
                                    {TABS.map(({ id, label }) => (
                                        <button
                                            key={id}
                                            role="tab"
                                            aria-selected={activeTab === id}
                                            onClick={() => setActiveTab(id)}
                                            className={`py-3 text-xs font-display font-bold uppercase tracking-widest transition-colors ${activeTab === id
                                                    ? 'text-accent border-b-2 border-accent'
                                                    : 'text-muted hover:text-accent'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Contenido de tabs */}
                                {activeTab === 'specs' && (
                                    <div className="space-y-3 py-2" role="tabpanel">
                                        {[
                                            ['Nombre', product.name],
                                            ['Categoría', product.category || '—'],
                                            ['Precio', mode === 'wholesale' ? `${formatWholesalePrice(product)} / docena` : formatPrice(product)],
                                            ...(mode === 'wholesale' ? [['Unidad de venta', 'Docena (12 unidades)']] : []),
                                            ...(mode === 'wholesale' && hasDozenDimensions(product) ? [['Dimensiones docena', formatDozenDimensions(product)]] : []),
                                            ['Stock disponible', product.unlimited_stock ? 'Disponible' : product.stock],
                                        ].map(([key, value]) => (
                                            <div
                                                key={key}
                                                className="flex justify-between items-center text-sm border-b border-border/70 pb-2 border-dashed last:border-none"
                                            >
                                                <span className="text-muted font-mono text-xs uppercase">{key}</span>
                                                <span className="text-primary font-medium text-right">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'sizeguide' && hasSizeGuide && (
                                    <div className="py-2 overflow-x-auto" role="tabpanel">
                                        <table className="w-full border-collapse text-sm text-center rounded-2xl overflow-hidden">
                                            <thead>
                                                <tr className="bg-accent text-white">
                                                    <th className="px-3 py-2 font-display font-bold uppercase tracking-wider text-xs">Talle</th>
                                                    {sizeGuide.columns.map(col => (
                                                        <th key={col} className="px-3 py-2 font-display font-bold uppercase tracking-wider text-xs">{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sizeGuide.rows.map((row, idx) => (
                                                    <tr key={row.size} className={idx % 2 === 1 ? 'bg-surface-container' : ''}>
                                                        <td className="border-t border-border px-3 py-2 font-medium text-primary">{row.size}</td>
                                                        {sizeGuide.columns.map((col, i) => (
                                                            <td key={col} className="border-t border-border px-3 py-2 text-primary">{row.values?.[i] || '—'}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            </div>

                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}
