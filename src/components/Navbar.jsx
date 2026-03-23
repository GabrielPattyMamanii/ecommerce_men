import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './Navbar.css'

import NexoLogo from '../assets/nexo-logo.svg'

import NexoLogoImg from '../assets/logo-nexo.jpg'

const NAV_LINKS = [
    { label: 'Inicio', to: '/' },
    { label: 'Catálogo', to: '/catalogo' },
    { label: 'Contacto', to: '/contacto' },
]

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const { totalCount, toggleCart } = useCart()

    return (
        <header className="navbar">
            {/* Fondo de cuadrícula decorativa */}
            <div className="navbar__grid-bg" aria-hidden="true" />

            <div className="navbar__inner">
                <div className="navbar__left">
                    <Link to="/" className="navbar__logo flex items-center gap-3 sm:gap-4 group">
                        <img 
                            src={NexoLogoImg} 
                            alt="NEXO Logo" 
                            className="h-[40px] sm:h-[48px] w-auto mix-blend-lighten opacity-95 transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div className="flex flex-col justify-center">
                            <span className="font-['Inter',sans-serif] font-black text-2xl sm:text-3xl tracking-[0.1em] text-slate-200 leading-none">
                                NEXO
                            </span>
                            <span className="font-['Inter',sans-serif] font-extrabold text-[9px] sm:text-[11px] tracking-[0.45em] sm:tracking-[0.5em] text-[#4a90e2] mt-1">
                                PERFORMANCE
                            </span>
                        </div>
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

                {/* ── Centro: Búsqueda ── */}
                <label className="navbar__search" aria-label="Buscar productos">
                    <div className="navbar__search-box">
                        <span className="material-symbols-outlined navbar__search-icon">search</span>
                        <input
                            type="text"
                            className="navbar__search-input"
                            placeholder="Search gear //"
                            aria-label="Buscar"
                        />
                    </div>
                </label>

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
