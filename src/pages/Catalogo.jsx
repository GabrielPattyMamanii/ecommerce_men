import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabaseClient'
import { formatPrice, isPurchasable } from '../lib/productPricing'

export default function Catalogo() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { addItem } = useCart()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeSlug = searchParams.get('categoria') || ''

    /* ─ Expand/collapse de categorías padre en el sidebar ─ */
    const [expandedIds, setExpandedIds] = useState(new Set())

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true)
            const { data, error: err } = await supabase
                .from('products')
                .select('id, name, description, retail_price, price_on_request, stock, images, category_id, categories(name, slug)')
                .eq('visible', true)
                .order('created_at', { ascending: false })
            if (err) setError(err.message)
            else setProducts(data ?? [])
            setLoading(false)
        }
        async function fetchCategories() {
            const { data } = await supabase
                .from('categories')
                .select('id, name, slug, parent_id')
                .order('name', { ascending: true })
            setCategories(data ?? [])
        }
        fetchProducts()
        fetchCategories()
    }, [])

    /* ─ Árbol: categorías raíz + sus subcategorías ─ */
    const roots = categories.filter(c => !c.parent_id)
    const childrenOf = parentId => categories.filter(c => c.parent_id === parentId)
    const categoriesById = useMemo(
        () => Object.fromEntries(categories.map(c => [c.id, c])),
        [categories]
    )
    const activeCategory = categories.find(c => c.slug === activeSlug) || null

    /* Si la categoría activa (por URL o click) es una subcategoría, despliega a su padre */
    useEffect(() => {
        if (activeCategory?.parent_id) {
            setExpandedIds(prev => new Set(prev).add(activeCategory.parent_id))
        }
    }, [activeCategory])

    function toggleExpanded(id) {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function selectCategory(slug) {
        if (!slug) setSearchParams({})
        else setSearchParams({ categoria: slug })
    }

    // Elegir una categoría padre incluye los productos de sus subcategorías;
    // un slug en la URL que no matchea ninguna categoría real no cae a "ALL" (evita
    // mostrar todo el catálogo silenciosamente ante un link roto/desactualizado).
    const filtered = activeSlug
        ? products.filter(p => {
            if (!activeCategory) return false
            const cat = categoriesById[p.category_id]
            if (!cat) return false
            return cat.id === activeCategory.id || cat.parent_id === activeCategory.id
        })
        : products

    return (
        <div className="min-h-screen bg-transparent text-slate-200">
            <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

                {/* ── Encabezado ── */}
                <div className="mb-8 border-b border-[#333b49] pb-6">
                    <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.3em] mb-2">
                        // KINETIC_ARCHIVE
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                        PRODUCT_<span className="text-[#00f0ff]">ARCHIVE</span>
                    </h1>
                    <div className="flex gap-6 mt-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        <span>TOTAL_UNITS // {filtered.length}</span>
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
                            <button
                                onClick={() => selectCategory('')}
                                className={`w-full text-left px-4 py-3 border font-mono text-xs uppercase tracking-wider flex items-center gap-3 transition-colors ${
                                    activeSlug === ''
                                        ? 'border-[#00f0ff] bg-[#00f0ff08] text-[#00f0ff]'
                                        : 'border-[#333b49] text-slate-400 hover:border-[#00f0ff40] hover:text-slate-200'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">apps</span>
                                ALL
                            </button>

                            {roots.map(root => {
                                const kids = childrenOf(root.id)
                                const isExpanded = expandedIds.has(root.id)
                                const isActiveRoot = activeSlug === root.slug
                                return (
                                    <div key={root.id} className="space-y-1">
                                        {/* ── Categoría padre: nombre (filtra + expande) + chevron (solo expande) ── */}
                                        <div
                                            className={`flex items-stretch border font-mono text-xs uppercase tracking-wider transition-colors ${
                                                isActiveRoot
                                                    ? 'border-[#00f0ff] bg-[#00f0ff08]'
                                                    : 'border-[#333b49] hover:border-[#00f0ff40]'
                                            }`}
                                        >
                                            <button
                                                onClick={() => {
                                                    selectCategory(root.slug)
                                                    if (kids.length) setExpandedIds(prev => new Set(prev).add(root.id))
                                                }}
                                                className={`flex-1 min-w-0 text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                                                    isActiveRoot ? 'text-[#00f0ff]' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-sm">category</span>
                                                <span className="truncate">{root.name}</span>
                                            </button>
                                            {kids.length > 0 && (
                                                <button
                                                    onClick={() => toggleExpanded(root.id)}
                                                    aria-label={isExpanded ? `Colapsar ${root.name}` : `Expandir ${root.name}`}
                                                    aria-expanded={isExpanded}
                                                    className={`px-3 flex items-center justify-center border-l transition-colors ${
                                                        isActiveRoot
                                                            ? 'border-[#00f0ff40] text-[#00f0ff]'
                                                            : 'border-[#333b49] text-slate-500 hover:text-slate-300'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-sm">
                                                        {isExpanded ? 'expand_more' : 'chevron_right'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {/* ── Subcategorías: indentadas, borde lateral en vez de recuadro completo ── */}
                                        {isExpanded && kids.map(child => {
                                            const isActiveChild = activeSlug === child.slug
                                            return (
                                                <button
                                                    key={child.id}
                                                    onClick={() => selectCategory(child.slug)}
                                                    className={`w-full text-left pl-8 pr-4 py-2 border-l-2 font-mono text-[11px] uppercase tracking-wider flex items-center gap-2 transition-colors ${
                                                        isActiveChild
                                                            ? 'border-[#00f0ff] bg-[#00f0ff05] text-[#00f0ff]'
                                                            : 'border-[#333b49] text-slate-500 hover:border-[#00f0ff40] hover:text-slate-300'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-xs">subdirectory_arrow_right</span>
                                                    <span className="truncate">{child.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Status ── */}
                        <div className="mt-6 border border-[#333b49] p-4">
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
                            <div className="flex flex-col items-center justify-center py-32 gap-4 border border-dashed border-[#333b49]">
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
                                            className="group bg-[#1a1f27] border border-[#333b49] hover:border-[#00f0ff40] transition-all duration-300 flex flex-col"
                                        >
                                            {/* Imagen */}
                                            <div className="relative overflow-hidden aspect-[4/3] bg-[#12161c]">
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
                                                <div className="flex items-center justify-between pt-3 border-t border-[#333b49]">
                                                    <span className="font-mono text-lg font-bold text-[#00f0ff]">
                                                        {formatPrice(product)}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <Link
                                                            to={`/producto/${product.id}`}
                                                            className="px-3 py-2 border border-[#333b49] hover:border-[#00f0ff] text-slate-400 hover:text-[#00f0ff] font-mono text-[10px] uppercase tracking-widest transition-all"
                                                        >
                                                            DETAIL
                                                        </Link>
                                                        <button
                                                            onClick={() => addItem(product, 'default', 'M')}
                                                            disabled={!isPurchasable(product)}
                                                            className={`px-4 py-2 font-black font-mono text-[10px] uppercase tracking-widest transition-all ${
                                                                isPurchasable(product)
                                                                    ? 'bg-[#00f0ff] text-black hover:bg-[#00d4e0]'
                                                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {isPurchasable(product) ? 'ADD +' : 'N/A'}
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
