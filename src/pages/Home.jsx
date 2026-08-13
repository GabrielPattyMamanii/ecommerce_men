import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/productPricing'
import { useHomeBannerSettings } from '../hooks/useHomeBannerSettings'
import { useContactSettings } from '../hooks/useContactSettings'
import ProductCard from '../components/ProductCard'

export default function Home() {
    const [products, setProducts] = useState([])
    const [novedades, setNovedades] = useState([])
    const [loading, setLoading] = useState(true)
    const { addItem } = useCart()
    const banner = useHomeBannerSettings()
    const contactSettings = useContactSettings()


    useEffect(() => {
        async function fetchAll() {
            const [mainRes, novRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, name, description, retail_price, price_on_request, stock, unlimited_stock, images')
                    .eq('visible', true)
                    .order('created_at', { ascending: false })
                    .limit(8),
                supabase
                    .from('products')
                    .select('id, name, retail_price, price_on_request, images')
                    .eq('visible', true)
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
            className="relative min-h-screen bg-background text-primary font-body antialiased selection:bg-black/10 selection:text-primary overflow-x-hidden"
        >
            {/* ── Grid pattern ── */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'linear-gradient(to right, #e2e2e4 1px, transparent 1px), linear-gradient(to bottom, #e2e2e4 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0
                }}
                aria-hidden="true"
            />
            {/* ══ HERO BANNER — full-bleed, fuera del contenedor max-w del <main> ══
                 Altura y tipografía escalan desde mobile (menos scroll antes de
                 llegar a producto) hasta desktop, en vez de forzar 600px+text-6xl
                 en pantallas de 360px. ══ */}
            <section className="relative z-10 w-full min-h-[440px] sm:min-h-[540px] md:min-h-[800px] flex items-center bg-primary overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div
                        className="w-full h-full opacity-60 bg-cover bg-center"
                        style={{ backgroundImage: `url("${banner.image_url}")` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
                </div>
                <div className="relative z-10 px-4 md:px-10 lg:px-16 w-full max-w-[1600px] mx-auto py-12 md:py-0">
                    {/* En mobile el texto va centrado (título, descripción y botones);
                        desde sm vuelve al layout original alineado a la izquierda,
                        pensado para convivir con el degradado de la imagen de fondo. */}
                    <div className="max-w-2xl mx-auto sm:mx-0 text-center sm:text-left">
                        <p className="font-mono text-xs text-on-primary opacity-80 mb-3 tracking-[0.2em] uppercase">
                            {banner.eyebrow}
                        </p>
                        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.95] sm:leading-[0.9] uppercase tracking-tighter mb-5 text-on-primary">
                            {banner.headline_line1}<br />
                            <span className="text-stroke">{banner.headline_line2}</span>
                        </h1>
                        <p className="text-on-primary/80 mb-8 max-w-lg mx-auto sm:mx-0 text-sm sm:text-base leading-relaxed">
                            {banner.description}
                        </p>
                        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center sm:justify-start">
                            <Link
                                to={banner.cta_primary_link}
                                className="inline-flex items-center gap-2 bg-on-primary text-primary px-6 py-3.5 sm:px-10 sm:py-4 font-display font-bold uppercase tracking-widest transition-all hover:bg-surface-container text-sm sm:text-base"
                            >
                                {banner.cta_primary_text}
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </Link>
                            {banner.cta_secondary_text && (
                                <Link
                                    to={banner.cta_secondary_link || '/catalogo'}
                                    className="inline-flex items-center border border-on-primary text-on-primary px-6 py-3.5 sm:px-10 sm:py-4 font-display font-bold uppercase tracking-widest transition-all hover:bg-on-primary hover:text-primary text-sm sm:text-base"
                                >
                                    {banner.cta_secondary_text}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <main className="relative z-10 flex flex-col gap-16 pt-16 pb-8 w-full max-w-[1600px] mx-auto">

                {/* ══ NOVEDADES — carrusel horizontal drag-to-scroll ══ */}
                <div className="flex flex-col gap-6">
                    {/* Encabezado */}
                    <div className="px-4 md:px-10 lg:px-40 flex items-end justify-between border-b border-border pb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-primary font-mono text-xs uppercase tracking-widest">// NUEVAS ENTRADAS</span>
                            <h2 className="text-primary font-display uppercase tracking-wider text-3xl font-bold leading-tight">
                                Novedades
                            </h2>
                        </div>
                        <Link
                            to="/catalogo"
                            className="text-muted hover:text-primary text-xs font-mono uppercase tracking-widest flex items-center gap-2 group transition-colors"
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
                        <div className="px-4 md:px-10 lg:px-40 py-12 text-center border border-dashed border-border mx-4 md:mx-10 lg:mx-40 bg-surface-container/50">
                            <p className="text-sm font-mono text-muted uppercase">Sin novedades disponibles</p>
                        </div>
                    ) : (
                        <div
                            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pl-4 md:pl-10 lg:pl-40 pr-4 md:pr-10 lg:pr-40 pb-2"
                        >
                            {novedades.map((product, i) => {
                                const imgUrl = product.images?.[0] || null
                                return (
                                    <Link
                                        key={product.id}
                                        to={`/producto/${product.id}`}
                                        className="group flex-shrink-0 w-40 sm:w-44 snap-start flex flex-col bg-surface border border-border hover:border-primary/50 transition-all duration-300 relative"
                                    >
                                        {/* Badge NEW en los primeros 3 */}
                                        {i < 3 && (
                                            <div className="absolute top-0 left-0 bg-primary text-white text-[9px] font-bold font-mono px-2 py-0.5 z-20 uppercase">
                                                NEW
                                            </div>
                                        )}

                                        {/* Imagen */}
                                        <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-container">
                                            {imgUrl ? (
                                                <div
                                                    className="w-full h-full bg-center bg-no-repeat bg-contain transition-transform duration-500 group-hover:scale-105"
                                                    style={{ backgroundImage: `url(${imgUrl})` }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-outline text-4xl">image_not_supported</span>
                                                </div>
                                            )}
                                            {/* Esquinas hover */}
                                            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 flex flex-col gap-1">
                                            <h3 className="text-primary text-sm font-display font-bold uppercase leading-tight tracking-wide group-hover:text-primary transition-colors truncate">
                                                {product.name}
                                            </h3>

                                            <p className="text-primary font-display font-bold text-sm mt-1">
                                                {formatPrice(product)}
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
                    <div className="flex items-end justify-between border-b border-border pb-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-primary font-display uppercase tracking-wider text-3xl font-bold leading-tight">
                                Performance Gear
                            </h2>
                        </div>
                        <Link
                            to="/catalogo"
                            className="text-muted hover:text-primary text-xs font-mono uppercase tracking-widest flex items-center gap-2 group transition-colors"
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
                        <div className="py-24 text-center border border-dashed border-border bg-surface-container/50">
                            <span className="material-symbols-outlined text-4xl text-outline mb-4 block">inventory_2</span>
                            <p className="text-sm font-mono text-muted uppercase">Sin productos en la base de datos</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.slice(0, 4).map((product, i) => (
                                <ProductCard key={product.id} product={product} onAdd={addItem} contactSettings={contactSettings} badge={i === 0 ? 'NEW' : null} />
                            ))}
                        </div>
                    )}
                </section>

                {/* ══ SECTOR 02: Technical Gear ══ */}
                {!loading && products.length > 4 && (
                    <section className="flex flex-col gap-8 pt-8 relative px-4 md:px-10 lg:px-40">
                        <div className="absolute -left-[100px] top-1/2 -rotate-90 text-black/5 text-9xl font-black font-display pointer-events-none uppercase hidden xl:block">
                            Technical
                        </div>
                        <div className="flex items-end justify-between border-b border-border pb-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-primary font-display uppercase tracking-wider text-3xl font-bold leading-tight">
                                    Technical Gear
                                </h2>
                            </div>
                            <Link
                                to="/catalogo"
                                className="text-muted hover:text-primary text-xs font-mono uppercase tracking-widest flex items-center gap-2 group transition-colors"
                            >
                                Ver todo
                                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                                    chevron_right
                                </span>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.slice(4, 8).map((product, i) => (
                                <ProductCard key={product.id} product={product} onAdd={addItem} contactSettings={contactSettings} badge={i === 1 ? 'LIMITED' : null} />
                            ))}
                        </div>
                    </section>
                )}

            </main>
        </div>
    )
}
