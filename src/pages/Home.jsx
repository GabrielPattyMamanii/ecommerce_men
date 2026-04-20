import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useCart } from '../context/CartContext'

export default function Home() {
    const [products, setProducts] = useState([])
    const [novedades, setNovedades] = useState([])
    const [loading, setLoading] = useState(true)
    const { addItem } = useCart()

    // ── Drag-to-scroll para el carrusel de novedades ──
    const scrollRef = useRef(null)
    const isDragging = useRef(false)
    const startX = useRef(0)
    const scrollLeft = useRef(0)

    function onMouseDown(e) {
        isDragging.current = true
        startX.current = e.pageX - scrollRef.current.offsetLeft
        scrollLeft.current = scrollRef.current.scrollLeft
        scrollRef.current.style.cursor = 'grabbing'
    }
    function onMouseUp() {
        isDragging.current = false
        if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
    }
    function onMouseMove(e) {
        if (!isDragging.current) return
        e.preventDefault()
        const x = e.pageX - scrollRef.current.offsetLeft
        const walk = (x - startX.current) * 1.5
        scrollRef.current.scrollLeft = scrollLeft.current - walk
    }

    useEffect(() => {
        async function fetchAll() {
            const [mainRes, novRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, name, description, price, stock, images')
                    .order('created_at', { ascending: false })
                    .limit(8),
                supabase
                    .from('products')
                    .select('id, name, price, images')
                    .order('created_at', { ascending: false })
                    .limit(12),
            ])
            setProducts(mainRes.data || [])
            setNovedades(novRes.data || [])
            setLoading(false)
        }
        fetchAll()
    }, [])

    return (
        <div
            className="relative min-h-screen bg-[#0a0a0a] text-[#e7edf3] font-body antialiased selection:bg-primary/30 selection:text-primary overflow-x-hidden"
            style={{
                backgroundImage: "url('/noise.svg')",
                backgroundSize: "150px 150px"
            }}
        >
            {/* ── Grid pattern ── */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'linear-gradient(to right, #262626 1px, transparent 1px), linear-gradient(to bottom, #262626 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.05
                }}
                aria-hidden="true"
            />
            <main className="relative z-10 flex flex-col gap-16 py-8 w-full max-w-[1600px] mx-auto">

                {/* ══ HERO BANNER ══ */}
                <div className="px-4 md:px-10 lg:px-40">
                    <div className="tech-border bg-[#121212]/30 p-1">
                        <div
                            className="group relative flex min-h-[500px] flex-col items-start justify-end overflow-hidden border border-white/10 px-8 pb-12 md:px-16 md:pb-20 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: 'linear-gradient(rgba(10, 10, 10, 0.2) 0%, rgba(10, 10, 10, 0.9) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuA_9NRPfEgpDNtB65uyhYqwPS6t6wAjgKX4fu2aF-OGpFOBnKT0XfE2Hv5U7P4jVoKBNZ8sHPKuIxbgZ3xsg26w2SMvSUqRf67N_CDIct8k1Fb-LiePUYIt2y1FVn984wM4YupjE7miiZEsWyCTTD4LIYM_YAcvoF8hG3cjnUtu9BVK5g21zl3wvkraOKA8NxD2jvolRH1qMf2NaZcXOo85X-ahXdUrP3cWssdT2W8AaOx_Df7lQM2n0_3FFNd08XNe677bCI_kzosO")'
                            }}
                        >
                            <div className="absolute inset-0 bg-primary/5 mix-blend-overlay"></div>

                            {/* Decorative marks */}
                            <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-1 opacity-60">
                                <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Sys.Ready</span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 bg-primary"></div>
                                    <div className="w-1 h-1 bg-white/20"></div>
                                    <div className="w-1 h-1 bg-white/20"></div>
                                </div>
                            </div>

                            {/* Texto hero */}
                            <div className="relative flex flex-col gap-4 text-left max-w-3xl z-10">
                                <h1 className="text-white text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.85] tracking-tighter uppercase italic">
                                    Indumentaria<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
                                        Masculina
                                    </span>
                                </h1>
                                <p className="text-slate-300 font-mono text-xs uppercase tracking-wide border-l-2 border-primary/50 pl-4 mt-2 leading-relaxed">
                                    La mejor calidad en indumentaria masculina.<br />
                                    Ropa de invierno y verano.<br />
                                    Los mejores estilos.<br />
                                    Los mejores precios.<br />
                                </p>
                                <Link
                                    to="/catalogo"
                                    className="relative mt-8 group overflow-hidden inline-flex bg-white text-black px-8 py-4 font-display font-bold uppercase tracking-widest hover:text-black transition-all items-center gap-2"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
                                >
                                    <div className="absolute inset-0 w-full h-full bg-primary -translate-x-full -skew-x-[15deg] group-hover:translate-x-0 transition-transform duration-300 z-0" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        Ver Catálogo
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ NOVEDADES — carrusel horizontal drag-to-scroll ══ */}
                <div className="flex flex-col gap-6">
                    {/* Encabezado */}
                    <div className="px-4 md:px-10 lg:px-40 flex items-end justify-between border-b border-white/10 pb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-primary font-mono text-xs uppercase tracking-widest">// NUEVAS ENTRADAS</span>
                            <h2 className="text-white font-display uppercase tracking-wider text-3xl font-bold leading-tight">
                                Novedades
                            </h2>
                        </div>
                        <Link
                            to="/catalogo"
                            className="text-slate-400 hover:text-primary text-xs font-mono uppercase tracking-widest flex items-center gap-2 group transition-colors"
                        >
                            Ver todo
                            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                                chevron_right
                            </span>
                        </Link>
                    </div>

                    {/* Carrusel */}
                    {loading ? (
                        <div className="px-4 md:px-10 lg:px-40 flex justify-center py-16">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                        </div>
                    ) : novedades.length === 0 ? (
                        <div className="px-4 md:px-10 lg:px-40 py-12 text-center border border-dashed border-white/10 mx-4 md:mx-10 lg:mx-40 bg-[#121212]/30">
                            <p className="text-sm font-mono text-slate-500 uppercase">Sin novedades disponibles</p>
                        </div>
                    ) : (
                        <div
                            ref={scrollRef}
                            className="flex gap-4 overflow-x-auto scrollbar-hide pl-4 md:pl-10 lg:pl-40 pr-4 md:pr-10 lg:pr-40 pb-2"
                            style={{ cursor: 'grab', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onMouseDown={onMouseDown}
                            onMouseUp={onMouseUp}
                            onMouseLeave={onMouseUp}
                            onMouseMove={onMouseMove}
                        >
                            {novedades.map((product, i) => {
                                const imgUrl = product.images?.[0] || null
                                return (
                                    <Link
                                        key={product.id}
                                        to={`/producto/${product.id}`}
                                        draggable={false}
                                        className="group flex-shrink-0 w-44 flex flex-col bg-[#171717] border border-white/5 hover:border-primary/50 transition-all duration-300 relative"
                                    >
                                        {/* Badge NEW en los primeros 3 */}
                                        {i < 3 && (
                                            <div className="absolute top-0 left-0 bg-primary text-black text-[9px] font-bold font-mono px-2 py-0.5 z-20 uppercase">
                                                NEW
                                            </div>
                                        )}

                                        {/* Imagen */}
                                        <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#121212]">
                                            {imgUrl ? (
                                                <div
                                                    className="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                                                    style={{ backgroundImage: `url(${imgUrl})` }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-700 text-4xl">image_not_supported</span>
                                                </div>
                                            )}
                                            {/* Esquinas hover */}
                                            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 flex flex-col gap-1">
                                            <h3 className="text-white text-sm font-display font-bold uppercase leading-tight tracking-wide group-hover:text-primary transition-colors truncate">
                                                {product.name}
                                            </h3>

                                            <p className="text-primary font-display font-bold text-sm mt-1">
                                                ${Number(product.price).toFixed(2)}
                                            </p>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ══ SECTOR 01: Performance Gear ══ */}
                <section className="flex flex-col gap-8 px-4 md:px-10 lg:px-40">
                    <div className="flex items-end justify-between border-b border-white/10 pb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-primary font-mono text-xs uppercase tracking-widest">Sector 01</span>
                            <h2 className="text-white font-display uppercase tracking-wider text-3xl font-bold leading-tight">
                                Performance Gear
                            </h2>
                        </div>
                        <Link
                            to="/catalogo"
                            className="text-slate-400 hover:text-primary text-xs font-mono uppercase tracking-widest flex items-center gap-2 group transition-colors"
                        >
                            Ver todo
                            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                                chevron_right
                            </span>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-24">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="py-24 text-center border border-dashed border-white/10 bg-[#121212]/30">
                            <span className="material-symbols-outlined text-4xl text-slate-600 mb-4 block">inventory_2</span>
                            <p className="text-sm font-mono text-slate-500 uppercase">Sin productos en la base de datos</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.slice(0, 4).map((product, i) => (
                                <ProductCard key={product.id} product={product} onAdd={addItem} badge={i === 0 ? 'NEW' : null} />
                            ))}
                        </div>
                    )}
                </section>

                {/* ══ SECTOR 02: Technical Gear ══ */}
                {!loading && products.length > 4 && (
                    <section className="flex flex-col gap-8 pt-8 relative px-4 md:px-10 lg:px-40">
                        <div className="absolute -left-[100px] top-1/2 -rotate-90 text-white/5 text-9xl font-black font-display pointer-events-none uppercase hidden xl:block">
                            Technical
                        </div>
                        <div className="flex items-end justify-between border-b border-white/10 pb-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-primary font-mono text-xs uppercase tracking-widest">Sector 02</span>
                                <h2 className="text-white font-display uppercase tracking-wider text-3xl font-bold leading-tight">
                                    Technical Gear
                                </h2>
                            </div>
                            <Link
                                to="/catalogo"
                                className="text-slate-400 hover:text-primary text-xs font-mono uppercase tracking-widest flex items-center gap-2 group transition-colors"
                            >
                                Ver todo
                                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                                    chevron_right
                                </span>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.slice(4, 8).map((product, i) => (
                                <ProductCard key={product.id} product={product} onAdd={addItem} badge={i === 1 ? 'LIMITED' : null} />
                            ))}
                        </div>
                    </section>
                )}

            </main>
        </div>
    )
}

/* ── Tarjeta de producto ── */
function ProductCard({ product, onAdd, badge }) {
    const imgUrl = product.images?.[0] || null

    return (
        <div className="group flex flex-col bg-[#171717] border border-white/5 hover:border-primary/50 transition-all duration-300 relative">
            {badge && (
                <div className={`absolute top-0 left-0 text-[10px] font-bold font-mono px-2 py-0.5 z-20 uppercase
                    ${badge === 'NEW' ? 'bg-primary text-black' : 'bg-primary/20 backdrop-blur border border-primary/50 text-primary'}`}>
                    {badge}
                </div>
            )}

            <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#121212] group-hover:opacity-90 transition-opacity">
                {imgUrl ? (
                    <div
                        className="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                        style={{ backgroundImage: `url(${imgUrl})` }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-700 text-6xl">image_not_supported</span>
                    </div>
                )}
                <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-all pointer-events-none">
                    <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            <div className="flex flex-col gap-1 p-4 bg-[#171717]">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white text-base font-display font-bold uppercase leading-none tracking-wide group-hover:text-primary transition-colors">
                            {product.name}
                        </h3>
                        <p className="text-slate-500 font-mono text-[10px] uppercase mt-1 truncate max-w-[140px]">
                            {product.description?.substring(0, 24) || '—'}
                        </p>
                    </div>
                    <p className="text-primary text-base font-display font-bold whitespace-nowrap">
                        ${Number(product.price).toFixed(2)}
                    </p>
                </div>
                <div className="flex gap-2 mt-3">
                    <Link
                        to={`/producto/${product.id}`}
                        className="flex-1 h-10 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    >
                        Detail
                    </Link>
                    <button
                        onClick={() => onAdd(product, 'default', 'M')}
                        className="flex-1 h-10 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                        Add
                    </button>
                </div>
            </div>
        </div>
    )
}
