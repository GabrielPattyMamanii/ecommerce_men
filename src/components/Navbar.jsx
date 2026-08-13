import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useSiteLogo } from '../hooks/useSiteLogo'
import './Navbar.css'

import NexoLogo from '../assets/nexo-logo.svg'

const NAV_LINKS = [
    { label: 'Inicio', to: '/' },
    { label: 'Catálogo', to: '/catalogo' },
    { label: 'Contacto', to: '/contacto' },
]

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const { totalCount, toggleCart } = useCart()
    const logoUrl = useSiteLogo()
    const navigate = useNavigate()

    function submitSearch(e) {
        e.preventDefault()
        const q = searchValue.trim()
        setMenuOpen(false)
        navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo')
    }

    return (
        <header className="navbar">
            {/* Fondo de cuadrícula decorativa */}
            <div className="navbar__grid-bg" aria-hidden="true" />

            <div className="navbar__inner">
                <div className="navbar__left">
                    <Link to="/" className="navbar__logo group">
                        {logoUrl && (
                            <img
                                src={logoUrl}
                                alt="NEXO Logo"
                                className="w-full h-full object-contain opacity-95 transition-all duration-300 group-hover:scale-105"
                            />
                        )}
                    </Link>

                    <nav className="navbar__nav" aria-label="Navegación principal">
                        {NAV_LINKS.map(({ label, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `navbar__link${isActive ? ' navbar__link--active' : ''}`
                                }
                            >
                                {label}
                                <span className="navbar__link-underline" aria-hidden="true" />
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* ── Centro: Búsqueda (desktop, ≥1024px) ── */}
                <form className="navbar__search" role="search" onSubmit={submitSearch} aria-label="Buscar productos">
                    <div className="navbar__search-box">
                        <span className="material-symbols-outlined navbar__search-icon">search</span>
                        <input
                            type="text"
                            className="navbar__search-input"
                            placeholder="Buscar productos"
                            aria-label="Buscar"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                        />
                    </div>
                </form>

                {/* ── Derecha: Iconos ── */}
                <div className="navbar__right">
                    {/* Carrito */}
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

                    {/* Usuario */}
                    <Link to="/cuenta" className="navbar__icon-btn" aria-label="Mi cuenta">
                        <span className="material-symbols-outlined">person</span>
                    </Link>

                    {/* Hamburger (mobile) */}
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

            {/* ── Menú mobile ── */}
            <nav
                className={`navbar__mobile-menu${menuOpen ? ' navbar__mobile-menu--open' : ''}`}
                aria-label="Menú móvil"
            >
                {/* Buscador — antes solo existía en desktop (≥1024px); mobile/tablet
                    no tenían forma de buscar productos */}
                <form className="navbar__mobile-search" role="search" onSubmit={submitSearch} aria-label="Buscar productos">
                    <span className="material-symbols-outlined navbar__search-icon">search</span>
                    <input
                        type="text"
                        className="navbar__mobile-search-input"
                        placeholder="Buscar productos"
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
                <Link to="/checkout" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    Carrito
                </Link>
                <Link to="/cuenta" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    Mi cuenta
                </Link>
            </nav>
        </header>
    )
}
