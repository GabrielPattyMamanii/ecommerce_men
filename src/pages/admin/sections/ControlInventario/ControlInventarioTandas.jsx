import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../../services/supabaseClient'
import { S } from '../../../../components/admin/AdminKit'

function groupTandas(data) {
    const grouped = {}
    data.forEach(row => {
        const key = row.tanda_nombre
        if (!grouped[key]) {
            grouped[key] = { nombre: row.tanda_nombre, fecha: row.tanda_fecha, marcas: new Set(), propietarios: new Set(), totalDocenasCopy: 0, totalProductos: 0 }
        }
        grouped[key].marcas.add(row.marca)
        grouped[key].totalDocenasCopy += row.cant_docenas_copy || 0
        grouped[key].totalProductos += 1
        if (row.propietario) grouped[key].propietarios.add(row.propietario)
    })
    return grouped
}

export default function ControlInventarioTandas() {
    const navigate = useNavigate()
    const [tandas, setTandas] = useState([])
    const [filteredTandas, setFilteredTandas] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('entradas')
            .select('tanda_nombre, tanda_fecha, marca, codigo_boleta, cant_docenas_copy, propietario')

        if (err) { setError(err.message); setLoading(false); return }

        const sorted = Object.values(groupTandas(data || [])).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        setTandas(sorted)
        setFilteredTandas(sorted)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    function handleSearch(term) {
        setSearchTerm(term)
        if (!term.trim()) { setFilteredTandas(tandas); return }
        const lower = term.toLowerCase()
        setFilteredTandas(tandas.filter(t => t.nombre.toLowerCase().includes(lower)))
    }

    return (
        <section aria-label="Control de inventario: tandas">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                    <button onClick={() => navigate('/admin/inventario')} style={{ ...S.btnGhost, marginBottom: '0.75rem', padding: '0.375rem 0.75rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Volver a inventario
                    </button>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Control de inventario
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Control de tandas
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({tandas.length})
                        </span>
                    </h2>
                </div>
            </div>

            <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1.1rem' }}>search</span>
                <input
                    style={{ ...S.input, padding: '0.5rem 2.25rem' }}
                    placeholder="Buscar tanda por nombre…"
                    value={searchTerm}
                    onChange={e => handleSearch(e.target.value)}
                />
                {searchTerm && (
                    <button onClick={() => handleSearch('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                    </button>
                )}
            </div>

            {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{error}</div>
            )}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cargando tandas…</span>
                </div>
            ) : filteredTandas.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>fact_check</span>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No se encontraron tandas</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredTandas.map(tanda => (
                        <div
                            key={tanda.nombre}
                            onClick={() => navigate(`/admin/control-inventario/${encodeURIComponent(tanda.nombre)}`)}
                            style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#6366f1' }}>layers</span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                                    {tanda.fecha ? new Date(tanda.fecha).toLocaleDateString('es-AR') : '—'}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{tanda.nombre}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Marcas</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.marcas.size}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Productos</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.totalProductos}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '0.35rem', marginTop: '0.1rem' }}>
                                    <span style={{ fontWeight: 600 }}>Doc. control</span><span style={{ color: '#6366f1', fontWeight: 700 }}>{tanda.totalDocenasCopy}</span>
                                </div>
                            </div>
                            {tanda.propietarios.size > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', borderTop: '1px solid #1e293b', paddingTop: '0.5rem' }}>
                                    {[...tanda.propietarios].slice(0, 4).map(p => (
                                        <span key={p} style={{ fontSize: '0.65rem', background: '#1e293b', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>{p}</span>
                                    ))}
                                    {tanda.propietarios.size > 4 && <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>+{tanda.propietarios.size - 4} más</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
