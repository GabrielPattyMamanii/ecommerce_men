/**
 * BrandsTable.jsx — Admin: Marcas con las que se trabaja
 * Se muestra como pestaña dentro de /admin/categorias.
 *
 * Operaciones Supabase:
 *  - SELECT  brands
 *  - INSERT  marca nueva (name, slug autogenerado)
 *  - UPDATE  name y slug por fila (edición inline)
 *  - DELETE  marca con confirmación (productos asociados quedan sin marca — ON DELETE SET NULL)
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, slugify, ActionBtn, ConfirmModal } from './CategoriesTable'

export default function BrandsTable() {
    const [brands, setBrands]   = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    const [showAdd, setShowAdd] = useState(false)
    const [name, setName]       = useState('')
    const [saving, setSaving]   = useState(false)

    const [editId, setEditId]         = useState(null)
    const [editVals, setEditVals]     = useState({ name: '', slug: '' })
    const [editSaving, setEditSaving] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting]         = useState(false)

    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('brands')
            .select('id, name, slug, created_at')
            .order('name', { ascending: true })
        if (err) setError(err.message)
        else setBrands(data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    /* Traduce el error de unicidad (23505) a un mensaje accionable */
    function friendlyError(err) {
        return err.code === '23505' ? 'Ya existe una marca con ese nombre.' : err.message
    }

    async function handleAdd(e) {
        e.preventDefault()
        setSaving(true)
        setError(null)
        const trimmed = name.trim()
        const { error: err } = await supabase.from('brands').insert({ name: trimmed, slug: slugify(trimmed) })
        if (err) setError(friendlyError(err))
        else { setName(''); setShowAdd(false); load() }
        setSaving(false)
    }

    async function saveEdit(id) {
        setEditSaving(true)
        setError(null)
        const { error: err } = await supabase.from('brands').update({
            name: editVals.name.trim(),
            slug: slugify(editVals.slug.trim() || editVals.name),
        }).eq('id', id)
        if (err) setError(friendlyError(err))
        else { setEditId(null); load() }
        setEditSaving(false)
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        setError(null)
        const { error: err } = await supabase.from('brands').delete().eq('id', deleteTarget.id)
        if (err) setError(err.message)
        else load()
        setDeleting(false)
        setDeleteTarget(null)
    }

    return (
        <section aria-label="Gestión de marcas">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--admin-text-faint)' }}>({brands.length}) marcas</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={load} style={S.btnGhost} title="Actualizar">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                        Actualizar
                    </button>
                    <button
                        onClick={() => { setShowAdd(p => !p); setName('') }}
                        style={{ ...S.btnPrimary, background: showAdd ? 'var(--admin-border-strong)' : 'var(--admin-primary)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{showAdd ? 'close' : 'add'}</span>
                        {showAdd ? 'Cancel' : 'Add Brand'}
                    </button>
                </div>
            </div>

            {showAdd && (
                <form
                    onSubmit={handleAdd}
                    style={{
                        background: 'var(--admin-card)', border: '1px solid rgba(13,70,242,0.35)',
                        borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1rem', alignItems: 'end',
                    }}
                >
                    <div>
                        <label style={S.label}>Name *</label>
                        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Nike" style={S.input} />
                    </div>
                    <div>
                        <label style={S.label}>Slug (auto)</label>
                        <input disabled value={slugify(name)} style={{ ...S.input, color: 'var(--admin-text-faint)', cursor: 'not-allowed' }} />
                    </div>
                    <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{saving ? 'progress_activity' : 'save'}</span>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </form>
            )}

            {error && (
                <div role="alert" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
                    color: 'var(--admin-red)', fontFamily: 'monospace', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                    {error}
                </div>
            )}

            <div className="admin-orders">
                <div className="admin-orders__table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--admin-text-faint)' }}>
                            <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cargando marcas…</span>
                        </div>
                    ) : brands.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--admin-border-strong)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>sell</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No brands — add one above</p>
                        </div>
                    ) : (
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    {['Nombre', 'Slug', 'Acciones'].map((h, i) => (
                                        <th key={h} className={`admin-orders__th${i === 2 ? ' admin-orders__th--right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {brands.map(brand => {
                                    const isEditing = editId === brand.id
                                    return (
                                        <tr key={brand.id} className="admin-orders__row">
                                            <td className="admin-orders__td admin-orders__td--white" style={{ fontWeight: 500 }}>
                                                {isEditing ? (
                                                    <input
                                                        value={editVals.name}
                                                        onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                                                        style={{ ...S.inlineInput, width: '160px' }} aria-label="Editar nombre"
                                                    />
                                                ) : brand.name}
                                            </td>
                                            <td className="admin-orders__td admin-orders__td--mono" style={{ color: 'var(--admin-text-faint)', fontSize: '0.8rem' }}>
                                                {isEditing ? (
                                                    <input
                                                        value={editVals.slug}
                                                        onChange={e => setEditVals(v => ({ ...v, slug: e.target.value }))}
                                                        style={{ ...S.inlineInput, width: '160px' }} aria-label="Editar slug"
                                                    />
                                                ) : brand.slug}
                                            </td>
                                            <td className="admin-orders__td admin-orders__td--right">
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.375rem' }}>
                                                    {isEditing ? (
                                                        <>
                                                            <ActionBtn icon="check" color="var(--admin-green)" title="Guardar cambios" onClick={() => saveEdit(brand.id)} disabled={editSaving} />
                                                            <ActionBtn icon="close" color="var(--admin-text-muted)" title="Cancelar edición" onClick={() => setEditId(null)} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ActionBtn icon="edit" color="var(--admin-primary)" title="Editar nombre / slug" onClick={() => { setEditId(brand.id); setEditVals({ name: brand.name, slug: brand.slug }) }} />
                                                            <ActionBtn icon="delete" color="var(--admin-red)" title="Eliminar marca" onClick={() => setDeleteTarget({ id: brand.id, name: brand.name })} />
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

            {deleteTarget && (
                <ConfirmModal
                    title="Eliminar marca"
                    message={`¿Eliminar "${deleteTarget.name}"? Los productos asociados quedarán sin marca.`}
                    busy={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </section>
    )
}
