import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabaseClient'
import { formatPrice, isPurchasable, hasWholesale, formatWholesalePrice, isWholesalePurchasable, hasDozenDimensions, formatDozenDimensions, getDozenDimensionEntries } from '../lib/productPricing'

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
    const [activeColor, setActiveColor] = useState(null) // null = sin elección manual todavía; se resuelve en el render
    const [activeSize, setActiveSize] = useState(null) // null = sin elección manual todavía; se resuelve en el render
    const [activeTab, setActiveTab] = useState('specs')
    const [added, setAdded] = useState(false)
    const [mode, setMode] = useState('retail') // 'retail' | 'wholesale'
    const [dozens, setDozens] = useState(1)
    const [qty, setQty] = useState(1)

    const { addItem, addWholesaleItem } = useCart()

    useEffect(() => {
        async function fetchProduct() {
            setLoading(true)
            setError(null)
            const { data, error: err } = await supabase
                .from('products')
                .select('id, name, description, retail_price, wholesale_price, dozen_height, dozen_width, dozen_length, dozen_weight, price_on_request, stock, images, sizes, colors')
                .eq('id', id)
                .eq('visible', true)
                .single()
            if (err) setError(err.message)
            else setProduct(data)
            setLoading(false)
        }
        if (id) fetchProduct()
    }, [id])

    const TABS = [
        { id: 'specs', label: 'Tech Specs' },
        { id: 'logistics', label: 'Logistics' },
        { id: 'care', label: 'Care Protocol' },
    ]

    /* ── Estados de carga ── */
    if (loading) {
        return (
            <div className="bg-background-dark min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center gap-6 px-4">
                <span className="material-symbols-outlined text-slate-600 text-6xl">inventory_2</span>
                <p className="font-mono text-slate-500 text-sm uppercase tracking-widest">
                    {error || 'Producto no encontrado'}
                </p>
                <Link
                    to="/catalogo"
                    className="px-6 py-3 border border-primary text-primary font-mono text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
                >
                    Volver al catálogo
                </Link>
            </div>
        )
    }

    const images = product.images?.length > 0 ? product.images : []
    const activeImg = images[activeImage] || null
    const sizes = product.sizes?.length > 0 ? product.sizes : []
    const selectedSize = activeSize ?? sizes[0] ?? 'Único'
    const colors = product.colors?.length > 0 ? product.colors : []
    const selectedColor = activeColor ?? colors[0] ?? 'default'
    const maxQty = product.stock > 0 ? product.stock : 1

    function handleAddToCart() {
        addItem(product, selectedColor, selectedSize, qty)
        setAdded(true)
        setQty(1)
        setTimeout(() => setAdded(false), 2000)
    }

    function handleAddWholesaleToCart() {
        addWholesaleItem(product, dozens)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div className="bg-background-dark min-h-screen text-slate-200 font-body antialiased selection:bg-primary selection:text-black">

            {/* ── Grid bg decorative ── */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '20px 20px',
                }}
                aria-hidden="true"
            />

            <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-10 py-8">

                {/* ── Breadcrumb ── */}
                <nav className="flex items-center gap-2 text-xs font-display tracking-widest text-tech-grey mb-8 uppercase" aria-label="Breadcrumb">
                    <Link to="/" className="hover:text-primary transition-colors">System</Link>
                    <span className="material-symbols-outlined text-[12px] text-primary">chevron_right</span>
                    <Link to="/catalogo" className="hover:text-primary transition-colors">Catálogo</Link>
                    <span className="material-symbols-outlined text-[12px] text-primary">chevron_right</span>
                    <span className="text-white truncate max-w-[200px]">{product.name}</span>
                </nav>

                {/* ── Main grid: Galería + Panel info ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

                    {/* ═══════════ GALERÍA DE IMÁGENES ═══════════ */}
                    <div className="lg:col-span-7 space-y-4">

                        {/* Imagen principal */}
                        <div
                            className="aspect-[4/5] w-full bg-surface overflow-hidden relative group border border-surface-light hover:border-primary/50 transition-colors"
                            style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)' }}
                        >
                            {/* Stock bajo badge */}
                            {product.stock !== null && product.stock <= 5 && (
                                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                    <span className={`px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider backdrop-blur-sm border
                                        ${product.stock === 0
                                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                        }`}>
                                        {product.stock === 0 ? 'Sin Stock' : `Últimas ${product.stock} unidades`}
                                    </span>
                                </div>
                            )}

                            {/* Imagen */}
                            {activeImg ? (
                                <div
                                    className="w-full h-full bg-center bg-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0"
                                    style={{ backgroundImage: `url(${activeImg})` }}
                                    role="img"
                                    aria-label={`${product.name} — vista ${activeImage + 1}`}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-700 text-8xl">image_not_supported</span>
                                </div>
                            )}

                            {/* Esquinas decorativas */}
                            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="w-2 h-2 border-t border-l border-primary" />
                                    <div className="w-2 h-2 border-t border-r border-primary" />
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="w-2 h-2 border-b border-l border-primary" />
                                    <div className="w-2 h-2 border-b border-r border-primary" />
                                </div>
                            </div>

                            {/* Scan overlay on hover */}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <span className="bg-black/80 backdrop-blur border border-primary/50 text-primary px-3 py-1 font-display text-xs uppercase tracking-widest">
                                    Scanning Texture...
                                </span>
                            </div>
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(idx)}
                                        aria-label={`Ver imagen ${idx + 1}`}
                                        className={`aspect-square bg-surface overflow-hidden border transition-all relative group ${activeImage === idx
                                                ? 'border-primary'
                                                : 'border-surface-light hover:border-tech-grey'
                                            }`}
                                    >
                                        <div
                                            className={`w-full h-full bg-center bg-cover transition-opacity ${activeImage === idx ? 'opacity-100' : 'opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0'
                                                }`}
                                            style={{ backgroundImage: `url(${img})` }}
                                        />
                                        {activeImage === idx && (
                                            <div className="absolute inset-0 bg-primary/10" />
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
                                <span className="material-symbols-outlined text-primary text-sm animate-pulse">wifi_tethering</span>
                                <span className="text-primary text-xs font-display font-bold uppercase tracking-widest">
                                    En Stock
                                </span>
                            </div>

                            {/* Nombre del producto */}
                            <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-2 leading-none uppercase tracking-tight">
                                {product.name}
                            </h1>

                            {/* Toggle Por Menor / Por Mayor (solo si el producto tiene precio mayorista) */}
                            {hasWholesale(product) && (
                                <div className="flex mt-4 border border-surface-light w-fit" role="tablist" aria-label="Modalidad de compra">
                                    {[
                                        { id: 'retail', label: 'Por Menor' },
                                        { id: 'wholesale', label: 'Por Mayor' },
                                    ].map(({ id, label }) => (
                                        <button
                                            key={id}
                                            role="tab"
                                            aria-selected={mode === id}
                                            onClick={() => setMode(id)}
                                            className={`px-5 py-2 text-xs font-display font-bold uppercase tracking-widest transition-colors ${mode === id
                                                    ? 'bg-primary text-black'
                                                    : 'bg-surface text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Precio + Stock */}
                            <div className="border-b border-surface-light pb-6 mb-6 mt-4">
                                <div className="flex items-end gap-6">
                                    <p className="text-3xl font-display font-medium text-primary">
                                        {mode === 'wholesale'
                                            ? formatWholesalePrice(product)
                                            : (product.price_on_request ? 'Consultar precio' : `$${Number(product.retail_price).toFixed(2)}`)}
                                    </p>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-mono uppercase tracking-wide ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                                        </span>
                                    </div>
                                </div>
                                {mode === 'wholesale' && (
                                    <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wide mt-1">
                                        Precio por docena · 12 unidades
                                    </p>
                                )}
                            </div>

                            {/* Descripción */}
                            {product.description && (
                                <div className="mb-8 p-4 bg-surface border border-surface-light relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1 pointer-events-none">
                                        <span className="material-symbols-outlined text-surface-light text-4xl opacity-20">science</span>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed font-light">
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {/* ── Selector de talla (real, cargado desde el producto) ── */}
                            {sizes.length > 0 && mode === 'retail' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Size Configuration
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
                                                    className={`h-10 min-w-10 px-3 border relative overflow-hidden flex items-center justify-center text-xs font-display font-bold transition-all
                                                        ${isActive
                                                            ? 'border-primary bg-primary/10 text-primary shadow-neon-sm'
                                                            : 'border-surface-light bg-surface hover:bg-surface-light hover:border-primary/50 text-slate-300 hover:text-white'
                                                        }`}
                                                >
                                                    {isActive && (
                                                        <>
                                                            <span className="absolute top-0 right-0 w-1 h-1 bg-primary" />
                                                            <span className="absolute bottom-0 left-0 w-1 h-1 bg-primary" />
                                                        </>
                                                    )}
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
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Talles disponibles
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sizes.map(label => (
                                            <span
                                                key={label}
                                                aria-label={`Talla disponible ${label}`}
                                                className="h-10 min-w-10 px-3 border border-surface-light bg-surface flex items-center justify-center text-xs font-display font-bold text-slate-300"
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
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Color Configuration
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {colors.map(hex => {
                                            const isActive = selectedColor === hex
                                            return (
                                                <button
                                                    key={hex}
                                                    onClick={() => setActiveColor(hex)}
                                                    title={hex}
                                                    aria-label={`Color ${hex}`}
                                                    aria-pressed={isActive}
                                                    className={`w-8 h-8 relative transition-all ${isActive
                                                            ? 'border-2 border-primary shadow-neon-sm scale-110'
                                                            : 'border border-surface-light hover:border-primary/50'
                                                        }`}
                                                    style={{ background: hex }}
                                                >
                                                    {isActive && (
                                                        <>
                                                            <span className="absolute top-0 right-0 w-1 h-1 bg-primary" />
                                                            <span className="absolute bottom-0 left-0 w-1 h-1 bg-primary" />
                                                        </>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Colores disponibles (solo informativo, modo Por Mayor) ── */}
                            {colors.length > 0 && mode === 'wholesale' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Color Configuration
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {colors.map(hex => (
                                            <span
                                                key={hex}
                                                title={hex}
                                                aria-label={`Color disponible: ${hex}`}
                                                className="w-8 h-8 border border-surface-light"
                                                style={{ background: hex }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Cantidad (modo Por Menor) ── */}
                            {mode === 'retail' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Cantidad
                                        </span>
                                    </div>
                                    <div className="flex items-center border border-surface-light bg-surface w-fit">
                                        <button
                                            onClick={() => setQty(q => Math.max(1, q - 1))}
                                            disabled={qty <= 1}
                                            aria-label="Reducir cantidad"
                                            className="px-4 py-2 text-slate-400 hover:text-white hover:bg-surface-light transition-colors text-sm font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            −
                                        </button>
                                        <span className="px-4 py-2 text-sm font-bold text-white font-mono min-w-10 text-center">{qty}</span>
                                        <button
                                            onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                                            disabled={qty >= maxQty}
                                            aria-label="Aumentar cantidad"
                                            className="px-4 py-2 text-slate-400 hover:text-white hover:bg-surface-light transition-colors text-sm font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Cantidad de docenas (modo Por Mayor) ── */}
                            {mode === 'wholesale' && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Cantidad de docenas
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={dozens}
                                        onChange={e => setDozens(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        aria-label="Cantidad de docenas"
                                        className="w-28 h-10 px-3 bg-surface border border-surface-light text-slate-200 font-mono text-sm focus:outline-none focus:border-primary"
                                    />
                                </div>
                            )}

                            {/* ── Dimensiones de la docena (si el producto las tiene cargadas) ── */}
                            {mode === 'wholesale' && hasDozenDimensions(product) && (
                                <div className="mb-8 border border-surface-light bg-surface/50 px-4 py-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-tech-grey text-lg">inventory_2</span>
                                        <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                            Dimensiones de la docena
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {getDozenDimensionEntries(product).map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="flex flex-col items-center justify-center bg-surface border border-surface-light py-2 px-1"
                                            >
                                                <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mb-1">
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

                                {/* Botón principal — Add to Cart */}
                                {mode === 'wholesale' ? (
                                    <button
                                        onClick={handleAddWholesaleToCart}
                                        disabled={!isWholesalePurchasable(product) || dozens < 1}
                                        id="add-to-cart-wholesale-btn"
                                        className={`w-full h-14 font-display font-bold text-lg transition-all transform active:scale-[0.99] flex items-center justify-between px-8 group relative overflow-hidden
                                            ${!isWholesalePurchasable(product) || dozens < 1
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                : added
                                                    ? 'bg-green-500 text-black'
                                                    : 'bg-primary hover:bg-white text-black'
                                            }`}
                                        style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)' }}
                                    >
                                        {isWholesalePurchasable(product) && !added && (
                                            <div className="absolute inset-0 bg-white translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 z-0" />
                                        )}
                                        <span className="z-10 flex items-center gap-2">
                                            {added ? (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                    AGREGADO
                                                </>
                                            ) : product.stock === 0 ? (
                                                'SIN STOCK'
                                            ) : (
                                                <>
                                                    AGREGAR {dozens} DOCENA{dozens === 1 ? '' : 'S'}
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </>
                                            )}
                                        </span>
                                        <span className="z-10 font-mono text-sm">
                                            ${(Number(product.wholesale_price) * dozens).toFixed(2)}
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={!isPurchasable(product)}
                                        id="add-to-cart-btn"
                                        className={`w-full h-14 font-display font-bold text-lg transition-all transform active:scale-[0.99] flex items-center justify-between px-8 group relative overflow-hidden
                                            ${!isPurchasable(product)
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                : added
                                                    ? 'bg-green-500 text-black'
                                                    : 'bg-primary hover:bg-white text-black'
                                            }`}
                                        style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)' }}
                                    >
                                        {isPurchasable(product) && !added && (
                                            <div className="absolute inset-0 bg-white translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 z-0" />
                                        )}
                                        <span className="z-10 flex items-center gap-2">
                                            {added ? (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                    AGREGADO
                                                </>
                                            ) : product.price_on_request ? (
                                                'CONSULTAR PRECIO'
                                            ) : product.stock === 0 ? (
                                                'SIN STOCK'
                                            ) : (
                                                <>
                                                    INITIATE PURCHASE
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </>
                                            )}
                                        </span>
                                        {!product.price_on_request && <span className="z-10 font-mono text-sm">${Number(product.retail_price).toFixed(2)}</span>}
                                    </button>
                                )}

                                {/* Botón secundario — Ver catálogo */}
                                <Link
                                    to="/catalogo"
                                    className="w-full h-12 bg-transparent border border-tech-grey text-tech-grey hover:border-primary hover:text-primary font-display text-sm tracking-wider transition-colors flex items-center justify-center gap-2 uppercase"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)' }}
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                    Ver más productos
                                </Link>
                            </div>

                            {/* ── Tabs de especificaciones ── */}
                            <div className="border-t border-surface-light">
                                <div className="flex gap-6 mb-4 border-b border-surface-light" role="tablist">
                                    {TABS.map(({ id, label }) => (
                                        <button
                                            key={id}
                                            role="tab"
                                            aria-selected={activeTab === id}
                                            onClick={() => setActiveTab(id)}
                                            className={`py-3 text-xs font-display font-bold uppercase tracking-widest transition-colors ${activeTab === id
                                                    ? 'text-primary border-b-2 border-primary'
                                                    : 'text-slate-500 hover:text-slate-300'
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
                                            ['Stock disponible', product.stock],
                                        ].map(([key, value]) => (
                                            <div
                                                key={key}
                                                className="flex justify-between items-center text-sm border-b border-surface-light/50 pb-2 border-dashed last:border-none"
                                            >
                                                <span className="text-slate-500 font-mono text-xs uppercase">{key}</span>
                                                <span className="text-slate-300 font-medium text-right">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'logistics' && (
                                    <div className="py-4 space-y-3" role="tabpanel">
                                        {[
                                            ['Shipping', 'Gratis en pedidos mayores a $5000'],
                                            ['Delivery', '3–5 días hábiles'],
                                            ['Returns', '30 días de devolución'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between text-sm border-b border-surface-light/50 pb-2 border-dashed last:border-none">
                                                <span className="text-slate-500 font-mono text-xs uppercase">{k}</span>
                                                <span className="text-slate-300 text-right">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'care' && (
                                    <div className="py-4 space-y-3" role="tabpanel">
                                        {[
                                            ['Wash', 'Lavar a mano o ciclo delicado'],
                                            ['Dry', 'Colgar para secar'],
                                            ['Iron', 'No planchar directamente'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between text-sm border-b border-surface-light/50 pb-2 border-dashed last:border-none">
                                                <span className="text-slate-500 font-mono text-xs uppercase">{k}</span>
                                                <span className="text-slate-300 text-right">{v}</span>
                                            </div>
                                        ))}
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
