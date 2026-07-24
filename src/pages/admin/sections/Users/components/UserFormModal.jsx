import { useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'
import { ASSIGNABLE_SECTIONS } from '../sections'

const MIN_PASSWORD_LENGTH = 12
const EMPTY_FORM = { username: '', email: '', password: '', permissions: [] }

/**
 * El padre le pasa un `key` distinto cada vez que abre el popup (ver
 * UsersTable), por lo que este componente se remonta en cada apertura y el
 * estado inicial de abajo se recalcula desde `initialUser` sin necesidad de
 * sincronizarlo luego con un efecto. Mismo patrón que ProductFormModal.
 */
export default function UserFormModal({ isOpen, initialUser = null, onClose, onSave, saving, error }) {
    const isEditMode = Boolean(initialUser)
    const [form, setForm] = useState(() => (
        initialUser
            ? {
                username: initialUser.username || '',
                email: initialUser.email || '',
                password: '',
                permissions: initialUser.permissions ? [...initialUser.permissions] : [],
            }
            : EMPTY_FORM
    ))
    const [validationError, setValidationError] = useState(null)
    const [showPassword, setShowPassword] = useState(false)

    if (!isOpen) return null

    function resetAndClose() {
        setValidationError(null)
        onClose()
    }

    function toggleSection(key) {
        setForm(p => ({
            ...p,
            permissions: p.permissions.includes(key)
                ? p.permissions.filter(s => s !== key)
                : [...p.permissions, key],
        }))
    }

    function handleSubmit(e) {
        e.preventDefault()
        setValidationError(null)

        if (!form.username.trim()) {
            setValidationError('El nombre de usuario es obligatorio')
            return
        }
        if (!isEditMode) {
            if (!form.email.trim()) {
                setValidationError('El correo electrónico es obligatorio')
                return
            }
            if (form.password.length < MIN_PASSWORD_LENGTH) {
                setValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
                return
            }
        }

        onSave(form, resetAndClose)
    }

    return (
        <div
            onClick={saving ? undefined : resetAndClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={isEditMode ? 'Editar usuario' : 'Nuevo usuario'}
                style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#161b2e' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--admin-primary)' }}>{isEditMode ? 'edit' : 'person_add'}</span>
                        {isEditMode ? 'Editar usuario' : 'Nuevo usuario'}
                    </h2>
                    <button onClick={resetAndClose} disabled={saving} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {(error || validationError) && (
                            <div role="alert" style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '2px', padding: '0.75rem 1rem', color: '#ef4444',
                                fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                                {error || validationError}
                            </div>
                        )}

                        <div>
                            <label style={S.label}>Nombre de usuario *</label>
                            <input
                                required value={form.username}
                                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                                placeholder="ej. maria.ventas" style={S.input}
                            />
                        </div>

                        <div>
                            <label style={S.label}>Correo electrónico *</label>
                            <input
                                type="email" required value={form.email} disabled={isEditMode}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                placeholder="usuario@correo.com"
                                style={{ ...S.input, opacity: isEditMode ? 0.6 : 1 }}
                            />
                            {isEditMode && (
                                <p style={{ margin: '0.375rem 0 0', color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                    El correo no se puede cambiar una vez creado el usuario.
                                </p>
                            )}
                        </div>

                        {!isEditMode && (
                            <div>
                                <label style={S.label}>Contraseña *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'} required minLength={MIN_PASSWORD_LENGTH} value={form.password}
                                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`} style={{ ...S.input, paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                                            background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                                            padding: '0.25rem', display: 'flex', alignItems: 'center', fontSize: '1.1rem'
                                        }}
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={S.label}>Permisos — secciones del panel</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #1e293b', borderRadius: '2px', padding: '0.875rem' }}>
                                {ASSIGNABLE_SECTIONS.map(({ key, label }) => (
                                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={form.permissions.includes(key)}
                                            onChange={() => toggleSection(key)}
                                        />
                                        <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #1e293b', position: 'sticky', bottom: 0, background: '#161b2e' }}>
                        <button type="button" onClick={resetAndClose} disabled={saving} style={S.btnGhost}>Cancelar</button>
                        <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                                {saving ? 'progress_activity' : 'save'}
                            </span>
                            {saving ? 'Guardando…' : isEditMode ? 'Guardar cambios' : 'Crear usuario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
