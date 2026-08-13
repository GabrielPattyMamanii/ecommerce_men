import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabaseClient'
import { useContactSettings } from '../hooks/useContactSettings'
import ProductCard from '../components/ProductCard'

export default function Catalogo() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [visibleCount, setVisibleCount] = useState(9) // Paginación: mostrar 9 productos por vez
    const { addItem } = useCart()
    const contactSettings = useContactSettings()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeSlug = searchParams.get('categoria') || ''
    const query = (searchParams.get('q') || '').trim()

    /* ─ Expand/collapse de categorías padre en el sidebar ─ */
    const [expandedIds, setExpandedIds] = useState(new Set())

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true)
            const { data, error: err } = await supabase
                .from('products')
                .select('id, name, description, retail_price, price_on_request, stock, unlimited_stock, images, category_id, categories(name, slug)')
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

    /* Resetea la paginación cuando cambia categoría o búsqueda */
    useEffect(() => {
        setVisibleCount(9)
    }, [activeSlug, query])

    function toggleExpanded(id) {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function selectCategory(slug) {
        const next = {}
        if (slug) next.categoria = slug
        if (query) next.q = query
        setSearchParams(next)
    }

    function clearSearch() {
        const next = {}
        if (activeSlug) next.categoria = activeSlug
        setSearchParams(next)
    }

    // Elegir una categoría padre incluye los productos de sus subcategorías;
    // un slug en la URL que no matchea ninguna categoría real no cae a "ALL" (evita
    // mostrar todo el catálogo silenciosamente ante un link roto/desactualizado).
    const byCategory = activeSlug
        ? products.filter(p => {
            if (!activeCategory) return false
            const cat = categoriesById[p.category_id]
            if (!cat) return false
            return cat.id === activeCategory.id || cat.parent_id === activeCategory.id
        })
        : products

    // Búsqueda por texto (desde la barra del Navbar, ?q=...) combinada con el
    // filtro de categoría — antes solo existía el input visualmente, sin lógica.
    const normalizedQuery = query.toLowerCase()
    const filtered = normalizedQuery
        ? byCategory.filter(p =>
            p.name?.toLowerCase().includes(normalizedQuery) ||
            p.description?.toLowerCase().includes(normalizedQuery)
        )
        : byCategory

    /* ── Contenido de la lista de categorías — se arma una sola vez y se
       reusa tanto en el <details> colapsable de mobile/tablet como en el
       sidebar fijo de desktop, para no duplicar la lógica de expand/select. ── */
    const categoryListContent = (
        <>
            <button
                onClick={() => selectCategory('')}
                className={`w-full text-left px-4 py-3 border font-mono text-xs uppercase tracking-wider flex items-center gap-3 transition-colors ${
                    activeSlug === ''
                        ? 'border-primary bg-black/5 text-primary'
                        : 'border-border text-muted hover:border-primary/40 hover:text-primary'
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
                                    ? 'border-primary bg-black/5'
                                    : 'border-border hover:border-primary/40'
                            }`}
                        >
                            <button
                                onClick={() => {
                                    selectCategory(root.slug)
                                    if (kids.length) setExpandedIds(prev => new Set(prev).add(root.id))
                                }}
                                className={`flex-1 min-w-0 text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                                    isActiveRoot ? 'text-primary' : 'text-muted hover:text-primary'
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
                                            ? 'border-primary/40 text-primary'
                                            : 'border-border text-muted hover:text-primary'
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
                                            ? 'border-primary bg-black/5 text-primary'
                                            : 'border-border text-muted hover:border-primary/40 hover:text-primary'
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
        </>
    )

    return (
        <div className="min-h-screen bg-transparent text-primary">
            <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

                {/* ── Encabezado ── */}
                <div className="mb-8 border-b border-border pb-6">
                    <p className="font-mono text-[10px] text-primary uppercase tracking-[0.3em] mb-2">
                        // CATÁLOGO
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-primary">
                        CATÁLOGO DE <span className="text-primary">PRODUCTOS</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 mt-3 text-[10px] font-mono text-muted uppercase tracking-widest">
                        <span>{filtered.length} PRODUCTOS</span>
                        {query && (
                            <span className="flex items-center gap-2 text-primary">
                                Resultados para "{query}"
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="flex items-center gap-1 text-muted hover:text-primary transition-colors normal-case tracking-normal"
                                    aria-label="Limpiar búsqueda"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ── Sidebar Filtros ──
                        En mobile/tablet (<lg) una lista larga de categorías empujaba
                        toda la grilla de productos fuera de la pantalla inicial. Ahora
                        se muestra colapsada dentro de un <details>, y solo a partir de
                        lg queda como sidebar fijo siempre expandido. ── */}
                    <aside className="lg:w-56 flex-shrink-0">
                        <details className="lg:hidden group border border-border bg-surface mb-2" open={!!activeSlug}>
                            <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
                                    <span className="material-symbols-outlined text-sm">filter_list</span>
                                    {activeCategory ? activeCategory.name : 'Categorías'}
                                </span>
                                <span className="material-symbols-outlined text-sm text-muted transition-transform group-open:rotate-180">
                                    expand_more
                                </span>
                            </summary>
                            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border">
                                {categoryListContent}
                            </div>
                        </details>

                        <div className="hidden lg:block">
                            <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-4">
                                // CATEGORÍAS
                            </p>
                            <div className="space-y-2">
                                {categoryListContent}
                            </div>
                        </div>
                    </aside>

                    {/* ── Grid de Productos ── */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center items-center py-32">
                                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                            </div>
                        ) : error ? (
                            <div className="border border-red-500/30 bg-red-500/10 p-6 text-red-600 font-mono text-sm">
                                Error: {error}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4 border border-dashed border-border">
                                <span className="material-symbols-outlined text-4xl text-outline">inventory_2</span>
                                <p className="font-mono text-xs text-muted uppercase tracking-widest">Sin productos disponibles</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {/* Grid de productos */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filtered.slice(0, visibleCount).map(product => (
                                        <ProductCard key={product.id} product={product} onAdd={addItem} contactSettings={contactSettings} />
                                    ))}
                                </div>

                                {/* Botón "Ver más" — se muestra solo si hay productos adicionales */}
                                {visibleCount < filtered.length && (
                                    <div className="flex justify-center pt-4">
                                        <button
                                            onClick={() => setVisibleCount(prev => prev + 9)}
                                            className="px-8 py-3 border border-primary text-primary font-mono text-xs uppercase tracking-widest transition-all hover:bg-primary hover:text-white active:scale-95"
                                            aria-label={`Ver más productos (mostrando ${visibleCount} de ${filtered.length})`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>Ver más</span>
                                                <span className="material-symbols-outlined text-base">arrow_downward</span>
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
