import { createContext, useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import './AdminLayout.css'

/* Expone el tema activo ('dark' | 'light') a cualquier componente admin que
   necesite elegir entre paletas propias (ej. el popup de producto, que tiene
   su propio tema aislado en vez de las variables --admin-*). */
export const AdminThemeContext = createContext('dark')

/* ── Navegación del sidebar ──
   `section` es null para Dashboard (siempre visible) y para 'usuarios',
   que es admin-only por definición (nunca aparece en admin_permissions). */
const SIDEBAR_LINKS = [
    { label: 'Dashboard', icon: 'dashboard', to: '/admin', badge: null, end: true, section: null },
    { label: 'Productos', icon: 'inventory_2', to: '/admin/productos', badge: null, end: false, section: 'productos' },
    { label: 'Inventario', icon: 'warehouse', to: '/admin/inventario', badge: null, end: false, section: 'inventario' },
    { label: 'Categorías', icon: 'category', to: '/admin/categorias', badge: null, end: false, section: 'categorias' },
    { label: 'Cupones', icon: 'redeem', to: '/admin/cupones', badge: null, end: false, section: 'cupones' },
    { label: 'Compras', icon: 'shopping_bag', to: '/admin/compras', badge: null, end: false, section: 'compras' },
    { label: 'Pedidos', icon: 'shopping_cart', to: '/admin/ordenes', badge: 12, end: false, section: 'ordenes' },
    { label: 'Usuarios registrados', icon: 'group', to: '/admin/clientes', badge: null, end: false, section: 'clientes' },
 /*   { label: 'Analytics', icon: 'monitoring', to: '/admin/analytics', badge: null, end: false, section: null },*/
    { label: 'Configuración', icon: 'settings', to: '/admin/configuracion', badge: null, end: false, section: 'configuracion' },
    { label: 'Usuarios', icon: 'admin_panel_settings', to: '/admin/usuarios', badge: null, end: false, section: 'usuarios' },
]

/* ────────────────────────────────────────────────
   SIDEBAR
──────────────────────────────────────────────── */
function Sidebar({ collapsed, mobileOpen, onClose }) {
    const navigate = useNavigate()
    const { role, permissions } = useAuth()

    const visibleLinks = SIDEBAR_LINKS.filter(({ section }) => {
        if (section === null) return true
        if (role === 'admin') return true
        if (section === 'usuarios') return false // admin-only, nunca delegable
        return permissions?.includes(section)
    })

    // En el drawer mobile siempre se muestran las etiquetas completas,
    // aunque el rail de escritorio esté colapsado a solo-íconos.
    const iconOnly = collapsed && !mobileOpen

    return (
        <>
            <aside className={`admin-sidebar${iconOnly ? ' admin-sidebar--collapsed' : ''}${mobileOpen ? ' admin-sidebar--mobile-open' : ''}`}>
                {/* Logo / marca */}
                <div className="admin-sidebar__header" role="banner">
                    <div className="admin-sidebar__logo-icon" aria-hidden="true">
                        <span className="material-symbols-outlined">hexagon</span>
                    </div>
                    {!iconOnly && (
                        <span className="admin-sidebar__logo-text">PANEL_ADMIN</span>
                    )}
                    <button
                        className="admin-sidebar__close-btn"
                        onClick={onClose}
                        aria-label="Cerrar menú"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </div>

                {/* Nav links */}
                <nav className="admin-sidebar__nav" aria-label="Navegación del admin">
                    {!iconOnly && (
                        <p className="admin-sidebar__section-label">Menú Principal</p>
                    )}

                    {visibleLinks.map(({ label, icon, to, badge, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
                            }
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                            {!iconOnly && <span className="admin-sidebar__link-label">{label}</span>}
                            {!iconOnly && badge && (
                                <span className="admin-sidebar__badge">{badge}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer — usuario */}
                {!iconOnly && (
                    <div className="admin-sidebar__footer">
                        <div className="admin-sidebar__user-card">
                            <div className="admin-sidebar__avatar" role="img" aria-label="Avatar del administrador" />
                            <div>
                                <p className="admin-sidebar__user-name">SYS_ADMIN_01</p>
                                <p className="admin-sidebar__user-status">EN LÍNEA • V.2.4</p>
                            </div>
                        </div>
                        <button
                            className="admin-sidebar__logout"
                            onClick={() => navigate('/')}
                            aria-label="Cerrar sesión"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
                            CERRAR SESIÓN
                        </button>
                    </div>
                )}
            </aside>

            {/* Backdrop — solo visible en mobile con el drawer abierto */}
            <div
                className={`admin-sidebar-backdrop${mobileOpen ? ' admin-sidebar-backdrop--visible' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />
        </>
    )
}

/* ────────────────────────────────────────────────
   HEADER
──────────────────────────────────────────────── */
function AdminHeader({ onMenuToggle, theme, onToggleTheme, title = 'Resumen General' }) {
    return (
        <header className="admin-header">
            <div className="admin-header__left">
                <button
                    className="admin-header__menu-btn"
                    onClick={onMenuToggle}
                    aria-label="Alternar menú lateral"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <h1 className="admin-header__title">{title}</h1>
            </div>

            <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-header__store-link"
            >
                <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
                Ver tienda
                <span className="material-symbols-outlined admin-header__store-link-icon" aria-hidden="true">open_in_new</span>
            </a>

            <div className="admin-header__right">
                {/* Búsqueda */}
                <div className="admin-header__search-wrap">
                    <span className="material-symbols-outlined admin-header__search-icon" aria-hidden="true">
                        search
                    </span>
                    <input
                        type="search"
                        className="admin-header__search"
                        placeholder="BUSCAR EN LA BASE DE DATOS..."
                        aria-label="Buscar en la base de datos"
                    />
                </div>

                {/* Notificaciones */}
                <button className="admin-header__notif" aria-label="Notificaciones">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="admin-header__notif-dot" aria-hidden="true" />
                </button>

                {/* Tema oscuro / claro — solo afecta al admin, nunca al sitio público */}
                <button
                    className="admin-header__theme-toggle"
                    onClick={onToggleTheme}
                    aria-label={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
                    title={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
                >
                    <span className="material-symbols-outlined">
                        {theme === 'light' ? 'dark_mode' : 'light_mode'}
                    </span>
                </button>

                <div className="admin-header__divider" aria-hidden="true" />

                {/* Avatar */}
                <div className="admin-header__avatar" role="img" aria-label="Usuario administrador" />
            </div>
        </header>
    )
}

/* Breakpoint compartido con AdminLayout.css: por debajo de 1024px
   el sidebar deja de ser un rail fijo y pasa a ser un drawer off-canvas. */
const MOBILE_QUERY = '(max-width: 1023px)'

/* Tema del admin — persistido en localStorage, nunca toca el tema del sitio
   público (clave y atributo exclusivos de .admin-layout). */
const THEME_KEY = 'admin-theme'

function getInitialTheme() {
    try {
        const stored = localStorage.getItem(THEME_KEY)
        return stored === 'light' ? 'light' : 'dark'
    } catch {
        return 'dark'
    }
}

/* ────────────────────────────────────────────────
   LAYOUT — shell puro: sidebar + header + outlet
──────────────────────────────────────────────── */
export default function AdminLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        try { localStorage.setItem(THEME_KEY, theme) } catch { /* localStorage no disponible */ }
    }, [theme])

    function toggleTheme() {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
    }

    // Si la ventana crece de mobile → desktop con el drawer abierto,
    // lo cerramos para no dejar el backdrop/estado colgado.
    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY)
        const handleChange = e => {
            if (!e.matches) setMobileNavOpen(false)
        }
        mql.addEventListener('change', handleChange)
        return () => mql.removeEventListener('change', handleChange)
    }, [])

    // Bloquea el scroll del body mientras el drawer mobile está abierto.
    useEffect(() => {
        document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [mobileNavOpen])

    function handleMenuToggle() {
        if (window.matchMedia(MOBILE_QUERY).matches) {
            setMobileNavOpen(p => !p)
        } else {
            setSidebarCollapsed(p => !p)
        }
    }

    return (
        <div className="admin-layout" data-theme={theme}>
            <Sidebar
                collapsed={sidebarCollapsed}
                mobileOpen={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
            />

            <div className="admin-main">
                {/* Grid background decorativo */}
                <div className="admin-main__grid-bg" aria-hidden="true" />

                <AdminHeader
                    onMenuToggle={handleMenuToggle}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />

                {/*
                    Outlet renderiza la sub-ruta activa:
                     /admin         → Dashboard
                     /admin/productos → ProductsTable (Task 5.2)
                     /admin/ordenes   → OrdersTable   (Task 5.2)
                */}
                <div className="admin-main__content">
                    <AdminThemeContext.Provider value={theme}>
                        <Outlet />
                    </AdminThemeContext.Provider>
                </div>
            </div>
        </div>
    )
}
