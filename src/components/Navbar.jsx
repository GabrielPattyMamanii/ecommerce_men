import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useSiteLogo } from '../hooks/useSiteLogo'
import { supabase } from '../services/supabaseClient'
import './Navbar.css'

const NAV_LINKS = [
    { label: 'Inicio', to: '/' },
    { label: 'Contacto', to: '/contacto' },
]

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [productsOpen, setProductsOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [categories, setCategories] = useState([])
    const { totalCount, toggleCart } = useCart()
    const { user } = useAuth()
    const { logoUrl, logoType } = useSiteLogo()
    const stacked = logoType === 'stacked'
    const navigate = useNavigate()
    const productsRef = useRef(null)
    const headerRef = useRef(null)
    const mobileMenuRef = useRef(null)
    const { pathname } = useLocation()
    const isHome = pathname === '/'
    const [pastHero, setPastHero] = useState(false)
    // Transparente solo sobre el banner del Home; blanco al salir de él o
    // cuando hay un menú desplegado (que necesita fondo para leerse).
    const overHero = isHome && !pastHero && !menuOpen && !productsOpen

    // Publica la altura del header (sin el menú mobile desplegado) para que el
    // banner del Home se extienda por detrás del header transparente.
    useEffect(() => {
        const header = headerRef.current
        if (!header) return
        const root = document.documentElement
        function publish() {
            const menuH = mobileMenuRef.current?.offsetHeight ?? 0
            root.style.setProperty('--navbar-h', `${header.offsetHeight - menuH}px`)
        }
        publish()
        const ro = new ResizeObserver(publish)
        ro.observe(header)
        return () => { ro.disconnect(); root.style.removeProperty('--navbar-h') }
    }, [])

    // Detecta cuándo el banner (data-hero) ya quedó detrás del header
    useEffect(() => {
        if (!isHome) { setPastHero(false); return }
        function check() {
            const hero = document.querySelector('[data-hero]')
            const navH = headerRef.current ? headerRef.current.offsetHeight : 0
            setPastHero(hero ? hero.getBoundingClientRect().bottom <= navH : false)
        }
        check()
        window.addEventListener('scroll', check, { passive: true })
        window.addEventListener('resize', check)
        return () => {
            window.removeEventListener('scroll', check)
            window.removeEventListener('resize', check)
        }
    }, [isHome])

    // Categorías reales para el dropdown "Productos" — mismo query que el Footer
    useEffect(() => {
        let active = true
        supabase
            .from('categories')
            .select('id, name, slug')
            .is('parent_id', null)
            .order('name', { ascending: true })
            .then(({ data }) => { if (active) setCategories(data ?? []) })
        return () => { active = false }
    }, [])

    // Cerrar el dropdown de Productos al hacer click afuera
    useEffect(() => {
        function onClickOutside(e) {
            if (productsRef.current && !productsRef.current.contains(e.target)) {
                setProductsOpen(false)
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    function submitSearch(e) {
        e.preventDefault()
        const q = searchValue.trim()
        setMenuOpen(false)
        navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo')
    }

    return (
        <header ref={headerRef} className={`navbar${overHero ? ' navbar--hero' : ''}`}>
            <div className="navbar__grid-bg" aria-hidden="true" />

            {/* ── Fila principal: buscador / logo centrado / cuenta + carrito ── */}
            <div className={`navbar__inner${stacked ? ' navbar__inner--stacked' : ''}`}>
                {/* ── Izquierda: Buscador ── */}
                <form className="navbar__search" role="search" onSubmit={submitSearch} aria-label="Buscar productos">
                    <div className="navbar__search-box">
                        <span className="material-symbols-outlined navbar__search-icon">search</span>
                        <input
                            type="text"
                            className="navbar__search-input"
                            placeholder="¿Qué estás buscando?"
                            aria-label="Buscar"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                        />
                    </div>
                </form>

                {/* ── Centro: Logo ── */}
                <Link to="/" className={`navbar__logo group${stacked ? ' navbar__logo--stacked' : ''}`}>
                    {logoUrl && (
                        <img
                            src={logoUrl}
                            alt="Logo de la tienda"
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                    )}
                </Link>

                {/* ── Derecha: Cuenta + Carrito + Hamburguesa ── */}
                <div className="navbar__right">
                    <Link to="/cuenta" className="navbar__account" aria-label="Mi cuenta">
                        <span className="material-symbols-outlined">person</span>
                        <span className="navbar__account-label">{user ? 'Mi Cuenta' : 'Ingresar'}</span>
                    </Link>

                    <button
                        onClick={toggleCart}
                        className="navbar__icon-btn"
                        aria-label="Ver carrito"
                        id="navbar-cart-btn"
                    >
                        <span className="material-symbols-outlined">shopping_cart</span>
                        {totalCount > 0 && (
                            <span className="navbar__cart-badge">{totalCount}</span>
                        )}
                    </button>

                    <button
                        className={`navbar__hamburger${menuOpen ? ' navbar__hamburger--open' : ''}`}
                        onClick={() => setMenuOpen(prev => !prev)}
                        aria-label="Abrir menú"
                        aria-expanded={menuOpen}
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </div>

            {/* ── Segunda fila: navegación (desktop, ≥1280px) ── */}
            <nav className="navbar__nav" aria-label="Navegación principal">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`}
                >
                    Inicio
                    <span className="navbar__link-underline" aria-hidden="true" />
                </NavLink>

                <div className="navbar__dropdown" ref={productsRef}>
                    <button
                        type="button"
                        className={`navbar__link navbar__dropdown-trigger${productsOpen ? ' navbar__link--active' : ''}`}
                        onClick={() => setProductsOpen(prev => !prev)}
                        aria-expanded={productsOpen}
                        aria-haspopup="true"
                    >
                        Productos
                        <span className="material-symbols-outlined navbar__dropdown-chevron">expand_more</span>
                        <span className="navbar__link-underline" aria-hidden="true" />
                    </button>
                    {productsOpen && (
                        <div className="navbar__dropdown-menu" role="menu">
                            <Link to="/catalogo" className="navbar__dropdown-item navbar__dropdown-item--all" onClick={() => setProductsOpen(false)}>
                                Ver todo el catálogo
                            </Link>
                            {categories.map(category => (
                                <Link
                                    key={category.id}
                                    to={`/catalogo?categoria=${category.slug}`}
                                    className="navbar__dropdown-item"
                                    onClick={() => setProductsOpen(false)}
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <NavLink to="/contacto" className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`}>
                    Contacto
                    <span className="navbar__link-underline" aria-hidden="true" />
                </NavLink>
            </nav>

            {/* ── Menú mobile ── */}
            <nav
                ref={mobileMenuRef}
                className={`navbar__mobile-menu${menuOpen ? ' navbar__mobile-menu--open' : ''}`}
                aria-label="Menú móvil"
            >
                <form className="navbar__mobile-search" role="search" onSubmit={submitSearch} aria-label="Buscar productos">
                    <span className="material-symbols-outlined navbar__search-icon">search</span>
                    <input
                        type="text"
                        className="navbar__mobile-search-input"
                        placeholder="¿Qué estás buscando?"
                        aria-label="Buscar"
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                    />
                </form>

                {NAV_LINKS.map(({ label, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className="navbar__mobile-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        {label}
                    </NavLink>
                ))}

                <Link to="/catalogo" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    Ver todo el catálogo
                </Link>
                {categories.map(category => (
                    <Link
                        key={category.id}
                        to={`/catalogo?categoria=${category.slug}`}
                        className="navbar__mobile-link navbar__mobile-link--category"
                        onClick={() => setMenuOpen(false)}
                    >
                        {category.name}
                    </Link>
                ))}

                <Link to="/checkout" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    Carrito
                </Link>
                <Link to="/cuenta" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    {user ? 'Mi cuenta' : 'Ingresar'}
                </Link>
            </nav>
        </header>
    )
}
