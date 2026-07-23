import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../../services/supabaseClient'
import { S, ConfirmModal, ToastStack, useToasts } from '../../../../components/admin/AdminKit'
import BuscadorInventario from './components/BuscadorInventario'

function groupTandas(data) {
    const grouped = {}
    data.forEach(row => {
        const key = row.tanda_nombre
        if (!grouped[key]) {
            grouped[key] = { nombre: row.tanda_nombre, fecha: row.tanda_fecha, marcas: new Set(), totalDocenas: 0, totalProductos: 0 }
        }
        grouped[key].marcas.add(row.marca)
        grouped[key].totalDocenas += row.cantidad_docenas || 0
        grouped[key].totalProductos += 1
    })
    return grouped
}

export default function InventarioTandas() {
    const navigate = useNavigate()
    const { toasts, addToast, dismissToast } = useToasts()

    const [tandas, setTandas] = useState([])
    const [filteredTandas, setFilteredTandas] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState([])

    const [tandaToDelete, setTandaToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('entradas')
            .select('tanda_nombre, tanda_fecha, marca, codigo_boleta, gastos, cantidad_docenas')

        if (err) { setError(err.message); setLoading(false); return }

        const sorted = Object.values(groupTandas(data || [])).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        setTandas(sorted)
        if (!isSearching) setFilteredTandas(sorted)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleSearch(term) {
        setIsSearching(true)
        setLoading(true)
        const { data, error: err } = await supabase
            .from('entradas')
            .select('*')
            .or(`codigo.ilike.%${term}%,codigo_boleta.ilike.%${term}%`)

        if (err) { addToast('error', err.message); setLoading(false); return }

        setSearchResults(data || [])
        const uniqueNames = [...new Set((data || []).map(item => item.tanda_nombre))]
        setFilteredTandas(tandas.filter(t => uniqueNames.includes(t.nombre)))
        setLoading(false)
    }

    function handleClearSearch() {
        setIsSearching(false)
        setSearchResults([])
        setFilteredTandas(tandas)
    }

    async function confirmDelete() {
        if (!tandaToDelete) return
        setDeleting(true)
        const { error: err } = await supabase.from('entradas').delete().eq('tanda_nombre', tandaToDelete.nombre)
        if (err) { addToast('error', err.message); setDeleting(false); return }
        setTandas(prev => prev.filter(t => t.nombre !== tandaToDelete.nombre))
        setFilteredTandas(prev => prev.filter(t => t.nombre !== tandaToDelete.nombre))
        addToast('success', `Tanda "${tandaToDelete.nombre}" eliminada`)
        setDeleting(false)
        setTandaToDelete(null)
    }

    return (
        <section aria-label="Inventario: tandas">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Inventory Management
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Inventario
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({tandas.length} tandas)
                        </span>
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/admin/control-inventario')} style={S.btnGhost}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>fact_check</span> Control
                    </button>
                    <button onClick={() => navigate('/admin/inventario/propietarios')} style={S.btnGhost}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>group</span> Propietarios
                    </button>
                    <button onClick={() => navigate('/admin/inventario/nueva')} style={S.btnPrimary}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span> Nueva tanda
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: '420px', marginBottom: '1.5rem' }}>
                <BuscadorInventario onSearch={handleSearch} onClear={handleClearSearch} />
            </div>

            {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>{error}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cargando tandas…</span>
                </div>
            ) : filteredTandas.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>package_2</span>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No hay tandas — creá una arriba</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredTandas.map(tanda => (
                        <div key={tanda.nombre} style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.25rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--admin-primary)' }}>layers</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 2 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                                        {tanda.fecha ? new Date(tanda.fecha).toLocaleDateString('es-AR') : '—'}
                                    </span>
                                    <button onClick={() => navigate(`/admin/inventario/editar/${encodeURIComponent(tanda.nombre)}`)} title="Editar" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                                    </button>
                                    <button onClick={() => setTandaToDelete(tanda)} title="Eliminar" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                    </button>
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{tanda.nombre}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Marcas</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.marcas.size}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Productos</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.totalProductos}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total docenas</span><span style={{ color: 'var(--admin-primary)', fontWeight: 700 }}>{tanda.totalDocenas}</span></div>
                            </div>

                            {isSearching && searchResults.some(p => p.tanda_nombre === tanda.nombre) && (
                                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '6rem', overflowY: 'auto' }}>
                                    {searchResults.filter(p => p.tanda_nombre === tanda.nombre).map((prod, idx) => (
                                        <div key={idx} style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '0.25rem 0.4rem', borderRadius: '2px' }}>
                                            {prod.producto_titulo} · {prod.codigo}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => navigate(`/admin/inventario/detalle/${encodeURIComponent(tanda.nombre)}`)}
                                aria-label={`Ver detalle de ${tanda.nombre}`}
                                style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1 }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {tandaToDelete && (
                <ConfirmModal
                    title="Eliminar tanda"
                    message={`¿Eliminar "${tandaToDelete.nombre}"? Se eliminarán todos sus registros (${tandaToDelete.marcas.size} marcas, ${tandaToDelete.totalDocenas} docenas). Esta acción no se puede deshacer.`}
                    busy={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setTandaToDelete(null)}
                />
            )}

            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </section>
    )
}
