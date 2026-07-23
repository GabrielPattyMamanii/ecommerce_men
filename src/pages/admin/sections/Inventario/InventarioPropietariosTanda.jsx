import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../../../services/supabaseClient'
import { S } from '../../../../components/admin/AdminKit'

export default function InventarioPropietariosTanda() {
    const { tanda } = useParams()
    const tandaName = decodeURIComponent(tanda)
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [tree, setTree] = useState({})
    const [propietarios, setPropietarios] = useState([])
    const [filterPropietario, setFilterPropietario] = useState('')
    const [tandaInfo, setTandaInfo] = useState({ fecha: null, totalProductos: 0, totalDocenas: 0 })

    async function load() {
        setLoading(true)
        setError(null)
        const { data: entradas, error: err } = await supabase
            .from('entradas')
            .select('tanda_nombre, tanda_fecha, propietario, propietario_producto, codigo_boleta, codigo, marca, producto_titulo, cantidad_docenas, precio_docena')
            .eq('tanda_nombre', tandaName)
            .order('marca', { ascending: true })

        if (err) { setError(err.message); setLoading(false); return }

        const allProps = new Set()
        const built = {}
        let totalP = 0, totalD = 0, fecha = null

        ;(entradas || []).forEach(e => {
            const owner = e.propietario_producto?.trim() || e.propietario?.trim() || ''
            if (!owner) return
            if (!fecha && e.tanda_fecha) fecha = e.tanda_fecha
            allProps.add(owner)
            const boleta = e.codigo_boleta || 'Sin boleta'
            if (!built[owner]) built[owner] = {}
            if (!built[owner][boleta]) built[owner][boleta] = []
            built[owner][boleta].push(e)
            totalP += 1
            totalD += e.cantidad_docenas || 0
        })

        setPropietarios([...allProps].sort())
        setTree(built)
        setTandaInfo({ fecha, totalProductos: totalP, totalDocenas: totalD })
        setLoading(false)
    }

    useEffect(() => { load() }, [tandaName])

    const filteredOwners = filterPropietario ? Object.keys(tree).filter(o => o === filterPropietario).sort() : Object.keys(tree).sort()

    return (
        <section aria-label={`Inventario: propietarios de ${tandaName}`}>
            <button onClick={() => navigate('/admin/inventario/propietarios')} style={{ ...S.btnGhost, marginBottom: '1rem', padding: '0.375rem 0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Volver a tandas
            </button>

            <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{tandaName}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        {tandaInfo.fecha && <span>{new Date(tandaInfo.fecha).toLocaleDateString('es-AR')}</span>}
                        <span>{propietarios.length} propietarios</span>
                        <span>{tandaInfo.totalProductos} productos</span>
                        <span>{tandaInfo.totalDocenas} docenas</span>
                    </div>
                </div>
                <div style={{ minWidth: '220px' }}>
                    <label style={{ ...S.label, marginBottom: '0.25rem' }}>Filtrar propietario</label>
                    <select style={S.input} value={filterPropietario} onChange={e => setFilterPropietario(e.target.value)}>
                        <option value="">Todos los propietarios</option>
                        {propietarios.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{error}</div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando datos…</div>
            ) : filteredOwners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', border: '1px dashed #334155', borderRadius: '2px' }}>
                    No se encontraron propietarios en esta tanda.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredOwners.map(owner => <OwnerSection key={owner} owner={owner} boletas={tree[owner]} />)}
                </div>
            )}
        </section>
    )
}

function OwnerSection({ owner, boletas }) {
    const [expanded, setExpanded] = useState(true)
    const boletaKeys = Object.keys(boletas).sort()
    const allProducts = Object.values(boletas).flat()
    const totalDocenas = allProducts.reduce((s, p) => s + (p.cantidad_docenas || 0), 0)
    const totalValue = allProducts.reduce((s, p) => s + (p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0), 0)

    const marcaTotals = {}
    allProducts.forEach(p => {
        const marca = p.marca || 'Sin marca'
        if (!marcaTotals[marca]) marcaTotals[marca] = { docenas: 0, valor: 0 }
        marcaTotals[marca].docenas += p.cantidad_docenas || 0
        marcaTotals[marca].valor += (p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0)
    })

    return (
        <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <button
                onClick={() => setExpanded(v => !v)}
                style={{ width: '100%', padding: '1rem 1.25rem', background: 'rgba(13,70,242,0.1)', border: 'none', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--admin-primary)' }}>group</span>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{owner}</p>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{allProducts.length} productos · {boletaKeys.length} boleta(s) · {totalDocenas} docenas</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>${totalValue.toLocaleString('es-AR')}</span>
                    <span className="material-symbols-outlined" style={{ color: '#64748b', transform: expanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </div>
            </button>

            {expanded && (
                <>
                    <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(15,23,42,0.4)', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {Object.entries(marcaTotals).sort(([a], [b]) => a.localeCompare(b)).map(([marca, { docenas, valor }]) => (
                            <div key={marca} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '2px', padding: '0.3rem 0.6rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' }}>{marca}</span>
                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{docenas} doc.</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981' }}>${valor.toLocaleString('es-AR')}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        {boletaKeys.map(boleta => <BoletaSection key={boleta} boleta={boleta} products={boletas[boleta]} />)}
                    </div>
                </>
            )}
        </div>
    )
}

function BoletaSection({ boleta, products }) {
    const marcas = [...new Set(products.map(p => p.marca))].sort()
    return (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Boleta:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'white', background: '#1e293b', padding: '0.1rem 0.5rem', borderRadius: '2px' }}>{boleta}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({products.length} productos)</span>
            </div>
            {marcas.map(marca => {
                const marcaProducts = products.filter(p => p.marca === marca)
                return (
                    <div key={marca} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' }}>{marca}</span>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>({marcaProducts.length})</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-orders__table">
                                <thead>
                                    <tr>
                                        <th className="admin-orders__th">Código</th>
                                        <th className="admin-orders__th">Producto</th>
                                        <th className="admin-orders__th" style={{ textAlign: 'center' }}>Docenas</th>
                                        <th className="admin-orders__th admin-orders__th--right">Precio doc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marcaProducts.map((prod, i) => (
                                        <tr key={prod.id || i} className="admin-orders__row">
                                            <td className="admin-orders__td admin-orders__td--mono">{prod.codigo || '—'}</td>
                                            <td className="admin-orders__td admin-orders__td--white">{prod.producto_titulo || 'Sin nombre'}</td>
                                            <td className="admin-orders__td" style={{ textAlign: 'center', fontWeight: 700 }}>{prod.cantidad_docenas || 0}</td>
                                            <td className="admin-orders__td admin-orders__td--right">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
