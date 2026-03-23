import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabaseClient'

export default function Catalogo() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { addItem } = useCart()

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true)
            const { data, error: err } = await supabase
                .from('products')
                .select('id, name, description, price, stock, images')
                .order('created_at', { ascending: false })
            if (err) setError(err.message)
            else setProducts(data ?? [])
            setLoading(false)
        }
        fetchProducts()
    }, [])

    const filtered = products

    return (
        <div className="min-h-screen bg-transparent text-slate-200">
            <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

                {/* ── Encabezado ── */}
                <div className="mb-8 border-b border-[#1a1a2e] pb-6">
                    <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.3em] mb-2">
                        // KINETIC_ARCHIVE
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                        PRODUCT_<span className="text-[#00f0ff]">ARCHIVE</span>
                    </h1>
                    <div className="flex gap-6 mt-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        <span>TOTAL_UNITS // {products.length}</span>
                        <span>SORT_ORDER // CHRONO</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ── Sidebar Filtros ── */}
                    <aside className="lg:w-56 flex-shrink-0">
                        <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-4">
                            // FILTERS - SEC_01
                        </p>
                        <div className="space-y-2">
                            <div className="px-4 py-3 border border-[#00f0ff] bg-[#00f0ff08] text-[#00f0ff] font-mono text-xs uppercase tracking-wider flex items-center gap-3">
                                <span className="material-symbols-outlined text-sm">apps</span>
                                ALL
                            </div>
                        </div>

                        {/* Status ── */}
                        <div className="mt-6 border border-[#1a1a2e] p-4">
                            <p className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-widest mb-3">SYSTEM_STATUS</p>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="font-mono text-[9px] text-green-400 uppercase tracking-widest">ONLINE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff]" />
                                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">DB_CONNECTED</span>
                            </div>
                        </div>
                    </aside>

                    {/* ── Grid de Productos ── */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center items-center py-32">
                                <span className="material-symbols-outlined animate-spin text-[#00f0ff] text-4xl">progress_activity</span>
                            </div>
                        ) : error ? (
                            <div className="border border-red-500/30 bg-red-500/10 p-6 text-red-400 font-mono text-sm">
                                Error: {error}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4 border border-dashed border-[#1a1a2e]">
                                <span className="material-symbols-outlined text-4xl text-slate-600">inventory_2</span>
                                <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">Sin productos disponibles</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
                                {filtered.map(product => {
                                    const imgUrl = product.images?.[0] || null
                                    return (
                                        <div
                                            key={product.id}
                                            className="group bg-[#0a0a0a] border border-[#1a1a2e] hover:border-[#00f0ff40] transition-all duration-300 flex flex-col"
                                        >
                                            {/* Imagen */}
                                            <div className="relative overflow-hidden aspect-[4/3] bg-[#111]">
                                                {imgUrl ? (
                                                    <img
                                                        src={imgUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-slate-700 text-5xl">image_not_supported</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="p-5 flex flex-col gap-3 flex-1">
                                                <h2 className="text-sm font-black uppercase tracking-wider text-white group-hover:text-[#00f0ff] transition-colors">
                                                    {product.name}
                                                </h2>
                                                <p className="text-xs text-slate-500 font-mono leading-relaxed flex-1">
                                                    {product.description || '—'}
                                                </p>
                                                <div className="flex items-center justify-between pt-3 border-t border-[#1a1a2e]">
                                                    <span className="font-mono text-lg font-bold text-[#00f0ff]">
                                                        ${Number(product.price).toFixed(2)}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <Link
                                                            to={`/producto/${product.id}`}
                                                            className="px-3 py-2 border border-[#1a1a2e] hover:border-[#00f0ff] text-slate-400 hover:text-[#00f0ff] font-mono text-[10px] uppercase tracking-widest transition-all"
                                                        >
                                                            DETAIL
                                                        </Link>
                                                        <button
                                                            onClick={() => addItem(product, 'default', 'M')}
                                                            className="px-4 py-2 bg-[#00f0ff] text-black hover:bg-[#00d4e0] font-black font-mono text-[10px] uppercase tracking-widest transition-all"
                                                        >
                                                            ADD +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
