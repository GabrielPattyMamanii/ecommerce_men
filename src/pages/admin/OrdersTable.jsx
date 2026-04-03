/**
 * OrdersTable.jsx — Admin: Orders Management (Tarea 5.2)
 * Ruta: /admin/ordenes
 *
 * Operaciones Supabase:
 *  - SELECT  orders JOIN profiles (full_name)
 *  - UPDATE  status → 'shipped' (solo órdenes con status = 'paid')
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

/* ── Mapa visual de estados ── */
const STATUS_META = {
    pending: {
        bg:   'rgba(234,179,8,0.1)',
        text: '#eab308',
        ring: 'rgba(234,179,8,0.25)',
        icon: 'schedule',
        label: 'Pending',
    },
    paid: {
        bg:   'rgba(59,130,246,0.1)',
        text: '#3b82f6',
        ring: 'rgba(59,130,246,0.25)',
        icon: 'payments',
        label: 'Paid',
    },
    shipped: {
        bg:   'rgba(16,185,129,0.1)',
        text: '#10b981',
        ring: 'rgba(16,185,129,0.25)',
        icon: 'local_shipping',
        label: 'Shipped',
    },
}

const DEFAULT_META = STATUS_META.pending

/* ── Componente de badge de estado ── */
function StatusBadge({ status }) {
    const meta = STATUS_META[status] ?? DEFAULT_META
    return (
        <span
            className="admin-orders__status"
            style={{
                background: meta.bg,
                color: meta.text,
                boxShadow: `0 0 0 1px ${meta.ring}`,
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">
                {meta.icon}
            </span>
            {meta.label}
        </span>
    )
}

/* ── Botón fantasma reutilizable ── */
const S = {
    btnGhost: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.375rem 0.875rem', background: '#1e293b',
        border: '1px solid #334155', borderRadius: '2px', cursor: 'pointer',
        color: '#94a3b8', fontFamily: 'var(--admin-font)',
        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'border-color 0.15s, color 0.15s',
    },
    btnShip: {
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.3rem 0.75rem', background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.35)', borderRadius: '2px', cursor: 'pointer',
        color: '#10b981', fontFamily: 'var(--admin-font)',
        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'background-color 0.15s',
        whiteSpace: 'nowrap',
    },
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function OrdersTable() {
    const [orders, setOrders]     = useState([])
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(null)
    const [toggling, setToggling] = useState(null) // id de la orden en proceso

    /* ─ Fetch órdenes con nombre del cliente ─ */
    async function load() {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('orders')
            .select('id, status, total, payment_id, customer_name, customer_email, shipping_type, created_at, profiles(full_name)')
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setOrders(data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    /* ─ Marcar como enviado ─ */
    async function markShipped(id) {
        setToggling(id)
        setError(null)
        const { error: err } = await supabase
            .from('orders')
            .update({ status: 'shipped' })
            .eq('id', id)
        if (err) setError(err.message)
        else load()
        setToggling(null)
    }

    /* ─ Totales rápidos para el sub-header ─ */
    const counts = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1
        return acc
    }, {})

    /* ════════════════ RENDER ════════════════ */
    return (
        <section aria-label="Orders management">

            {/* ── Encabezado de sección ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
                justifyContent: 'space-between', gap: '1rem',
                borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '1.5rem',
            }}>
                <div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                        // Orders Log
                    </p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                        Orders
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', letterSpacing: 0, textTransform: 'none' }}>
                            ({orders.length} total)
                        </span>
                    </h2>
                </div>
                <button onClick={load} style={S.btnGhost} title="Refresh orders">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                    Refresh
                </button>
            </div>

            {/* ── Resumen rápido de estados ── */}
            {!loading && orders.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                        <div key={key} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', background: meta.bg,
                            border: `1px solid ${meta.ring}`, borderRadius: '2px',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: meta.text }}>{meta.icon}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: meta.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {meta.label}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>
                                {counts[key] ?? 0}
                            </span>
                        </div>
                    ))}
                </div>
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

            {/* ── Tabla de órdenes ── */}
            <div className="admin-orders">
                <div className="admin-orders__table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#64748b' }}>
                            <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--admin-primary)', fontSize: '1.5rem' }}>progress_activity</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loading orders…</span>
                        </div>
                    ) : orders.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#334155' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>shopping_cart</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No orders yet</p>
                        </div>
                    ) : (
                        <table className="admin-orders__table">
                            <thead>
                                <tr>
                                    {['Order ID', 'Customer', 'Status', 'Total', 'Shipping', 'Payment ID', 'Date', 'Actions'].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`admin-orders__th${i === 7 ? ' admin-orders__th--right' : ''}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} className="admin-orders__row">

                                        {/* Order ID — UUID truncado */}
                                        <td className="admin-orders__td admin-orders__td--mono admin-orders__td--white">
                                            #{order.id.slice(0, 8)}
                                        </td>

                                        {/* Customer — JOIN profiles o guest data */}
                                        <td className="admin-orders__td">
                                            {order.profiles?.full_name || order.customer_name || order.customer_email || (
                                                <span style={{ color: '#475569', fontStyle: 'italic' }}>Unknown</span>
                                            )}
                                        </td>

                                        {/* Status badge */}
                                        <td className="admin-orders__td">
                                            <StatusBadge status={order.status} />
                                        </td>

                                        {/* Total */}
                                        <td className="admin-orders__td admin-orders__td--mono admin-orders__td--white">
                                            ${Number(order.total).toFixed(2)}
                                        </td>

                                        {/* Shipping type */}
                                        <td className="admin-orders__td" style={{ textAlign: 'center' }}>
                                            {order.shipping_type === 'pickup' ? (
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#00f0ff' }} title="Retiro en local">storefront</span>
                                            ) : order.shipping_type === 'shipping' ? (
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#10b981' }} title="Envío a domicilio">local_shipping</span>
                                            ) : (
                                                <span style={{ color: '#334155' }}>—</span>
                                            )}
                                        </td>

                                        {/* Payment ID de Mercado Pago */}
                                        <td className="admin-orders__td admin-orders__td--mono" style={{ color: '#475569', fontSize: '0.72rem' }}>
                                            {order.payment_id
                                                ? order.payment_id.slice(0, 12) + '…'
                                                : <span style={{ color: '#334155' }}>—</span>
                                            }
                                        </td>

                                        {/* Fecha */}
                                        <td className="admin-orders__td admin-orders__td--mono" style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {new Date(order.created_at).toLocaleDateString('es-AR', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </td>

                                        {/* Acción: solo órdenes 'paid' pueden marcarse como shipped */}
                                        <td className="admin-orders__td admin-orders__td--right">
                                            {order.status === 'paid' && (
                                                <button
                                                    onClick={() => markShipped(order.id)}
                                                    disabled={toggling === order.id}
                                                    style={{
                                                        ...S.btnShip,
                                                        opacity: toggling === order.id ? 0.6 : 1,
                                                        cursor: toggling === order.id ? 'not-allowed' : 'pointer',
                                                    }}
                                                    aria-label="Mark order as shipped"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                                                        {toggling === order.id ? 'progress_activity' : 'local_shipping'}
                                                    </span>
                                                    {toggling === order.id ? 'Updating…' : 'Mark Shipped'}
                                                </button>
                                            )}
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
