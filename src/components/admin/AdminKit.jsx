/**
 * AdminKit — UI compartida para secciones admin nuevas (Inventario/ControlInventario).
 * Extraído del patrón ya usado en CouponsTable.jsx/CategoriesTable.jsx (S,
 * ActionBtn, ConfirmModal, Toast/ToastStack) para no duplicarlo una vez más
 * en 7+ archivos nuevos. No se toca ni refactoriza ninguna sección existente
 * para que lo consuma — es un módulo nuevo y aislado.
 */
/* eslint-disable react-refresh/only-export-components -- kit compartido, no una página; mezcla adrede estilos/hooks con componentes */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/* ── Estilos reutilizables (mismo patrón que ProductsTable/CategoriesTable/CouponsTable) ── */
export const S = {
    label: {
        display: 'block', fontSize: '0.65rem', fontWeight: 600,
        color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: '0.375rem', fontFamily: 'monospace',
    },
    input: {
        width: '100%', padding: '0.5rem 0.75rem', boxSizing: 'border-box',
        background: 'var(--admin-field-bg)', border: '1px solid var(--admin-border-strong)', borderRadius: '10px',
        color: 'var(--admin-text)', fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    inlineInput: {
        padding: '0.375rem 0.625rem', boxSizing: 'border-box',
        background: 'var(--admin-field-bg)', border: '1px solid var(--admin-border-strong)', borderRadius: '8px',
        color: 'var(--admin-text)', fontFamily: 'monospace', fontSize: '0.8rem', outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    btnPrimary: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.55rem 1.4rem', background: 'var(--admin-primary)',
        border: 'none', borderRadius: '9999px', cursor: 'pointer',
        color: 'white', fontFamily: 'var(--admin-font)',
        fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'transform 0.15s, box-shadow 0.15s',
    },
    btnGhost: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.5rem 1.1rem', background: 'var(--admin-border)',
        border: '1px solid var(--admin-border-strong)', borderRadius: '9999px', cursor: 'pointer',
        color: 'var(--admin-text-muted)', fontFamily: 'var(--admin-font)',
        fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'border-color 0.15s, color 0.15s',
    },
}

/* ── Botón de acción por tarjeta/fila (edit / delete / etc.) ── */
export function ActionBtn({ icon, color, title, onClick, disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            style={{
                display: 'flex', alignItems: 'center', padding: '0.375rem',
                background: 'transparent', border: `1px solid ${color}33`,
                borderRadius: '9999px', color, cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1, transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = `${color}18` }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{icon}</span>
        </button>
    )
}

/* ── Toggle switch accesible ── */
export function ToggleSwitch({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            disabled={disabled}
            style={{
                width: '38px', height: '20px', borderRadius: '999px', border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
                background: checked ? '#10b981' : 'var(--admin-border-strong)', position: 'relative',
                transition: 'background-color 0.15s', padding: 0, flexShrink: 0,
            }}
        >
            <span style={{
                position: 'absolute', top: '2px', left: checked ? '20px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                transition: 'left 0.15s',
            }} />
        </button>
    )
}

/* ── Toast individual: se auto-descarta ── */
export function Toast({ id, type, message, onDismiss }) {
    useEffect(() => {
        const t = setTimeout(() => onDismiss(id), 3500)
        return () => clearTimeout(t)
    }, [id, onDismiss])

    const isError = type === 'error'
    return (
        <div role="status" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '260px',
            padding: '0.75rem 1rem', borderRadius: '12px',
            background: isError ? '#1f1315' : '#0f1f1a',
            border: `1px solid ${isError ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: isError ? '#ef4444' : '#10b981',
            fontFamily: 'monospace', fontSize: '0.8rem', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                {isError ? 'error' : 'check_circle'}
            </span>
            <span style={{ flex: 1 }}>{message}</span>
            <button
                onClick={() => onDismiss(id)} aria-label="Cerrar"
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
            </button>
        </div>
    )
}

export function ToastStack({ toasts, onDismiss }) {
    if (toasts.length === 0) return null
    return (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1200, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {toasts.map(t => <Toast key={t.id} {...t} onDismiss={onDismiss} />)}
        </div>
    )
}

/** Hook con el patrón toasts/addToast/dismissToast que CouponsTable reimplementa inline. */
export function useToasts() {
    const [toasts, setToasts] = useState([])
    function addToast(type, message) {
        setToasts(prev => [...prev, { id: crypto.randomUUID(), type, message }])
    }
    function dismissToast(id) {
        setToasts(prev => prev.filter(t => t.id !== id))
    }
    return { toasts, addToast, dismissToast }
}

/* Raíz del portal — un hijo directo de .admin-layout escapa del stacking
   context que .admin-main__content crea (su z-index local "cubre" a los
   descendientes con position:fixed aunque tengan un z-index mayor, por eso
   un modal renderizado ahí quedaba tapado por el header). Portando acá
   como hermano de .admin-main, el modal hereda las variables --admin-*
   (sigue dentro de .admin-layout) y pinta por encima de todo el shell. */
function getAdminPortalRoot() {
    return document.querySelector('.admin-layout') || document.body
}

/* ── Modal de confirmación (eliminar / acciones destructivas) ── */
export function ConfirmModal({ title, message, busy, confirmLabel = 'Eliminar', busyLabel = 'Eliminando…', onConfirm, onCancel }) {
    return createPortal((
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title}
                style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: '18px', padding: '1.5rem', maxWidth: '380px', width: '100%' }}
            >
                <h3 style={{ margin: '0 0 0.75rem', color: 'var(--admin-text)', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={onCancel} style={S.btnGhost}>Cancelar</button>
                    <button
                        onClick={onConfirm} disabled={busy}
                        style={{ ...S.btnPrimary, background: '#ef4444', opacity: busy ? 0.6 : 1 }}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    ), getAdminPortalRoot())
}
