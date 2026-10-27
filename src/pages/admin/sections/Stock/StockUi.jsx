/* eslint-disable react-refresh/only-export-components -- UI compartida del módulo Stock */
import { createPortal } from 'react-dom'
import { NIVEL_META } from '../../../../lib/stockUtils'

export function NivelBadge({ nivel }) {
    const m = NIVEL_META[nivel] ?? NIVEL_META.normal
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.6rem',
            borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: m.color, border: `1px solid ${m.color}55`, background: `${m.color}18`,
            whiteSpace: 'nowrap',
        }}>
            {nivel !== 'normal' && <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>warning</span>}
            {m.label}
        </span>
    )
}

export function Modal({ title, onClose, children }) {
    return createPortal((
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
                style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: '18px', padding: '1.5rem', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <h3 style={{ margin: '0 0 1rem', color: 'var(--admin-text)', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
                {children}
            </div>
        </div>
    ), document.querySelector('.admin-layout') || document.body)
}

export function FormError({ message }) {
    if (!message) return null
    return (
        <div role="alert" style={{ marginBottom: '1rem', padding: '0.625rem 0.875rem', borderRadius: '10px', background: '#ef444418', border: '1px solid #ef444455', color: '#ef4444', fontSize: '0.8rem' }}>
            {message}
        </div>
    )
}

export function PageHeader({ title, children }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--admin-text)', textTransform: 'uppercase' }}>{title}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{children}</div>
        </div>
    )
}

export const cellStyle = { padding: '0.625rem 0.75rem', fontSize: '0.8rem', color: 'var(--admin-text)', fontFamily: 'monospace', borderBottom: '1px solid var(--admin-border)' }
export const headStyle = { ...cellStyle, fontSize: '0.65rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }
