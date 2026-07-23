/**
 * CouponsTable.jsx — Admin: Cupones de descuento (banner + contador regresivo)
 * Rutas: /admin/cupones
 *
 * Operaciones Supabase (tabla `coupons`, RLS: solo admin escribe):
 *  - SELECT  coupons
 *  - INSERT  cupón nuevo (name, code, discount_percentage, description, message,
 *            has_counter, counter_duration_seconds, status)
 *  - UPDATE  edición de campos, toggle de estado, activar/ocultar banner, reset de contador
 *  - DELETE  cupón con confirmación modal
 *
 * Reglas de negocio:
 *  - Solo un cupón puede tener show_in_banner = true a la vez (blindado también
 *    por índice único parcial en DB — ver supabase/migration-coupons.sql).
 *  - Pasar a "borrador" oculta el cupón del banner automáticamente.
 *  - Reactivar ("borrador" → "publicado") un cupón con contador reinicia
 *    counter_end_time desde el momento actual y lo activa como banner exclusivo.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'

/* ── Estilos reutilizables (mismo patrón que ProductsTable/CategoriesTable) ── */
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

/* ── Botón de acción por tarjeta (edit / delete) ── */
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

/* ── Toggle switch accesible (estado borrador/publicado) ── */
function ToggleSwitch({ checked, onChange, label, disabled }) {
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
                background: checked ? '#10b981' : '#334155', position: 'relative',
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
function Toast({ id, type, message, onDismiss }) {
    useEffect(() => {
        const t = setTimeout(() => onDismiss(id), 3500)
        return () => clearTimeout(t)
    }, [id, onDismiss])

    const isError = type === 'error'
    return (
        <div role="status" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '260px',
            padding: '0.75rem 1rem', borderRadius: '2px',
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

function ToastStack({ toasts, onDismiss }) {
    if (toasts.length === 0) return null
    return (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1200, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {toasts.map(t => <Toast key={t.id} {...t} onDismiss={onDismiss} />)}
        </div>
    )
}

/* ── Modal de confirmación (eliminar) ── */
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

/* ── Conversión duración ↔ segundos (días/horas/minutos) ── */
function secondsToParts(totalSeconds) {
    const s = Number(totalSeconds) || 0
    return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
    }
}
function partsToSeconds({ days, hours, minutes }) {
    return (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60
}

/* ── Formatea el tiempo restante como "2d 03:15:42" o "03:15:42" ── */
function formatCountdown(ms) {
    if (ms <= 0) return 'Expirado'
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = n => String(n).padStart(2, '0')
    return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const EMPTY_FORM = {
    name: '', code: '', discount_percentage: '', description: '', message: '',
    has_counter: false, days: '0', hours: '0', minutes: '0', status: 'borrador',
}

/* ── Timestamp ISO futuro a partir de una duración en segundos (fuera del
     componente: evita que el linter de React Compiler lo marque como una
     llamada impura "durante el render") ── */
function futureIso(durationSeconds) {
    return durationSeconds ? new Date(Date.now() + durationSeconds * 1000).toISOString() : null
}

/* ── Activa un cupón como banner exclusivo: desactiva cualquier otro banner
     activo y (re)calcula counter_end_time si el cupón tiene contador ── */
async function activateBannerCore(id, durationSeconds, extraPatch = {}) {
    await supabase.from('coupons').update({ show_in_banner: false }).eq('show_in_banner', true).neq('id', id)
    const patch = { ...extraPatch, show_in_banner: true, counter_end_time: futureIso(durationSeconds) }
    return supabase.from('coupons').update(patch).eq('id', id)
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function CouponsTable() {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    /* ─ Reloj para el countdown en vivo ─ */
    const [nowMs, setNowMs] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    /* ─ Toasts ─ */
    const [toasts, setToasts] = useState([])
    function addToast(type, message) {
        setToasts(prev => [...prev, { id: crypto.randomUUID(), type, message }])
    }
    function dismissToast(id) {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    /* ─ Modal crear/editar ─ */
    const [showForm, setShowForm]   = useState(false)
    const [formMode, setFormMode]   = useState('create')
    const [editingId, setEditingId] = useState(null)
    const [form, setForm]           = useState(EMPTY_FORM)
    const [formError, setFormError] = useState(null)
    const [saving, setSaving]       = useState(false)

    /* ─ Modal eliminar ─ */
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)

    /* ─ Fetch ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setCoupons(data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    /* ─ Abrir formulario ─ */
    function openCreate() {
        setFormMode('create')
        setEditingId(null)
        setForm(EMPTY_FORM)
        setFormError(null)
        setShowForm(true)
    }
    function openEdit(coupon) {
        const parts = secondsToParts(coupon.counter_duration_seconds || 0)
        setFormMode('edit')
        setEditingId(coupon.id)
        setForm({
            name: coupon.name,
            code: coupon.code,
            discount_percentage: String(coupon.discount_percentage),
            description: coupon.description || '',
            message: coupon.message || '',
            has_counter: coupon.has_counter,
            days: String(parts.days), hours: String(parts.hours), minutes: String(parts.minutes),
            status: coupon.status,
        })
        setFormError(null)
        setShowForm(true)
    }

    /* ─ Guardar (crear o editar) ─ */
    async function handleSubmit(e) {
        e.preventDefault()
        setFormError(null)

        const discount = parseInt(form.discount_percentage, 10)
        if (!form.name.trim())  { setFormError('El nombre interno es obligatorio'); return }
        if (!form.code.trim())  { setFormError('El código es obligatorio'); return }
        if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
            setFormError('El descuento debe ser un entero entre 1 y 100'); return
        }
        const durationSeconds = partsToSeconds(form)
        if (form.has_counter && durationSeconds <= 0) {
            setFormError('Configurá una duración mayor a 0 para el contador'); return
        }

        setSaving(true)
        const payload = {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            discount_percentage: discount,
            description: form.description.trim() || null,
            message: form.message.trim() || null,
            has_counter: form.has_counter,
            counter_duration_seconds: form.has_counter ? durationSeconds : null,
        }

        if (formMode === 'create') {
            payload.status = form.status
            const { data, error: err } = await supabase.from('coupons').insert(payload).select('id').single()
            if (err) { setFormError(err.message); setSaving(false); return }
            // Publicar con contador activa el banner de inmediato (misma regla que "reactivar con contador").
            if (form.status === 'publicado' && form.has_counter) {
                const { error: bannerErr } = await activateBannerCore(data.id, durationSeconds)
                if (bannerErr) addToast('error', bannerErr.message)
            }
            addToast('success', `Cupón "${payload.name}" creado`)
        } else {
            if (!form.has_counter) payload.counter_end_time = null
            const { error: err } = await supabase.from('coupons').update(payload).eq('id', editingId)
            if (err) { setFormError(err.message); setSaving(false); return }
            addToast('success', `Cupón "${payload.name}" actualizado`)
        }

        setSaving(false)
        setShowForm(false)
        load()
    }

    /* ─ Eliminar ─ */
    async function handleDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        const { error: err } = await supabase.from('coupons').delete().eq('id', deleteTarget.id)
        if (err) addToast('error', err.message)
        else { addToast('success', `Cupón "${deleteTarget.name}" eliminado`); load() }
        setDeleting(false)
        setDeleteTarget(null)
    }

    /* ─ Toggle borrador/publicado ─ */
    async function toggleStatus(coupon) {
        if (coupon.status === 'publicado') {
            const { error: err } = await supabase.from('coupons')
                .update({ status: 'borrador', show_in_banner: false })
                .eq('id', coupon.id)
            if (err) addToast('error', err.message)
            else { addToast('success', `"${coupon.name}" pasó a borrador`); load() }
            return
        }

        // Reactivar: si tiene contador, reinicia counter_end_time y activa el banner en exclusiva.
        if (coupon.has_counter && coupon.counter_duration_seconds) {
            const { error: err } = await activateBannerCore(coupon.id, coupon.counter_duration_seconds, { status: 'publicado' })
            if (err) addToast('error', err.message)
            else { addToast('success', `"${coupon.name}" publicado y banner activado`); load() }
        } else {
            const { error: err } = await supabase.from('coupons').update({ status: 'publicado' }).eq('id', coupon.id)
            if (err) addToast('error', err.message)
            else { addToast('success', `"${coupon.name}" publicado`); load() }
        }
    }

    /* ─ Activar como banner (cupón ya publicado) ─ */
    async function activateBanner(coupon) {
        const { error: err } = await activateBannerCore(coupon.id, coupon.has_counter ? coupon.counter_duration_seconds : null)
        if (err) addToast('error', err.message)
        else { addToast('success', `Banner activado: "${coupon.name}"`); load() }
    }

    /* ─ Ocultar banner sin eliminar el cupón ─ */
    async function deactivateBanner(coupon) {
        const { error: err } = await supabase.from('coupons').update({ show_in_banner: false }).eq('id', coupon.id)
        if (err) addToast('error', err.message)
        else { addToast('success', 'Banner ocultado'); load() }
    }

    /* ─ Reiniciar contador desde el momento actual ─ */
    async function resetCounter(coupon) {
        const counter_end_time = futureIso(coupon.counter_duration_seconds)
        const { error: err } = await supabase.from('coupons').update({ counter_end_time }).eq('id', coupon.id)
        if (err) addToast('error', err.message)
        else { addToast('success', 'Contador reiniciado'); load() }
    }

    const publishedCount = useMemo(() => coupons.filter(c => c.status === 'publicado').length, [coupons])

    /* ════════════════ RENDER ════════════════ */
    return (
        <section aria-label="Coupon management">

            {/* ── Encabezado de sección ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Coupon Management
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Cupones
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({coupons.length} · {publishedCount} publicados)
                        </span>
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={load} style={S.btnGhost} title="Refresh">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                        Refresh
                    </button>
                    <button onClick={openCreate} style={S.btnPrimary}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                        Nuevo cupón
                    </button>
                </div>
            </div>

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

            {/* ── Grid de tarjetas ── */}
            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loading coupons…</span>
                </div>
            ) : coupons.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>redeem</span>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No coupons — creá uno arriba</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {coupons.map(coupon => (
                        <CouponCard
                            key={coupon.id}
                            coupon={coupon}
                            nowMs={nowMs}
                            onEdit={() => openEdit(coupon)}
                            onDeleteRequest={() => setDeleteTarget(coupon)}
                            onToggleStatus={() => toggleStatus(coupon)}
                            onActivateBanner={() => activateBanner(coupon)}
                            onDeactivateBanner={() => deactivateBanner(coupon)}
                            onResetCounter={() => resetCounter(coupon)}
                        />
                    ))}
                </div>
            )}

            {/* ── Modal: crear/editar ── */}
            {showForm && (
                <CouponFormModal
                    mode={formMode}
                    form={form}
                    setForm={setForm}
                    error={formError}
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {/* ── Modal: confirmar eliminación ── */}
            {deleteTarget && (
                <ConfirmModal
                    title="Eliminar cupón"
                    message={`¿Eliminar "${deleteTarget.name}" (${deleteTarget.code})? Esta acción no se puede deshacer.`}
                    busy={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </section>
    )
}

/* ══════════════════════════════════════════════════
   TARJETA DE CUPÓN
   ══════════════════════════════════════════════════ */
function CouponCard({ coupon, nowMs, onEdit, onDeleteRequest, onToggleStatus, onActivateBanner, onDeactivateBanner, onResetCounter }) {
    const isPublished = coupon.status === 'publicado'
    const remainingMs = coupon.counter_end_time ? new Date(coupon.counter_end_time).getTime() - nowMs : null
    const expired = remainingMs !== null && remainingMs <= 0

    return (
        <div style={{
            background: '#161b2e', border: `1px solid ${coupon.show_in_banner ? 'rgba(13,70,242,0.5)' : '#1e293b'}`,
            borderRadius: '4px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {coupon.name}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--admin-primary)', letterSpacing: '0.05em' }}>
                        {coupon.code} · {coupon.discount_percentage}% OFF
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <ActionBtn icon="edit" color="var(--admin-primary)" title="Editar cupón" onClick={onEdit} />
                    <ActionBtn icon="delete" color="#ef4444" title="Eliminar cupón" onClick={onDeleteRequest} />
                </div>
            </div>

            {coupon.description && (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>{coupon.description}</p>
            )}

            {/* Estado: toggle borrador/publicado */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                <span style={{
                    fontFamily: 'monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: isPublished ? '#10b981' : '#64748b',
                }}>
                    {isPublished ? 'Publicado' : 'Borrador'}
                </span>
                <ToggleSwitch checked={isPublished} onChange={onToggleStatus} label={`Cambiar estado de ${coupon.name}`} />
            </div>

            {/* Banner: solo disponible para cupones publicados */}
            {isPublished && (
                coupon.show_in_banner ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#10b981', fontFamily: 'monospace' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>campaign</span>
                            Banner activo
                        </span>
                        <button onClick={onDeactivateBanner} style={{ ...S.btnGhost, padding: '0.375rem 0.75rem', fontSize: '0.7rem' }}>
                            Ocultar
                        </button>
                    </div>
                ) : (
                    <button onClick={onActivateBanner} style={{ ...S.btnPrimary, padding: '0.375rem 0.75rem', fontSize: '0.7rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>campaign</span>
                        Activar en banner
                    </button>
                )
            )}

            {/* Countdown */}
            {coupon.has_counter && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#0f172a', border: '1px solid #1e293b', borderRadius: '2px', padding: '0.5rem 0.75rem',
                }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: expired ? '#ef4444' : 'white' }}>
                        {coupon.counter_end_time ? formatCountdown(remainingMs) : 'Sin iniciar'}
                    </span>
                    {coupon.counter_duration_seconds > 0 && (
                        <button
                            onClick={onResetCounter} title="Reiniciar contador" aria-label="Reiniciar contador"
                            style={{ ...S.btnGhost, padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>restart_alt</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

/* ══════════════════════════════════════════════════
   MODAL: FORMULARIO CREAR / EDITAR
   ══════════════════════════════════════════════════ */
function CouponFormModal({ mode, form, setForm, error, saving, onSubmit, onCancel }) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}
            onClick={onCancel}
        >
            <form
                onSubmit={onSubmit}
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={mode === 'create' ? 'Crear cupón' : 'Editar cupón'}
                style={{
                    background: '#161b2e', border: '1px solid rgba(13,70,242,0.35)', borderRadius: '4px',
                    padding: '1.5rem', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: '1rem', margin: 'auto',
                }}
            >
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>
                    {mode === 'create' ? 'Nuevo cupón' : 'Editar cupón'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={S.label}>Nombre interno *</label>
                        <input
                            required value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Ej: Promo Verano" style={S.input}
                        />
                    </div>
                    <div>
                        <label style={S.label}>Código *</label>
                        <input
                            required value={form.code}
                            onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                            placeholder="VERANO25" style={{ ...S.input, textTransform: 'uppercase' }}
                        />
                    </div>
                    <div>
                        <label style={S.label}>Descuento (%) *</label>
                        <input
                            required type="number" min="1" max="100" value={form.discount_percentage}
                            onChange={e => setForm(p => ({ ...p, discount_percentage: e.target.value }))}
                            placeholder="25" style={S.input}
                        />
                    </div>
                    {mode === 'create' && (
                        <div>
                            <label style={S.label}>Estado inicial</label>
                            <select
                                value={form.status}
                                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                                style={S.input}
                            >
                                <option value="borrador">Borrador</option>
                                <option value="publicado">Publicado</option>
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <label style={S.label}>Descripción interna</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Nota solo visible en el panel admin" rows={2}
                        style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                </div>

                <div>
                    <label style={S.label}>Mensaje del banner (HTML)</label>
                    <textarea
                        value={form.message}
                        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        placeholder="<strong>25% OFF</strong> en toda la tienda" rows={2}
                        style={{ ...S.input, resize: 'vertical' }}
                    />
                </div>

                {/* Contador regresivo */}
                <div style={{ border: '1px solid #1e293b', borderRadius: '2px', padding: '0.875rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: form.has_counter ? '0.875rem' : 0 }}>
                        <input
                            type="checkbox" checked={form.has_counter}
                            onChange={e => setForm(p => ({ ...p, has_counter: e.target.checked }))}
                        />
                        <span style={{ ...S.label, marginBottom: 0 }}>Contador regresivo</span>
                    </label>
                    {form.has_counter && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            <div>
                                <label style={S.label}>Días</label>
                                <input type="number" min="0" value={form.days} onChange={e => setForm(p => ({ ...p, days: e.target.value }))} style={S.input} />
                            </div>
                            <div>
                                <label style={S.label}>Horas</label>
                                <input type="number" min="0" max="23" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} style={S.input} />
                            </div>
                            <div>
                                <label style={S.label}>Minutos</label>
                                <input type="number" min="0" max="59" value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: e.target.value }))} style={S.input} />
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div role="alert" style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '2px', padding: '0.625rem 0.875rem',
                        color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem',
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={onCancel} style={S.btnGhost}>Cancelar</button>
                    <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                            {saving ? 'progress_activity' : 'save'}
                        </span>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    )
}
