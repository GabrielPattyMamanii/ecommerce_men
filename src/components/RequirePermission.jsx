import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * RequirePermission — guarda de acceso a una sección concreta del admin.
 *
 * Se usa dentro de ProtectedRoute (que ya garantiza role admin/staff).
 * admin siempre pasa. staff solo pasa si `section` está en sus permisos.
 *
 * 'usuarios' nunca es un valor válido en admin_permissions (CHECK constraint
 * en la DB), así que envolver esa ruta con `section="usuarios"` la deja
 * admin-only sin necesitar un componente aparte.
 */
export default function RequirePermission({ section, children }) {
    const { role, permissions } = useAuth()

    if (role === 'admin') return children
    if (role === 'staff' && permissions?.includes(section)) return children

    return <Navigate to="/admin" replace />
}
