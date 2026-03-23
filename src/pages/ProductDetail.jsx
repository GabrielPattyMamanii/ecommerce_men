import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabaseClient'

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
    const [activeColor, setActiveColor] = useState('default')
    const [activeSize, setActiveSize] = useState('M')
    const [activeTab, setActiveTab] = useState('specs')
    const [added, setAdded] = useState(false)

    const { addItem } = useCart()

    useEffect(() => {
        async function fetchProduct() {
            setLoading(true)
            setError(null)
            const { data, error: err } = await supabase
                .from('products')
                .select('id, name, description, price, stock, images')
                .eq('id', id)
                .single()
            if (err) setError(err.message)
            else setProduct(data)
            setLoading(false)
        }
        if (id) fetchProduct()
    }, [id])

    function handleAddToCart() {
        if (!product) return
        addItem(product, activeColor, activeSize)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    const TABS = [
        { id: 'specs', label: 'Tech Specs' },
        { id: 'logistics', label: 'Logistics' },
        { id: 'care', label: 'Care Protocol' },
    ]

    const SIZES = ['XS', 'S', 'M', 'L', 'XL']

    /* ── Estados de carga ── */
    if (loading) {
        return (
            <div className="bg-[#050505] min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="bg-[#050505] min-h-screen flex flex-col items-center justify-center gap-6 px-4">
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

                            {/* Precio + Stock */}
                            <div className="flex items-end gap-6 mb-6 border-b border-surface-light pb-6 mt-4">
                                <p className="text-3xl font-display font-medium text-primary">
                                    ${Number(product.price).toFixed(2)}
                                </p>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-mono uppercase tracking-wide ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                                    </span>
                                </div>
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

                            {/* ── Selector de talla ── */}
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">
                                        Size Configuration
                                    </span>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {SIZES.map(label => {
                                        const isActive = activeSize === label
                                        return (
                                            <button
                                                key={label}
                                                onClick={() => setActiveSize(label)}
                                                aria-label={`Talla ${label}`}
                                                className={`h-10 border relative overflow-hidden flex items-center justify-center text-xs font-display font-bold transition-all
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

                            {/* ── CTAs ── */}
                            <div className="flex flex-col gap-4 mb-8">

                                {/* Botón principal — Add to Cart */}
                                <button
                                    onClick={handleAddToCart}
                                    disabled={product.stock === 0}
                                    id="add-to-cart-btn"
                                    className={`w-full h-14 font-display font-bold text-lg transition-all transform active:scale-[0.99] flex items-center justify-between px-8 group relative overflow-hidden
                                        ${product.stock === 0
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : added
                                                ? 'bg-green-500 text-black'
                                                : 'bg-primary hover:bg-white text-black'
                                        }`}
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)' }}
                                >
                                    {product.stock !== 0 && !added && (
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
                                                INITIATE PURCHASE
                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </>
                                        )}
                                    </span>
                                    <span className="z-10 font-mono text-sm">${Number(product.price).toFixed(2)}</span>
                                </button>

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
                                            ['Precio', `$${Number(product.price).toFixed(2)}`],
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
