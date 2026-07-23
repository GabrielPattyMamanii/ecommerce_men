import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../../services/supabaseClient'
import { S } from '../../../../components/admin/AdminKit'
import { buildScanUrl, getEffectiveDocenas, groupKeyForMarca, ownerBorderStyle } from '../../../../lib/inventarioUtils'

export default function ControlInventarioTanda() {
    const { tanda } = useParams()
    const tandaName = decodeURIComponent(tanda)
    const navigate = useNavigate()

    const [products, setProducts] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [tandaInfo, setTandaInfo] = useState({ date: null, count: 0, gastos: 0 })

    const [filterBrand, setFilterBrand] = useState('')
    const [filterOwner, setFilterOwner] = useState('')
    const [filterCode, setFilterCode] = useState('')

    const localKey = `generated_qrs_${tandaName}`
    const [generatedQRs, setGeneratedQRs] = useState(() => {
        try { const saved = localStorage.getItem(localKey); return saved ? new Set(JSON.parse(saved)) : new Set() } catch { return new Set() }
    })
    const [qrModal, setQrModal] = useState(null)

    async function load() {
        setLoading(true)
        setError(null)
        const [entradasRes, usersRes] = await Promise.all([
            supabase.from('entradas').select('*').eq('tanda_nombre', tandaName).order('marca', { ascending: true }),
            supabase.from('app_users').select('username, color'),
        ])
        if (entradasRes.error) { setError(entradasRes.error.message); setLoading(false); return }

        setProducts(entradasRes.data || [])
        setUsers(usersRes.data || [])
        if (entradasRes.data && entradasRes.data.length > 0) {
            setTandaInfo({ date: entradasRes.data[0].tanda_fecha, count: entradasRes.data.length, gastos: entradasRes.data[0].gastos || 0 })
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [tandaName])

    const uniqueBrands = [...new Set(products.map(p => p.marca))].sort()
    const uniqueOwners = [...new Set(products.map(p => p.propietario).filter(Boolean))].sort()
    const uniqueCodes = [...new Set(products.map(p => p.codigo_boleta).filter(Boolean))].sort()

    const filteredProducts = products.filter(p => (!filterBrand || p.marca === filterBrand) && (!filterOwner || p.propietario === filterOwner) && (!filterCode || p.codigo_boleta === filterCode))

    const totalDocenasCopy = filteredProducts.reduce((sum, p) => sum + getEffectiveDocenas(p), 0)
    const totalMoney = filteredProducts.reduce((sum, p) => sum + getEffectiveDocenas(p) * (Number(p.precio_docena) || 0), 0)

    const brandGroups = Object.values(
        filteredProducts.reduce((acc, prod) => {
            const key = groupKeyForMarca(prod)
            if (!acc[key]) acc[key] = { key, name: prod.marca, boleta: prod.codigo_boleta, propietario: prod.propietario || '', items: [] }
            else if (!acc[key].propietario && prod.propietario) acc[key].propietario = prod.propietario
            acc[key].items.push(prod)
            return acc
        }, {})
    )

    const getStableKey = (prod) => prod.codigo ? `c:${prod.codigo}` : prod.id

    function handleGenerateQR(prod) {
        const updated = new Set([...generatedQRs, getStableKey(prod)])
        setGeneratedQRs(updated)
        try { localStorage.setItem(localKey, JSON.stringify([...updated])) } catch { /* localStorage puede estar lleno o bloqueado, no es crítico */ }
    }

    function handleOpenQR(prod) {
        setQrModal({ id: prod.id, titulo: prod.producto_titulo, marca: prod.marca, url: buildScanUrl(prod) })
    }

    function handleDownloadQR() {
        if (!qrModal) return
        const canvas = document.getElementById('qr-download-canvas')
        if (!canvas) return
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = `QR-${qrModal.titulo || qrModal.id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <section aria-label={`Control de inventario: ${tandaName}`}>
            <button onClick={() => navigate('/admin/control-inventario')} style={{ ...S.btnGhost, marginBottom: '1rem', padding: '0.375rem 0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Volver al listado
            </button>

            {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{error}</div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando detalles…</div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', border: '1px dashed #334155', borderRadius: '2px' }}>No se encontraron registros para esta tanda.</div>
            ) : (
                <>
                    <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#6366f1' }}>fact_check</span>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'white' }}>{tandaName}</h1>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    <span>{tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString('es-AR') : '—'}</span>
                                    <span>{tandaInfo.count} productos</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>Gastos totales</p>
                            <p style={{ margin: 0, fontFamily: 'monospace', color: 'white', fontWeight: 700 }}>${Number(tandaInfo.gastos || 0).toLocaleString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Valor control estimado</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>${totalMoney.toLocaleString('es-AR')}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{totalDocenasCopy} docenas (control)</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'rgba(15,23,42,0.4)', border: '1px solid #1e293b', borderRadius: '2px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ ...S.label, marginBottom: '0.25rem' }}>Marca</label>
                            <select style={S.input} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                                <option value="">Todas las marcas</option>{uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ ...S.label, marginBottom: '0.25rem' }}>Propietario</label>
                            <select style={S.input} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                                <option value="">Todos los propietarios</option>{uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ ...S.label, marginBottom: '0.25rem' }}>N° boleta</label>
                            <select style={S.input} value={filterCode} onChange={e => setFilterCode(e.target.value)}>
                                <option value="">Todas las boletas</option>{uniqueCodes.map(c => <option key={c} value={c}>{c}</option>)}
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
                                const amount = getEffectiveDocenas(prod) * (Number(prod.precio_docena) || 0)
                                const bucket = ownerName || '—'
                                if (ownerName) hasExplicitOwner = true
                                ownerTotals[bucket] = (ownerTotals[bucket] || 0) + amount
                            })
                            if (!hasExplicitOwner) Object.keys(ownerTotals).forEach(k => delete ownerTotals[k])
                            const isMultiOwner = Object.keys(ownerTotals).length > 1
                            const getColor = (name) => users.find(u => u.username === name)?.color || '#9ca3af'
                            const globalOwnerColor = users.find(u => u.username === brandGroup.propietario)?.color
                            const singleOwnerKey = !isMultiOwner && Object.keys(ownerTotals).length === 1 ? Object.keys(ownerTotals)[0] : null
                            const ownerColor = globalOwnerColor || (singleOwnerKey ? getColor(singleOwnerKey) : null)

                            return (
                                <ControlBrandSection
                                    key={idx} brandGroup={brandGroup} ownerColor={ownerColor} ownerTotals={ownerTotals} isMultiOwner={isMultiOwner}
                                    getColor={getColor} generatedQRs={generatedQRs} getStableKey={getStableKey} onGenerate={handleGenerateQR} onOpen={handleOpenQR}
                                />
                            )
                        })}
                    </div>
                </>
            )}

            {qrModal && (
                <div onClick={() => setQrModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', padding: '2rem', maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>QR del producto</p>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>{qrModal.titulo}</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{qrModal.marca}</p>
                            </div>
                            <button onClick={() => setQrModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div style={{ padding: '1rem', background: 'white', borderRadius: '4px' }}>
                            <QRCodeSVG value={qrModal.url} size={200} level="H" />
                        </div>
                        <div style={{ display: 'none' }}>
                            <QRCodeCanvas id="qr-download-canvas" value={qrModal.url} size={400} level="H" includeMargin />
                        </div>

                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '2px', width: '100%', textAlign: 'center', wordBreak: 'break-all' }}>{qrModal.url}</p>

                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <button onClick={() => setQrModal(null)} style={{ ...S.btnGhost, flex: 1 }}>Cerrar</button>
                            <button onClick={handleDownloadQR} style={{ ...S.btnPrimary, flex: 1, background: '#4f46e5' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>download</span> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

function ControlBrandSection({ brandGroup, ownerColor, ownerTotals, isMultiOwner, getColor, generatedQRs, getStableKey, onGenerate, onOpen }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const borderStyle = ownerBorderStyle(ownerTotals, getColor)
    const totalDocenasCopy = brandGroup.items.reduce((sum, p) => sum + getEffectiveDocenas(p), 0)
    const totalMoney = brandGroup.items.reduce((sum, p) => sum + getEffectiveDocenas(p) * (Number(p.precio_docena) || 0), 0)

    return (
        <div style={{ background: '#161b2e', border: '1px solid #1e293b', borderRadius: '4px', overflow: 'hidden', ...borderStyle }}>
            <div onClick={() => setIsExpanded(v => !v)} style={{ background: 'rgba(15,23,42,0.4)', padding: '0.9rem 1.25rem', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{brandGroup.name}</h3>
                        {!isExpanded && <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#0f172a', border: '1px solid #334155', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>{brandGroup.items.length}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>${totalMoney.toLocaleString('es-AR')}</span>
                        <span className="material-symbols-outlined" style={{ color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0f172a', border: '1px solid #334155', padding: '0.1rem 0.5rem', borderRadius: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Boleta</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: brandGroup.boleta ? 'white' : '#ef4444' }}>{brandGroup.boleta || 'NO INGRESADA'}</span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: '2px', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>content_paste</span>{totalDocenasCopy} doc.
                    </span>
                    {isMultiOwner ? (
                        Object.entries(ownerTotals).map(([name, amt]) => {
                            const color = getColor(name)
                            const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0)
                            const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0
                            return (
                                <span key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.1rem 0.5rem', borderRadius: '999px', border: `1px solid ${color}`, fontSize: '0.7rem', fontWeight: 700 }}>
                                    <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: color }} /><span style={{ color: 'white' }}>{name}</span><span style={{ color: '#64748b' }}>({pct}%)</span>
                                </span>
                            )
                        })
                    ) : brandGroup.propietario ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.1rem 0.5rem', borderRadius: '999px', background: '#0f172a', border: '1px solid #334155' }}>
                            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: ownerColor || '#9ca3af' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{brandGroup.propietario}</span>
                        </span>
                    ) : null}
                </div>
            </div>

            {isExpanded && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-orders__table">
                        <thead>
                            <tr>
                                <th className="admin-orders__th">Producto</th>
                                <th className="admin-orders__th">Código</th>
                                {isMultiOwner && <th className="admin-orders__th">Propietario</th>}
                                <th className="admin-orders__th" style={{ textAlign: 'center' }}>Doc. control</th>
                                <th className="admin-orders__th admin-orders__th--right">Precio doc.</th>
                                <th className="admin-orders__th admin-orders__th--right">Total</th>
                                <th className="admin-orders__th" style={{ textAlign: 'center' }}>QR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brandGroup.items.map(prod => {
                                const docenasCopy = getEffectiveDocenas(prod)
                                const total = docenasCopy * (Number(prod.precio_docena) || 0)
                                const isGenerated = generatedQRs.has(getStableKey(prod))
                                const prodOwner = prod.propietario_producto?.trim() || prod.propietario?.trim() || ''
                                const prodOwnerColor = prodOwner ? getColor(prodOwner) : null
                                return (
                                    <tr key={prod.id} className="admin-orders__row" style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}>
                                        <td className="admin-orders__td admin-orders__td--white">{prod.producto_titulo}</td>
                                        <td className="admin-orders__td admin-orders__td--mono">{prod.codigo}</td>
                                        {isMultiOwner && (
                                            <td className="admin-orders__td">
                                                {prodOwner ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}>
                                                        <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: prodOwnerColor || '#9ca3af' }} />{prodOwner}
                                                    </span>
                                                ) : <span style={{ color: '#475569' }}>—</span>}
                                            </td>
                                        )}
                                        <td className="admin-orders__td" style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '0.15rem 0.5rem', borderRadius: '2px' }}>{docenasCopy}</span>
                                        </td>
                                        <td className="admin-orders__td admin-orders__td--right">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</td>
                                        <td className="admin-orders__td admin-orders__td--right" style={{ color: '#818cf8', fontWeight: 700 }}>${total.toLocaleString('es-AR')}</td>
                                        <td className="admin-orders__td" style={{ textAlign: 'center' }}>
                                            {!isGenerated ? (
                                                <button onClick={() => onGenerate(prod)} style={{ ...S.btnGhost, padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>qr_code_2</span> Generar
                                                </button>
                                            ) : (
                                                <button onClick={() => onOpen(prod)} style={{ ...S.btnPrimary, padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: '#4f46e5' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>qr_code_2</span> Abrir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
