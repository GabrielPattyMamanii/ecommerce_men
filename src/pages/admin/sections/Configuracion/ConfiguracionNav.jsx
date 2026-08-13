import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin/configuracion', label: 'Contacto', end: true },
  { to: '/admin/configuracion/whatsapp', label: 'WhatsApp', end: false },
  { to: '/admin/configuracion/banner', label: 'Banner de Inicio', end: false },
  { to: '/admin/configuracion/logo', label: 'Logo', end: false },
]

export default function ConfiguracionNav() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid #1e293b' }}>
      {LINKS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isActive ? '#00f0ff' : '#94a3b8',
            borderBottom: isActive ? '2px solid #00f0ff' : '2px solid transparent',
            textDecoration: 'none',
          })}
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}
