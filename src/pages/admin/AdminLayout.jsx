import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import './AdminLayout.css'

/* ── Navegación del sidebar ── */
const SIDEBAR_LINKS = [
    { label: 'Dashboard', icon: 'dashboard', to: '/admin', badge: null, end: true },
    { label: 'Inventory', icon: 'inventory_2', to: '/admin/productos', badge: null, end: false },
    { label: 'Orders', icon: 'shopping_cart', to: '/admin/ordenes', badge: 12, end: false },
    { label: 'Customers', icon: 'group', to: '/admin/clientes', badge: null, end: false },
    { label: 'Analytics', icon: 'monitoring', to: '/admin/analytics', badge: null, end: false },
]

/* ────────────────────────────────────────────────
   SIDEBAR
──────────────────────────────────────────────── */
function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate()

    return (
        <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
            {/* Logo / marca */}
            <div className="admin-sidebar__header" role="banner">
                <div className="admin-sidebar__logo-icon" aria-hidden="true">
                    <span className="material-symbols-outlined">hexagon</span>
                </div>
                {!collapsed && (
                    <span className="admin-sidebar__logo-text">TECH_ADMIN</span>
                )}
            </div>

            {/* Nav links */}
            <nav className="admin-sidebar__nav" aria-label="Admin navigation">
                {!collapsed && (
                    <p className="admin-sidebar__section-label">Main Menu</p>
                )}

                {SIDEBAR_LINKS.map(({ label, icon, to, badge, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
                        }
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                        {!collapsed && <span className="admin-sidebar__link-label">{label}</span>}
                        {!collapsed && badge && (
                            <span className="admin-sidebar__badge">{badge}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer — usuario */}
            {!collapsed && (
                <div className="admin-sidebar__footer">
                    <div className="admin-sidebar__user-card">
                        <div className="admin-sidebar__avatar" role="img" aria-label="Admin avatar" />
                        <div>
                            <p className="admin-sidebar__user-name">SYS_ADMIN_01</p>
                            <p className="admin-sidebar__user-status">ONLINE • V.2.4</p>
                        </div>
                    </div>
                    <button
                        className="admin-sidebar__logout"
                        onClick={() => navigate('/')}
                        aria-label="Logout"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">logout</span>
                        LOGOUT
                    </button>
                </div>
            )}
        </aside>
    )
}

/* ────────────────────────────────────────────────
   HEADER
──────────────────────────────────────────────── */
function AdminHeader({ onMenuToggle, title = 'Performance Overview' }) {
    return (
        <header className="admin-header">
            <div className="admin-header__left">
                <button
                    className="admin-header__menu-btn"
                    onClick={onMenuToggle}
                    aria-label="Toggle sidebar"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <h1 className="admin-header__title">{title}</h1>
            </div>

            <div className="admin-header__right">
                {/* Búsqueda */}
                <div className="admin-header__search-wrap">
                    <span className="material-symbols-outlined admin-header__search-icon" aria-hidden="true">
                        search
                    </span>
                    <input
                        type="search"
                        className="admin-header__search"
                        placeholder="SEARCH DATABASE..."
                        aria-label="Search database"
                    />
                </div>

                {/* Notificaciones */}
                <button className="admin-header__notif" aria-label="Notifications">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="admin-header__notif-dot" aria-hidden="true" />
                </button>

                <div className="admin-header__divider" aria-hidden="true" />

                {/* Avatar */}
                <div className="admin-header__avatar" role="img" aria-label="Admin user" />
            </div>
        </header>
    )
}

/* ────────────────────────────────────────────────
   LAYOUT — shell puro: sidebar + header + outlet
──────────────────────────────────────────────── */
export default function AdminLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    return (
        <div className="admin-layout">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(p => !p)}
            />

            <div className="admin-main">
                {/* Grid background decorativo */}
                <div className="admin-main__grid-bg" aria-hidden="true" />

                <AdminHeader
                    onMenuToggle={() => setSidebarCollapsed(p => !p)}
                />

                {/*
                    Outlet renderiza la sub-ruta activa:
                     /admin         → Dashboard
                     /admin/productos → ProductsTable (Task 5.2)
                     /admin/ordenes   → OrdersTable   (Task 5.2)
                */}
                <div className="admin-main__content">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
