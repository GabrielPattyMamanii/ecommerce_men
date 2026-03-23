import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — guarda de acceso al panel de administración.
 *
 * Flujo:
 *   1. Mientras AuthContext resuelve sesión + role → spinner de pantalla completa
 *   2. Sin sesión activa             → redirige a /cuenta (login)
 *   3. Sesión activa pero role ≠ 'admin' → redirige a / (403 implícito)
 *   4. user && role === 'admin'      → renderiza <Outlet /> (AdminLayout + sub-rutas)
 */
export default function ProtectedRoute() {
    const { user, role, loading } = useAuth()

    /* ── Pantalla de carga mientras se verifica sesión y role ── */
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#0a0a0a',
                gap: '1rem',
            }}>
                <span
                    className="material-symbols-outlined animate-spin"
                    style={{ fontSize: '2rem', color: '#00f0ff' }}
                >
                    progress_activity
                </span>
                <p style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    color: '#00f0ff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                }}>
                    Verificando acceso…
                </p>
            </div>
        )
    }

    /* ── Sin sesión → login ── */
    if (!user) {
        return <Navigate to="/cuenta" replace />
    }

    /* ── Autenticado pero sin privilegios admin → inicio ── */
    if (role !== 'admin') {
        return <Navigate to="/" replace />
    }

    /* ── Acceso concedido ── */
    return <Outlet />
}
