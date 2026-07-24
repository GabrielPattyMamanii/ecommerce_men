import { useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'

const MIN_PASSWORD_LENGTH = 12

export default function ResetPasswordModal({ user, onConfirm, onClose }) {
    const [password, setPassword] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
            return
        }
        setSaving(true)
        setError(null)
        try {
            await onConfirm(password)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            onClick={saving ? undefined : onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={`Restablecer contraseña de ${user.username}`}
                style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', width: '100%', maxWidth: '400px' }}
            >
                <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.75rem', color: 'white', fontSize: '1.05rem', fontWeight: 700 }}>
                        Restablecer contraseña
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                        Nueva contraseña para <strong style={{ color: '#e2e8f0' }}>{user.username}</strong>.
                    </p>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div role="alert" style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '2px', padding: '0.75rem 1rem', color: '#ef4444', marginBottom: '1rem',
                                fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                                {error}
                            </div>
                        )}

                        <label style={S.label}>Nueva contraseña *</label>
                        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                            <input
                                type={showPassword ? 'text' : 'password'} required minLength={MIN_PASSWORD_LENGTH} value={password} autoFocus
                                onChange={e => setPassword(e.target.value)}
                                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                                style={{ ...S.input, paddingRight: '2.5rem' }}
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" onClick={onClose} disabled={saving} style={S.btnGhost}>Cancelar</button>
                            <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                                {saving ? 'Guardando…' : 'Restablecer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
