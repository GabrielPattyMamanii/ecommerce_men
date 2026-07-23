import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../../../services/supabaseClient'
import { S } from '../../../../components/admin/AdminKit'
import { groupKeyForMarca, ownerBorderStyle } from '../../../../lib/inventarioUtils'

export default function TandaDetalle() {
    const { tanda } = useParams()
    const tandaName = decodeURIComponent(tanda)
    const navigate = useNavigate()

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [tandaInfo, setTandaInfo] = useState({ date: null, gastos: 0, parametros: {} })
    const [users, setUsers] = useState([])
    const [selectedPhoto, setSelectedPhoto] = useState(null)

    const [filterBrand, setFilterBrand] = useState('')
    const [filterOwner, setFilterOwner] = useState('')
    const [filterCode, setFilterCode] = useState('')

    async function load() {
        setLoading(true)
        setError(null)
        const [entradasRes, usersRes, tandaRes] = await Promise.all([
            supabase.from('entradas').select('*').eq('tanda_nombre', tandaName).order('marca', { ascending: true }),
            supabase.from('app_users').select('username, color'),
            supabase.from('tandas').select('id, parametros').eq('nombre', tandaName).maybeSingle(),
        ])

        if (entradasRes.error) { setError(entradasRes.error.message); setLoading(false); return }

        setProducts(entradasRes.data || [])
        setUsers(usersRes.data || [])

        if (entradasRes.data && entradasRes.data.length > 0) {
            setTandaInfo({
                date: entradasRes.data[0].tanda_fecha,
                gastos: entradasRes.data[0].gastos,
                parametros: tandaRes.data?.parametros || {},
            })
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [tandaName])

    const uniqueBrands = [...new Set(products.map(p => p.marca))].sort()
    const uniqueOwners = [...new Set(products.map(p => p.propietario).filter(Boolean))].sort()
    const uniqueCodes = [...new Set(products.map(p => p.codigo_boleta).filter(Boolean))].sort()

    const filteredProducts = products.filter(p => {
        const matchBrand = filterBrand ? p.marca === filterBrand : true
        const matchOwner = filterOwner ? p.propietario === filterOwner : true
        const matchCode = filterCode ? p.codigo_boleta === filterCode : true
        return matchBrand && matchOwner && matchCode
    })

    const totalDocenas = filteredProducts.reduce((sum, p) => sum + (p.cantidad_docenas || 0), 0)
    const totalMoney = filteredProducts.reduce((sum, p) => sum + (p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0), 0)

    const brandGroups = Object.values(
        filteredProducts.reduce((acc, prod) => {
            const key = groupKeyForMarca(prod)
            if (!acc[key]) {
                acc[key] = { key, name: prod.marca, boleta: prod.codigo_boleta, propietario: prod.propietario || '', items: [], photos: [], bultosSum: 0 }
            }
            acc[key].items.push(prod)
            acc[key].bultosSum += parseFloat(prod.bultos) || 0
            if (prod.fotos && Array.isArray(prod.fotos)) {
                prod.fotos.forEach(photo => { if (!acc[key].photos.includes(photo)) acc[key].photos.push(photo) })
            }
            if (acc[key].bultos_personalizados === undefined && tandaInfo.parametros?.marcasMetadata) {
                const meta = (prod.marca_id && tandaInfo.parametros.marcasMetadata[prod.marca_id]) || tandaInfo.parametros.marcasMetadata[prod.marca]
                if (meta?.bultos_personalizados !== undefined) acc[key].bultos_personalizados = meta.bultos_personalizados
            }
            return acc
        }, {})
    )

    async function downloadImage(imageUrl) {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `marca-${Date.now()}.jpg`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch {
            // silencioso: descarga es una conveniencia, no crítica
        }
    }

    return (
        <section aria-label={`Inventario: detalle de ${tandaName}`}>
            <button onClick={() => navigate('/admin/inventario')} style={{ ...S.btnGhost, marginBottom: '1rem', padding: '0.375rem 0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Volver al listado
            </button>

            {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{error}</div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando detalles…</div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', border: '1px dashed #334155', borderRadius: '2px' }}>
                    No se encontraron productos para esta tanda.
                </div>
            ) : (
                <>
                    <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--admin-primary)' }}>layers</span>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'white' }}>{tandaName}</h1>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    <span>{tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString('es-AR') : '—'}</span>
                                    <span>{products.length} productos</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>Gastos totales</p>
                            <p style={{ margin: 0, fontFamily: 'monospace', color: 'white', fontWeight: 700 }}>${Number(tandaInfo.gastos || 0).toLocaleString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Valor total estimado</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>${totalMoney.toLocaleString('es-AR')}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{totalDocenas} docenas en total</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'rgba(15,23,42,0.4)', border: '1px solid #1e293b', borderRadius: '2px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ ...S.label, marginBottom: '0.25rem' }}>Marca</label>
                            <select style={S.input} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                                <option value="">Todas las marcas</option>
                                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ ...S.label, marginBottom: '0.25rem' }}>Propietario</label>
                            <select style={S.input} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                                <option value="">Todos los propietarios</option>
                                {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ ...S.label, marginBottom: '0.25rem' }}>N° boleta</label>
                            <select style={S.input} value={filterCode} onChange={e => setFilterCode(e.target.value)}>
                                <option value="">Todas las boletas</option>
                                {uniqueCodes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {(filterBrand || filterOwner || filterCode) && (
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode('') }} style={S.btnGhost}>Limpiar filtros</button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {brandGroups.map((brandGroup, idx) => {
                            const ownerTotals = {}
                            let hasExplicitOwner = false
                            brandGroup.items.forEach(prod => {
                                const ownerName = prod.propietario_producto?.trim() || prod.propietario?.trim() || ''
                                const amount = (prod.cantidad_docenas || 0) * (Number(prod.precio_docena) || 0)
                                const bucket = ownerName || '—'
                                if (ownerName) hasExplicitOwner = true
                                ownerTotals[bucket] = (ownerTotals[bucket] || 0) + amount
                            })
                            if (!hasExplicitOwner) Object.keys(ownerTotals).forEach(k => delete ownerTotals[k])
                            const isMultiOwner = Object.keys(ownerTotals).length > 1

                            const globalOwnerColor = users.find(u => u.username === brandGroup.propietario)?.color
                            const singleOwnerKey = !isMultiOwner && Object.keys(ownerTotals).length === 1 ? Object.keys(ownerTotals)[0] : null
                            const getColor = (name) => users.find(u => u.username === name)?.color || '#9ca3af'
                            const ownerColor = globalOwnerColor || (singleOwnerKey ? getColor(singleOwnerKey) : null)

                            return (
                                <BrandSection
                                    key={idx} brandGroup={brandGroup} ownerColor={ownerColor} ownerTotals={ownerTotals}
                                    isMultiOwner={isMultiOwner} getColor={getColor} onPhotoClick={setSelectedPhoto}
                                />
                            )
                        })}
                    </div>
                </>
            )}

            {selectedPhoto && (
                <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); downloadImage(selectedPhoto) }} style={{ display: 'flex', padding: '0.6rem', borderRadius: '999px', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined">download</span>
                        </button>
                        <button onClick={() => setSelectedPhoto(null)} style={{ display: 'flex', padding: '0.6rem', borderRadius: '999px', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <img src={selectedPhoto} alt="Vista previa" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }} />
                </div>
            )}
        </section>
    )
}

function BrandSection({ brandGroup, ownerColor, ownerTotals, isMultiOwner, getColor, onPhotoClick }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const borderStyle = ownerBorderStyle(ownerTotals, getColor)
    const brandTotal = brandGroup.items.reduce((sum, p) => sum + (p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0), 0)
    const customBultos = brandGroup.bultos_personalizados && parseFloat(brandGroup.bultos_personalizados) > 0 ? parseFloat(brandGroup.bultos_personalizados) : null

    return (
        <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', overflow: 'hidden', ...borderStyle }}>
            <div
                onClick={() => setIsExpanded(v => !v)}
                style={{ background: 'rgba(15,23,42,0.4)', padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {brandGroup.name}
                        {!isExpanded && <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b', background: '#0f172a', border: '1px solid #334155', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>{brandGroup.items.length} productos</span>}
                    </h3>

                    {isMultiOwner ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                            {Object.entries(ownerTotals).map(([name, amt]) => {
                                const color = getColor(name)
                                const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0)
                                const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0
                                return (
                                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.15rem 0.5rem', borderRadius: '999px', border: `1px solid ${color}`, fontSize: '0.7rem', fontWeight: 700 }}>
                                        <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: color }} />
                                        <span style={{ color: 'white' }}>{name}</span>
                                        <span style={{ color: '#64748b' }}>({pct}%)</span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : brandGroup.propietario ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#0f172a', border: '1px solid #334155' }}>
                            <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '999px', background: ownerColor || '#9ca3af' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{brandGroup.propietario}</span>
                        </div>
                    ) : null}

                    {customBultos !== null ? (
                        <BultosBadge color="#ec4899" label={`${customBultos} bultos`} />
                    ) : brandGroup.bultosSum > 0 ? (
                        <BultosBadge color="#3b82f6" label={`${brandGroup.bultosSum} bultos`} />
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Sin bultos agregados</span>
                    )}

                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '2px', background: 'rgba(16,185,129,0.1)' }}>${brandTotal.toLocaleString('es-AR')}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Boleta:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: brandGroup.boleta ? 'white' : '#ef4444' }}>{brandGroup.boleta || 'NO INGRESADA'}</span>
                    <span className="material-symbols-outlined" style={{ color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </div>
            </div>

            {isExpanded && (
                <div>
                    {brandGroup.photos.length > 0 && (
                        <div style={{ padding: '1rem 1.25rem', background: 'rgba(15,23,42,0.4)', borderBottom: '1px solid #1e293b' }}>
                            <p style={{ ...S.label, marginBottom: '0.625rem' }}>Fotos de la marca ({brandGroup.photos.length})</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                                {brandGroup.photos.map((url, i) => (
                                    <img key={i} src={url} alt={`${brandGroup.name} - ${i + 1}`} onClick={() => onPhotoClick(url)}
                                        style={{ width: '6rem', height: '6rem', objectFit: 'cover', borderRadius: '4px', border: '1px solid #334155', cursor: 'pointer' }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    <th className="admin-orders__th">Producto</th>
                                    <th className="admin-orders__th">Código</th>
                                    <th className="admin-orders__th" style={{ textAlign: 'center' }}>Docenas</th>
                                    <th className="admin-orders__th admin-orders__th--right">Precio doc.</th>
                                    <th className="admin-orders__th admin-orders__th--right">Total</th>
                                    <th className="admin-orders__th">Observaciones</th>
                                    {isMultiOwner && <th className="admin-orders__th">Propietario</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {brandGroup.items.map(prod => {
                                    const prodOwner = prod.propietario_producto?.trim() || prod.propietario?.trim() || ''
                                    const prodOwnerColor = prodOwner ? getColor(prodOwner) : null
                                    return (
                                        <tr key={prod.id} className="admin-orders__row" style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}>
                                            <td className="admin-orders__td admin-orders__td--white">{prod.producto_titulo}</td>
                                            <td className="admin-orders__td admin-orders__td--mono">{prod.codigo}</td>
                                            <td className="admin-orders__td" style={{ textAlign: 'center', fontWeight: 700 }}>{prod.cantidad_docenas}</td>
                                            <td className="admin-orders__td admin-orders__td--right">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</td>
                                            <td className="admin-orders__td admin-orders__td--right" style={{ color: '#10b981', fontWeight: 700 }}>
                                                ${(prod.cantidad_docenas * (Number(prod.precio_docena) || 0)).toLocaleString('es-AR')}
                                            </td>
                                            <td className="admin-orders__td" style={{ fontStyle: 'italic' }}>{prod.observaciones || '-'}</td>
                                            {isMultiOwner && (
                                                <td className="admin-orders__td">
                                                    {prodOwner ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}>
                                                            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: prodOwnerColor || '#9ca3af' }} />{prodOwner}
                                                        </span>
                                                    ) : <span style={{ color: '#475569' }}>—</span>}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function BultosBadge({ color, label }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '2px', color, background: `${color}18`, border: `1px solid ${color}44` }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>inventory_2</span>{label}
        </span>
    )
}
