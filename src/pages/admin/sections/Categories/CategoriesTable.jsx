/**
 * CategoriesTable.jsx — Admin: Category Management (jerarquía de 2 niveles)
 * Rutas: /admin/categorias
 *
 * Operaciones Supabase:
 *  - SELECT  categories (con parent_id)
 *  - INSERT  categoría o subcategoría nueva (name, slug autogenerado, parent_id opcional)
 *  - UPDATE  name, slug y parent_id por fila (edición inline)
 *  - DELETE  categoría con confirmación (productos asociados quedan sin categoría — ON DELETE SET NULL;
 *            si tiene subcategorías, la DB rechaza el borrado — ON DELETE RESTRICT)
 */
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'

/* ── Estilos reutilizables (inline, mismo patrón que ProductsTable) ── */
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

/* ── slugify: "Remeras Deportivas" → "remeras-deportivas" ── */
const ACCENT_MAP = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n',
    Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ü: 'u', Ñ: 'n',
}
function slugify(text) {
    return text
        .split('').map(ch => ACCENT_MAP[ch] ?? ch).join('')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/* ── Botón de acción por fila (edit / delete / save / cancel / add-sub) ── */
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

const EMPTY_FORM = { name: '', parent_id: '' }

/* Traduce el error de FK (23503, ON DELETE RESTRICT) a un mensaje accionable */
function friendlyDeleteError(err) {
    if (err.code === '23503') {
        return 'No se puede eliminar: tiene subcategorías. Eliminá o reasigná las subcategorías primero.'
    }
    return err.message
}

/* ── Modal de confirmación (eliminar) — mismo patrón que CouponsTable ── */
function ConfirmModal({ title, message, busy, onConfirm, onCancel }) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title}
                style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', padding: '1.5rem', maxWidth: '380px', width: '100%' }}
            >
                <h3 style={{ margin: '0 0 0.75rem', color: 'white', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={onCancel} style={S.btnGhost}>Cancelar</button>
                    <button
                        onClick={onConfirm} disabled={busy}
                        style={{ ...S.btnPrimary, background: '#ef4444', opacity: busy ? 0.6 : 1 }}
                    >
                        {busy ? 'Eliminando…' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function CategoriesTable() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading]       = useState(true)
    const [error, setError]           = useState(null)

    /* ─ Formulario añadir ─ */
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm]       = useState(EMPTY_FORM)
    const [saving, setSaving]   = useState(false)

    /* ─ Edición inline ─ */
    const [editId, setEditId]         = useState(null)
    const [editVals, setEditVals]     = useState({ name: '', slug: '', parent_id: '' })
    const [editSaving, setEditSaving] = useState(false)

    /* ─ Expand/collapse de categorías raíz ─ */
    const [expandedIds, setExpandedIds] = useState(new Set())
    const knownRootIds = useRef(new Set())

    /* ─ Modal eliminar ─ */
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting]         = useState(false)

    /* ─ Fetch ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('categories')
            .select('id, name, slug, parent_id, created_at')
            .order('name', { ascending: true })
        if (err) {
            setError(err.message)
        } else {
            const rows = data ?? []
            setCategories(rows)
            const rootIds = rows.filter(c => !c.parent_id).map(c => c.id)
            setExpandedIds(prev => {
                const next = new Set(prev)
                // Raíces recién descubiertas empiezan expandidas; las conocidas conservan su estado.
                rootIds.forEach(id => { if (!knownRootIds.current.has(id)) next.add(id) })
                for (const id of next) if (!rootIds.includes(id)) next.delete(id)
                return next
            })
            knownRootIds.current = new Set(rootIds)
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    /* ─ Árbol: raíces + sus hijas ─ */
    const roots = categories.filter(c => !c.parent_id)
    const childrenOf = parentId => categories.filter(c => c.parent_id === parentId)

    function toggleExpanded(id) {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    /* ─ Añadir categoría o subcategoría ─ */
    async function handleAdd(e) {
        e.preventDefault()
        setSaving(true)
        setError(null)
        const name = form.name.trim()
        const { error: err } = await supabase.from('categories').insert({
            name,
            slug: slugify(name),
            parent_id: form.parent_id || null,
        })
        if (err) setError(err.message)
        else {
            if (form.parent_id) setExpandedIds(prev => new Set(prev).add(form.parent_id))
            setForm(EMPTY_FORM); setShowAdd(false); load()
        }
        setSaving(false)
    }

    /* ─ Abrir formulario para agregar subcategoría bajo una raíz puntual ─ */
    function openAddSub(parentId) {
        setForm({ name: '', parent_id: parentId })
        setShowAdd(true)
    }

    /* ─ Guardar edición inline ─ */
    async function saveEdit(id) {
        setEditSaving(true)
        setError(null)
        const payload = {
            name: editVals.name.trim(),
            slug: slugify(editVals.slug.trim() || editVals.name),
        }
        // Solo las filas que ya son subcategoría exponen el selector de padre en el UI.
        if (editVals.parent_id !== undefined) payload.parent_id = editVals.parent_id || null
        const { error: err } = await supabase.from('categories').update(payload).eq('id', id)
        if (err) setError(err.message)
        else { setEditId(null); load() }
        setEditSaving(false)
    }

    /* ─ Eliminar categoría ─ */
    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        setError(null)
        const { error: err } = await supabase.from('categories').delete().eq('id', deleteTarget.id)
        if (err) setError(friendlyDeleteError(err))
        else load()
        setDeleting(false)
        setDeleteTarget(null)
    }

    /* ─ Iniciar edición ─ */
    function startEdit(category) {
        setEditId(category.id)
        setEditVals({
            name: category.name,
            slug: category.slug,
            // undefined para raíces (sin selector de padre); string para subcategorías.
            parent_id: category.parent_id ? category.parent_id : (category.parent_id === null && childrenOf(category.id).length > 0 ? undefined : ''),
        })
    }

    const isSubcategoryEdit = editVals.parent_id !== undefined

    /* ════════════════ RENDER ════════════════ */
    return (
        <section aria-label="Category management">

            {/* ── Encabezado de sección ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Category Management
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Categories
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({categories.length})
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
                        {showAdd ? 'Cancel' : 'Add Category'}
                    </button>
                </div>
            </div>

            {/* ── Formulario: nueva categoría / subcategoría ── */}
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
                            placeholder="Ej: Remeras" style={S.input}
                        />
                    </div>
                    <div>
                        <label style={S.label}>Categoría padre</label>
                        <select
                            value={form.parent_id}
                            onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
                            style={S.input}
                        >
                            <option value="">— Categoría raíz —</option>
                            {roots.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={S.label}>Slug (auto)</label>
                        <input
                            disabled value={slugify(form.name)}
                            style={{ ...S.input, color: '#64748b', cursor: 'not-allowed' }}
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

            {/* ── Tabla de categorías (árbol de 2 niveles) ── */}
            <div className="admin-orders">
                <div className="admin-orders__table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                            <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loading categories…</span>
                        </div>
                    ) : categories.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>category</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No categories — add one above</p>
                        </div>
                    ) : (
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    {['Name', 'Slug', 'Actions'].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`admin-orders__th${i === 2 ? ' admin-orders__th--right' : ''}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {roots.map(category => {
                                    const kids = childrenOf(category.id)
                                    const isExpanded = expandedIds.has(category.id)
                                    const rows = [
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            depth={0}
                                            hasChildren={kids.length > 0}
                                            isExpanded={isExpanded}
                                            onToggleExpand={() => toggleExpanded(category.id)}
                                            isEditing={editId === category.id}
                                            editVals={editVals}
                                            setEditVals={setEditVals}
                                            editSaving={editSaving}
                                            onStartEdit={() => startEdit(category)}
                                            onCancelEdit={() => setEditId(null)}
                                            onSaveEdit={() => saveEdit(category.id)}
                                            onDelete={() => setDeleteTarget({ id: category.id, name: category.name })}
                                            onAddSub={() => openAddSub(category.id)}
                                            roots={roots}
                                            isSubcategoryEdit={isSubcategoryEdit}
                                        />
                                    ]
                                    if (isExpanded) {
                                        kids.forEach(child => rows.push(
                                            <CategoryRow
                                                key={child.id}
                                                category={child}
                                                depth={1}
                                                hasChildren={false}
                                                isEditing={editId === child.id}
                                                editVals={editVals}
                                                setEditVals={setEditVals}
                                                editSaving={editSaving}
                                                onStartEdit={() => startEdit(child)}
                                                onCancelEdit={() => setEditId(null)}
                                                onSaveEdit={() => saveEdit(child.id)}
                                                onDelete={() => setDeleteTarget({ id: child.id, name: child.name })}
                                                roots={roots}
                                                isSubcategoryEdit={isSubcategoryEdit}
                                            />
                                        ))
                                    }
                                    return rows
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Modal: confirmar eliminación ── */}
            {deleteTarget && (
                <ConfirmModal
                    title="Eliminar categoría"
                    message={`¿Eliminar "${deleteTarget.name}"? Los productos asociados quedarán sin categoría.`}
                    busy={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </section>
    )
}

/* ══════════════════════════════════════════════════
   FILA DE CATEGORÍA (raíz o subcategoría)
   ══════════════════════════════════════════════════ */
function CategoryRow({
    category, depth, hasChildren, isExpanded, onToggleExpand,
    isEditing, editVals, setEditVals, editSaving,
    onStartEdit, onCancelEdit, onSaveEdit, onDelete, onAddSub,
    roots, isSubcategoryEdit,
}) {
    return (
        <tr className="admin-orders__row">
            {/* Name — editable, indentada si es subcategoría */}
            <td className="admin-orders__td admin-orders__td--white" style={{ fontWeight: depth === 0 ? 500 : 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', paddingLeft: depth ? '1.5rem' : 0 }}>
                    {depth > 0 && (
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#475569' }}>
                            subdirectory_arrow_right
                        </span>
                    )}
                    {depth === 0 && hasChildren && (
                        <button
                            onClick={onToggleExpand}
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            style={{ display: 'flex', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                                {isExpanded ? 'expand_more' : 'chevron_right'}
                            </span>
                        </button>
                    )}
                    {isEditing ? (
                        <input
                            value={editVals.name}
                            onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                            style={{ ...S.inlineInput, width: '160px' }}
                            aria-label="Edit name"
                        />
                    ) : (
                        category.name
                    )}
                </div>
            </td>

            {/* Slug — editable */}
            <td className="admin-orders__td admin-orders__td--mono" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                {isEditing ? (
                    <input
                        value={editVals.slug}
                        onChange={e => setEditVals(v => ({ ...v, slug: e.target.value }))}
                        style={{ ...S.inlineInput, width: '160px' }}
                        aria-label="Edit slug"
                    />
                ) : (
                    category.slug
                )}
            </td>

            {/* Actions */}
            <td className="admin-orders__td admin-orders__td--right">
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.375rem' }}>
                    {isEditing ? (
                        <>
                            {isSubcategoryEdit && (
                                <select
                                    value={editVals.parent_id}
                                    onChange={e => setEditVals(v => ({ ...v, parent_id: e.target.value }))}
                                    style={{ ...S.inlineInput, marginRight: '0.5rem' }}
                                    aria-label="Edit parent category"
                                >
                                    <option value="">— Sin categoría padre —</option>
                                    {roots.filter(r => r.id !== category.id).map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            )}
                            <ActionBtn icon="check" color="#10b981" title="Save changes" onClick={onSaveEdit} disabled={editSaving} />
                            <ActionBtn icon="close" color="#94a3b8" title="Cancel edit" onClick={onCancelEdit} />
                        </>
                    ) : (
                        <>
                            {depth === 0 && (
                                <ActionBtn icon="add" color="#10b981" title="Add subcategory" onClick={onAddSub} />
                            )}
                            <ActionBtn icon="edit" color="var(--admin-primary)" title="Edit name / slug" onClick={onStartEdit} />
                            <ActionBtn icon="delete" color="#ef4444" title="Delete category" onClick={onDelete} />
                        </>
                    )}
                </div>
            </td>
        </tr>
    )
}
