/**
 * UsersTable.jsx — Admin: Usuarios de staff
 * Ruta: /admin/usuarios (admin-only — ver RequirePermission en App.jsx)
 *
 * Operaciones:
 *  - SELECT  profiles (role='staff') + admin_permissions
 *  - Alta / contraseña / borrado → Edge Function manage-admin-user
 *    (requieren Supabase Auth Admin API, service_role)
 *  - Edición de username/permisos → directo vía supabase.from(...) (RLS admin)
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, ActionBtn, ConfirmModal } from '../../../../components/admin/AdminKit'
import UserFormModal from './components/UserFormModal'
import ResetPasswordModal from './components/ResetPasswordModal'
import { SECTION_LABELS } from './sections'

function PermissionBadges({ permissions }) {
    if (!permissions?.length) {
        return <span style={{ color: '#475569' }}>— sin permisos —</span>
    }
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {permissions.map(section => (
                <span key={section} style={{
                    padding: '0.125rem 0.5rem', borderRadius: '2px',
                    background: 'rgba(13,70,242,0.12)', border: '1px solid rgba(13,70,242,0.35)',
                    color: 'var(--admin-primary)', fontSize: '0.7rem', fontFamily: 'monospace',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                    {SECTION_LABELS[section] ?? section}
                </span>
            ))}
        </div>
    )
}

export default function UsersTable() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [modalKey, setModalKey] = useState(0)
    const [modalError, setModalError] = useState(null)
    const [saving, setSaving] = useState(false)

    const [deletingUser, setDeletingUser] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const [resettingUser, setResettingUser] = useState(null)

    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('profiles')
            .select('id, username, email, created_at, admin_permissions(section)')
            .eq('role', 'staff')
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setUsers(
            (data ?? []).map(u => ({ ...u, permissions: (u.admin_permissions ?? []).map(p => p.section) }))
        )
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleSave(values, onSuccess) {
        setSaving(true)
        setModalError(null)
        try {
            if (editingUser) {
                const { error: profileErr } = await supabase
                    .from('profiles')
                    .update({ username: values.username.trim() })
                    .eq('id', editingUser.id)
                if (profileErr) throw profileErr

                const { error: deleteErr } = await supabase
                    .from('admin_permissions')
                    .delete()
                    .eq('user_id', editingUser.id)
                if (deleteErr) throw deleteErr

                if (values.permissions.length > 0) {
                    const { error: insertErr } = await supabase
                        .from('admin_permissions')
                        .insert(values.permissions.map(section => ({ user_id: editingUser.id, section })))
                    if (insertErr) throw insertErr
                }
            } else {
                const { error: fnError } = await supabase.functions.invoke('manage-admin-user', {
                    body: {
                        action: 'create',
                        username: values.username.trim(),
                        email: values.email.trim(),
                        password: values.password,
                        permissions: values.permissions,
                    },
                })
                if (fnError) throw fnError
            }

            onSuccess()
            setShowModal(false)
            setEditingUser(null)
            load()
        } catch (err) {
            setModalError(err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!deletingUser) return
        setDeleting(true)
        setError(null)
        try {
            const { error: fnError } = await supabase.functions.invoke('manage-admin-user', {
                body: { action: 'delete', userId: deletingUser.id },
            })
            if (fnError) throw fnError
            setDeletingUser(null)
            load()
        } catch (err) {
            setError(err.message)
        } finally {
            setDeleting(false)
        }
    }

    async function handleResetPassword(password) {
        const { error: fnError } = await supabase.functions.invoke('manage-admin-user', {
            body: { action: 'reset_password', userId: resettingUser.id, password },
        })
        if (fnError) throw new Error(fnError.message)
    }

    function openAddModal() {
        setEditingUser(null)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }
    function openEditModal(user) {
        setEditingUser(user)
        setModalError(null)
        setModalKey(k => k + 1)
        setShowModal(true)
    }

    return (
        <section aria-label="Usuarios de staff">

            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Access Management
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Usuarios
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({users.length})
                        </span>
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={load} style={S.btnGhost} title="Refresh">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                        Refresh
                    </button>
                    <button onClick={openAddModal} style={S.btnPrimary}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                        Add User
                    </button>
                </div>
            </div>

            <UserFormModal
                key={modalKey}
                isOpen={showModal}
                initialUser={editingUser}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                saving={saving}
                error={modalError}
            />

            {resettingUser && (
                <ResetPasswordModal
                    user={resettingUser}
                    onConfirm={handleResetPassword}
                    onClose={() => setResettingUser(null)}
                />
            )}

            {deletingUser && (
                <ConfirmModal
                    title="Eliminar usuario"
                    message={`¿Eliminar a "${deletingUser.username}"? Perderá acceso al panel de inmediato y no se puede deshacer.`}
                    busy={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingUser(null)}
                />
            )}

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

            <div className="admin-orders">
                <div className="admin-orders__table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                            <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loading users…</span>
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>group_off</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No hay usuarios de staff — agrega uno arriba</p>
                        </div>
                    ) : (
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    {['Usuario', 'Email', 'Permisos', 'Creado', 'Actions'].map((h, i) => (
                                        <th key={h} className={`admin-orders__th${i === 4 ? ' admin-orders__th--right' : ''}`}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="admin-orders__row">
                                        <td className="admin-orders__td admin-orders__td--white" style={{ fontWeight: 500 }}>
                                            {user.username || '—'}
                                        </td>
                                        <td className="admin-orders__td" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                            {user.email || '—'}
                                        </td>
                                        <td className="admin-orders__td">
                                            <PermissionBadges permissions={user.permissions} />
                                        </td>
                                        <td className="admin-orders__td admin-orders__td--mono" style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="admin-orders__td admin-orders__td--right">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                <ActionBtn
                                                    icon="edit" color="var(--admin-primary)" title="Editar permisos"
                                                    onClick={() => openEditModal(user)}
                                                />
                                                <ActionBtn
                                                    icon="key" color="#eab308" title="Restablecer contraseña"
                                                    onClick={() => setResettingUser(user)}
                                                />
                                                <ActionBtn
                                                    icon="delete" color="#ef4444" title="Eliminar usuario"
                                                    onClick={() => setDeletingUser(user)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </section>
    )
}
