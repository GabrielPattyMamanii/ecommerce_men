import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../../services/supabaseClient'
import { S } from '../../../../components/admin/AdminKit'

export default function InventarioPropietarios() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [tandas, setTandas] = useState([])

    async function load() {
        setLoading(true)
        setError(null)
        const { data: entradas, error: err } = await supabase
            .from('entradas')
            .select('tanda_nombre, tanda_fecha, propietario, propietario_producto, codigo_boleta, cantidad_docenas')

        if (err) { setError(err.message); setLoading(false); return }

        const grouped = {}
        ;(entradas || []).forEach(e => {
            const owner = e.propietario_producto?.trim() || e.propietario?.trim() || ''
            if (!owner) return
            const tanda = e.tanda_nombre || 'Sin tanda'
            if (!grouped[tanda]) {
                grouped[tanda] = { nombre: tanda, fecha: e.tanda_fecha, propietarios: new Set(), boletas: new Set(), totalProductos: 0, totalDocenas: 0 }
            }
            grouped[tanda].propietarios.add(owner)
            if (e.codigo_boleta) grouped[tanda].boletas.add(e.codigo_boleta)
            grouped[tanda].totalProductos += 1
            grouped[tanda].totalDocenas += e.cantidad_docenas || 0
        })

        const sorted = Object.values(grouped).sort((a, b) => {
            if (a.fecha && b.fecha) return new Date(b.fecha) - new Date(a.fecha)
            return a.nombre.localeCompare(b.nombre)
        })
        setTandas(sorted)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    return (
        <section aria-label="Inventario: propietarios por tanda">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                    <button onClick={() => navigate('/admin/inventario')} style={{ ...S.btnGhost, marginBottom: '0.75rem', padding: '0.375rem 0.75rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Volver a tandas
                    </button>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Inventario — Propietarios
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Productos por propietario
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({tandas.length} tandas)
                        </span>
                    </h2>
                </div>
                <button onClick={load} style={S.btnGhost}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span> Refresh
                </button>
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
            ) : tandas.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>group</span>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No hay tandas con propietarios asignados</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {tandas.map(tanda => (
                        <div
                            key={tanda.nombre}
                            onClick={() => navigate(`/admin/inventario/propietarios/${encodeURIComponent(tanda.nombre)}`)}
                            style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--admin-primary)' }}>layers</span>
                                {tanda.fecha && (
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                                        {new Date(tanda.fecha).toLocaleDateString('es-AR')}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{tanda.nombre}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Propietarios</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.propietarios.size}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Boletas</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.boletas.size}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Productos</span><span style={{ color: 'white', fontWeight: 600 }}>{tanda.totalProductos}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total docenas</span><span style={{ color: 'var(--admin-primary)', fontWeight: 700 }}>{tanda.totalDocenas}</span></div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {[...tanda.propietarios].slice(0, 4).map(p => (
                                    <span key={p} style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(13,70,242,0.15)', color: 'var(--admin-primary)', padding: '0.15rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase' }}>{p}</span>
                                ))}
                                {tanda.propietarios.size > 4 && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#1e293b', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>+{tanda.propietarios.size - 4} más</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
