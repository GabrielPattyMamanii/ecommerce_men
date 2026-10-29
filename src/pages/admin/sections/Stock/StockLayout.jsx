import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
    { to: '/admin/stock/control', label: 'Control', icon: 'monitoring' },
    { to: '/admin/stock/entradas', label: 'Entradas', icon: 'move_to_inbox' },
    { to: '/admin/stock/salidas', label: 'Salidas', icon: 'outbox' },
    { to: '/admin/stock/lotes', label: 'Lotes', icon: 'inventory_2' },
]

export default function StockLayout() {
    return (
        <section aria-label="Stock">
            <nav aria-label="Secciones de stock" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '0.75rem' }}>
                {TABS.map(t => (
                    <NavLink
                        key={t.to} to={t.to}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', borderRadius: '9999px',
                            textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            color: isActive ? 'white' : 'var(--admin-text-muted)',
                            background: isActive ? 'var(--admin-primary)' : 'var(--admin-border)',
                        })}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                        {t.label}
                    </NavLink>
                ))}
            </nav>
            <Outlet />
        </section>
    )
}
