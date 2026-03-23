/**
 * Dashboard.jsx — Admin Dashboard overview page (Task 5.1)
 *
 * Renders inside AdminLayout's <Outlet /> at /admin.
 * Contains: KPI cards, Traffic Sources, Recent Activity table.
 * Charts are intentionally omitted per design scope.
 */

/* ── Mock data ─────────────────────────────────── */
const KPI_DATA = [
    {
        id: 'live-visitors',
        label: 'Live Visitors',
        value: '1,245',
        change: '+12%',
        trend: 'up',
        barWidth: '75%',
        barColor: '#0d46f2',
        icon: 'person',
    },
    {
        id: 'revenue',
        label: "Today's Revenue",
        value: '$14,320',
        change: '+8%',
        trend: 'up',
        barWidth: '60%',
        barColor: '#ffffff',
        icon: 'payments',
    },
    {
        id: 'shipments',
        label: 'Pending Shipments',
        value: '42',
        change: '-2%',
        trend: 'down',
        barWidth: '20%',
        barColor: '#ef4444',
        icon: 'local_shipping',
    },
    {
        id: 'returns',
        label: 'Active Returns',
        value: '8',
        change: '0%',
        trend: 'neutral',
        barWidth: '10%',
        barColor: '#94a3b8',
        icon: 'assignment_return',
    },
]

const TRAFFIC_SOURCES = [
    { label: 'Direct', pct: 45, color: '#ffffff' },
    { label: 'Social Media', pct: 32, color: '#0d46f2' },
    { label: 'Organic Search', pct: 18, color: '#6366f1' },
    { label: 'Referral', pct: 5, color: '#64748b' },
]

const RECENT_ORDERS = [
    {
        id: '#ORD-7329',
        product: 'Tech-Shell Jacket v2',
        customer: 'Alex M.',
        status: 'Completed',
        statusColor: 'emerald',
        amount: '$245.00',
    },
    {
        id: '#ORD-7328',
        product: 'Compression Run Tights',
        customer: 'Sarah K.',
        status: 'Processing',
        statusColor: 'yellow',
        amount: '$89.00',
    },
    {
        id: '#ORD-7327',
        product: 'Velocity Knit Runner',
        customer: 'James R.',
        status: 'Shipped',
        statusColor: 'blue',
        amount: '$165.00',
    },
    {
        id: '#ORD-7326',
        product: 'Spectre Shell Jacket',
        customer: 'Maria G.',
        status: 'Completed',
        statusColor: 'emerald',
        amount: '$450.00',
    },
    {
        id: '#ORD-7325',
        product: 'Urban Street Sneakers',
        customer: 'Lucas P.',
        status: 'Cancelled',
        statusColor: 'red',
        amount: '$299.00',
    },
]

const STATUS_STYLES = {
    emerald: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', ring: 'rgba(16,185,129,0.25)' },
    yellow: { bg: 'rgba(234,179,8,0.1)', text: '#eab308', ring: 'rgba(234,179,8,0.25)' },
    blue: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', ring: 'rgba(59,130,246,0.25)' },
    red: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', ring: 'rgba(239,68,68,0.25)' },
}

/* ── KPI Card ───────────────────────────────────── */
function KpiCard({ label, value, change, trend, barWidth, barColor, icon }) {
    const isUp = trend === 'up'
    const isDown = trend === 'down'

    return (
        <div className="admin-kpi group">
            {/* Decorative glow blob (top-right) */}
            <div className="admin-kpi__glow" aria-hidden="true" />

            <div className="admin-kpi__top">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded"
                        style={{ background: 'rgba(13,70,242,0.12)' }}
                    >
                        <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ color: '#0d46f2' }}
                            aria-hidden="true"
                        >
                            {icon}
                        </span>
                    </div>

                    <div>
                        <p className="admin-kpi__label">{label}</p>
                        <h3 className="admin-kpi__value">{value}</h3>
                    </div>
                </div>

                {/* Trend badge */}
                <span
                    className={`admin-kpi__badge admin-kpi__badge--${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}
                >
                    <span className="material-symbols-outlined" aria-hidden="true">
                        {isUp ? 'trending_up' : isDown ? 'trending_down' : 'remove'}
                    </span>
                    {change}
                </span>
            </div>

            {/* Progress bar */}
            <div className="admin-kpi__bar-bg" role="meter" aria-label={`${label} progress`}>
                <div
                    className="admin-kpi__bar"
                    style={{ width: barWidth, background: barColor }}
                />
            </div>
        </div>
    )
}

/* ── Traffic Sources ────────────────────────────── */
function TrafficSources() {
    return (
        <div className="admin-traffic">
            <div className="admin-traffic__header">
                <h2 className="admin-traffic__title">Traffic Source</h2>
                <p className="admin-traffic__sub">Real-time user acquisition</p>
            </div>

            <div className="admin-traffic__bars">
                {TRAFFIC_SOURCES.map(({ label, pct, color }) => (
                    <div key={label} className="admin-traffic__row">
                        <div className="admin-traffic__row-label">
                            <span>{label}</span>
                            <span className="admin-traffic__pct">{pct}%</span>
                        </div>
                        <div
                            className="admin-traffic__bar-bg"
                            role="meter"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${label}: ${pct}%`}
                        >
                            <div
                                className="admin-traffic__bar"
                                style={{ width: `${pct}%`, background: color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* System status bubble */}
            <div className="admin-traffic__status">
                <div className="admin-traffic__status-icon" aria-hidden="true">
                    <span className="material-symbols-outlined">bolt</span>
                </div>
                <div>
                    <p className="admin-traffic__status-label">SYSTEM STATUS</p>
                    <p className="admin-traffic__status-value">OPTIMAL PERFORMANCE</p>
                </div>
            </div>
        </div>
    )
}

/* ── Quick Stats row (new) ──────────────────────── */
function QuickStats() {
    const stats = [
        { label: 'Conversion Rate', value: '3.24%', sub: '+0.4% vs. last week', icon: 'percent' },
        { label: 'Avg. Order Value', value: '$187', sub: '+$12 vs. last week', icon: 'shopping_bag' },
        { label: 'Return Rate', value: '1.8%', sub: '-0.2% vs. last week', icon: 'assignment_return' },
        { label: 'Stock Alerts', value: '5 SKUs', sub: 'Low inventory', icon: 'warning' },
    ]

    return (
        <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
            role="region"
            aria-label="Quick statistics"
        >
            {stats.map(({ label, value, sub, icon }) => (
                <div
                    key={label}
                    className="flex items-center gap-4 rounded border border-slate-800 bg-[#161b2e] px-5 py-4 hover:border-[#0d46f2]/40 transition-colors"
                >
                    <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded"
                        style={{ background: 'rgba(13,70,242,0.1)' }}
                    >
                        <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ color: '#0d46f2' }}
                            aria-hidden="true"
                        >
                            {icon}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                            {label}
                        </p>
                        <p className="text-lg font-bold text-white tracking-tight">{value}</p>
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">{sub}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

/* ── Recent Activity Table ──────────────────────── */
function RecentOrders() {
    return (
        <div className="admin-orders" role="region" aria-label="Recent orders">
            <div className="admin-orders__header">
                <h2 className="admin-orders__title">Recent Activity</h2>
                <button
                    className="admin-orders__view-all"
                    aria-label="View all orders"
                >
                    View All →
                </button>
            </div>

            <div className="admin-orders__table-wrap">
                <table className="admin-orders__table" aria-label="Recent orders table">
                    <thead>
                        <tr>
                            {['Order ID', 'Product', 'Customer', 'Status', 'Amount'].map((h, i) => (
                                <th
                                    key={h}
                                    scope="col"
                                    className={`admin-orders__th${i === 4 ? ' admin-orders__th--right' : ''}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {RECENT_ORDERS.map(({ id, product, customer, status, statusColor, amount }) => {
                            const sc = STATUS_STYLES[statusColor] || STATUS_STYLES.blue
                            return (
                                <tr key={id} className="admin-orders__row">
                                    <td className="admin-orders__td admin-orders__td--mono admin-orders__td--white">
                                        {id}
                                    </td>
                                    <td className="admin-orders__td">
                                        <div className="admin-orders__product">
                                            {/* Product thumbnail placeholder */}
                                            <div className="admin-orders__product-img" aria-hidden="true" />
                                            <span className="admin-orders__product-name">{product}</span>
                                        </div>
                                    </td>
                                    <td className="admin-orders__td">{customer}</td>
                                    <td className="admin-orders__td">
                                        <span
                                            className="admin-orders__status"
                                            style={{
                                                background: sc.bg,
                                                color: sc.text,
                                                boxShadow: `0 0 0 1px ${sc.ring}`,
                                            }}
                                        >
                                            {status}
                                        </span>
                                    </td>
                                    <td className="admin-orders__td admin-orders__td--mono admin-orders__td--white admin-orders__td--right">
                                        {amount}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/* ── DASHBOARD PAGE ─────────────────────────────── */
export default function Dashboard() {
    return (
        <section aria-label="Dashboard overview" className="space-y-8">

            {/* ─ Section header ─ */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <p className="text-xs font-mono text-[#0d46f2] uppercase tracking-widest mb-1">
                        // Real-time overview
                    </p>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">
                        Performance Overview
                    </h2>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-2 rounded border border-slate-800 bg-[#161b2e] px-4 py-2 text-xs font-mono">
                    <span
                        className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                        aria-hidden="true"
                    />
                    <span className="text-slate-400 uppercase tracking-widest">Live Data</span>
                    <span className="text-emerald-500 font-bold">ONLINE</span>
                </div>
            </div>

            {/* ─ KPI Grid ─ */}
            <div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
                role="region"
                aria-label="Key performance indicators"
            >
                {KPI_DATA.map(kpi => (
                    <KpiCard key={kpi.id} {...kpi} />
                ))}
            </div>

            {/* ─ Quick Stats ─ */}
            <QuickStats />

            {/* ─ Traffic + (Chart placeholder spot) ─ */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Traffic Sources fills 1 col */}
                <TrafficSources />

                {/* Chart placeholder — 2 cols wide */}
                <div
                    className="lg:col-span-2 flex flex-col items-center justify-center rounded border border-slate-800 border-dashed bg-[#161b2e] p-10 text-center gap-3"
                    role="region"
                    aria-label="Sales chart placeholder"
                >
                    <span
                        className="material-symbols-outlined text-5xl text-slate-700"
                        aria-hidden="true"
                    >
                        bar_chart
                    </span>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono">
                        Sales Performance Chart
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                        // Connect to Supabase in Task 4 to populate
                    </p>
                </div>
            </div>

            {/* ─ Recent Activity Table ─ */}
            <RecentOrders />
        </section>
    )
}
