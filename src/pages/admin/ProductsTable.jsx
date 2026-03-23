/**
 * ProductsTable.jsx — Admin: Inventory Management (Tarea 5.2)
 * Rutas: /admin/productos
 *
 * Operaciones Supabase:
 *  - SELECT  products
 *  - INSERT  producto nuevo (name, price, stock, description)
 *  - UPDATE  precio y stock por fila (edición inline)
 *  - DELETE  producto con confirmación
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

/* ── Estilos reutilizables (inline para no tocar AdminLayout.css) ── */
const S = {
    label: {
        display: 'block', fontSize: '0.65rem', fontWeight: 600,
        color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: '0.375rem', fontFamily: 'monospace',
    },
    input: {
        width: '100%', padding: '0.5rem 0.75rem', boxSizing: 'border-box',
        background: '#0f172a', border: '1px solid #334155', borderRadius: '2px',
        color: 'white', fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none',
    },
    inlineInput: {
        padding: '0.25rem 0.5rem',
        background: '#0f172a', border: '1px solid #334155', borderRadius: '2px',
        color: 'white', fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none',
    },
    btnPrimary: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.5rem 1.25rem', background: 'var(--admin-primary)',
        border: 'none', borderRadius: '2px', cursor: 'pointer',
        color: 'white', fontFamily: 'var(--admin-font)',
        fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    btnGhost: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem', background: '#1e293b',
        border: '1px solid #334155', borderRadius: '2px', cursor: 'pointer',
        color: '#94a3b8', fontFamily: 'var(--admin-font)',
        fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
    },
}

/* ── Botón de acción por fila (edit / delete / save / cancel) ── */
function ActionBtn({ icon, color, title, onClick, disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            style={{
                display: 'flex', alignItems: 'center', padding: '0.375rem',
                background: 'transparent', border: `1px solid ${color}33`,
                borderRadius: '2px', color, cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1, transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = `${color}18` }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{icon}</span>
        </button>
    )
}

/* ── Badge de stock con color según nivel ── */
function StockBadge({ value }) {
    const color = value === 0 ? '#ef4444' : value < 5 ? '#eab308' : '#10b981'
    return (
        <span style={{
            fontFamily: 'monospace', fontWeight: 600, color,
            fontSize: '0.875rem',
        }}>
            {value}
        </span>
    )
}

const EMPTY_FORM = { name: '', description: '', price: '', stock: '' }

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function ProductsTable() {
    const [products, setProducts] = useState([])
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(null)

    /* ─ Formulario añadir ─ */
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm]       = useState(EMPTY_FORM)
    const [saving, setSaving]   = useState(false)

    /* ─ Edición inline ─ */
    const [editId, setEditId]   = useState(null)
    const [editVals, setEditVals] = useState({ price: '', stock: '' })
    const [editSaving, setEditSaving] = useState(false)

    /* ─ Fetch ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('products')
            .select('id, name, description, price, stock, created_at')
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setProducts(data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    /* ─ Añadir producto ─ */
    async function handleAdd(e) {
        e.preventDefault()
        setSaving(true)
        setError(null)
        const { error: err } = await supabase.from('products').insert({
            name:        form.name.trim(),
            description: form.description.trim() || null,
            price:       parseFloat(form.price),
            stock:       parseInt(form.stock, 10),
        })
        if (err) setError(err.message)
        else { setForm(EMPTY_FORM); setShowAdd(false); load() }
        setSaving(false)
    }

    /* ─ Guardar edición inline ─ */
    async function saveEdit(id) {
        setEditSaving(true)
        setError(null)
        const { error: err } = await supabase.from('products').update({
            price: parseFloat(editVals.price),
            stock: parseInt(editVals.stock, 10),
        }).eq('id', id)
        if (err) setError(err.message)
        else { setEditId(null); load() }
        setEditSaving(false)
    }

    /* ─ Eliminar producto ─ */
    async function handleDelete(id, name) {
        if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
        setError(null)
        const { error: err } = await supabase.from('products').delete().eq('id', id)
        if (err) setError(err.message)
        else load()
    }

    /* ─ Iniciar edición ─ */
    function startEdit(product) {
        setEditId(product.id)
        setEditVals({ price: product.price, stock: product.stock })
    }

    /* ════════════════ RENDER ════════════════ */
    return (
        <section aria-label="Products inventory">

            {/* ── Encabezado de sección ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Inventory Management
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Products
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({products.length} SKUs)
                        </span>
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={load} style={S.btnGhost} title="Refresh">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                        Refresh
                    </button>
                    <button
                        onClick={() => { setShowAdd(p => !p); setForm(EMPTY_FORM) }}
                        style={{ ...S.btnPrimary, background: showAdd ? '#334155' : 'var(--admin-primary)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                            {showAdd ? 'close' : 'add'}
                        </span>
                        {showAdd ? 'Cancel' : 'Add Product'}
                    </button>
                </div>
            </div>

            {/* ── Formulario: nuevo producto ── */}
            {showAdd && (
                <form
                    onSubmit={handleAdd}
                    style={{
                        background: '#161b2e',
                        border: '1px solid rgba(13,70,242,0.35)',
                        borderRadius: '2px', padding: '1.5rem', marginBottom: '1.5rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1rem', alignItems: 'end',
                    }}
                >
                    <div>
                        <label style={S.label}>Name *</label>
                        <input
                            required value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Product name" style={S.input}
                        />
                    </div>
                    <div>
                        <label style={S.label}>Description</label>
                        <input
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Optional" style={S.input}
                        />
                    </div>
                    <div>
                        <label style={S.label}>Price ($) *</label>
                        <input
                            required type="number" min="0" step="0.01" value={form.price}
                            onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                            placeholder="0.00" style={S.input}
                        />
                    </div>
                    <div>
                        <label style={S.label}>Stock *</label>
                        <input
                            required type="number" min="0" value={form.stock}
                            onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                            placeholder="0" style={S.input}
                        />
                    </div>
                    <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                            {saving ? 'progress_activity' : 'save'}
                        </span>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </form>
            )}

            {/* ── Error banner ── */}
            {error && (
                <div role="alert" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem',
                    color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                    {error}
                </div>
            )}

            {/* ── Tabla de productos ── */}
            <div className="admin-orders">
                <div className="admin-orders__table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                            <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loading inventory…</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>inventory_2</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No products — add one above</p>
                        </div>
                    ) : (
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    {['ID', 'Name', 'Description', 'Price', 'Stock', 'Actions'].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`admin-orders__th${i === 5 ? ' admin-orders__th--right' : ''}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => {
                                    const isEditing = editId === product.id
                                    return (
                                        <tr key={product.id} className="admin-orders__row">

                                            {/* ID */}
                                            <td className="admin-orders__td admin-orders__td--mono" style={{ color: '#475569', fontSize: '0.7rem' }}>
                                                #{product.id.slice(0, 8)}
                                            </td>

                                            {/* Name */}
                                            <td className="admin-orders__td admin-orders__td--white" style={{ fontWeight: 500 }}>
                                                {product.name}
                                            </td>

                                            {/* Description */}
                                            <td className="admin-orders__td" style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {product.description || '—'}
                                            </td>

                                            {/* Price — editable */}
                                            <td className="admin-orders__td admin-orders__td--mono admin-orders__td--white">
                                                {isEditing ? (
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={editVals.price}
                                                        onChange={e => setEditVals(v => ({ ...v, price: e.target.value }))}
                                                        style={{ ...S.inlineInput, width: '88px' }}
                                                        aria-label="Edit price"
                                                    />
                                                ) : (
                                                    `$${Number(product.price).toFixed(2)}`
                                                )}
                                            </td>

                                            {/* Stock — editable */}
                                            <td className="admin-orders__td admin-orders__td--mono">
                                                {isEditing ? (
                                                    <input
                                                        type="number" min="0"
                                                        value={editVals.stock}
                                                        onChange={e => setEditVals(v => ({ ...v, stock: e.target.value }))}
                                                        style={{ ...S.inlineInput, width: '72px' }}
                                                        aria-label="Edit stock"
                                                    />
                                                ) : (
                                                    <StockBadge value={product.stock} />
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="admin-orders__td admin-orders__td--right">
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                    {isEditing ? (
                                                        <>
                                                            <ActionBtn icon="check" color="#10b981" title="Save changes" onClick={() => saveEdit(product.id)} disabled={editSaving} />
                                                            <ActionBtn icon="close" color="#94a3b8" title="Cancel edit" onClick={() => setEditId(null)} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ActionBtn
                                                                icon="edit" color="var(--admin-primary)" title="Edit price / stock"
                                                                onClick={() => startEdit(product)}
                                                            />
                                                            <ActionBtn
                                                                icon="delete" color="#ef4444" title="Delete product"
                                                                onClick={() => handleDelete(product.id, product.name)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </section>
    )
}
