import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin/configuracion', label: 'Contacto', end: true },
  { to: '/admin/configuracion/whatsapp', label: 'WhatsApp', end: false },
  { to: '/admin/configuracion/banner', label: 'Banner de Inicio', end: false },
  { to: '/admin/configuracion/logo', label: 'Logo', end: false },
]

export default function ConfiguracionNav() {
  return (
    <nav className="admin-config-nav" aria-label="Secciones de configuración">
      {LINKS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `admin-config-nav__link${isActive ? ' admin-config-nav__link--active' : ''}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
