import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ─── Líneas de decoración animadas ─── */
function GridBg() {
    return (
        <div
            className="fixed inset-0 pointer-events-none z-0 opacity-0"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
            }}
            aria-hidden="true"
        />
    )
}

/* ─── Campo de entrada reutilizable ─── */
function Field({ id, label, type = 'text', placeholder, value, onChange, required }) {
    return (
        <div>
            <label
                htmlFor={id}
                className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-[0.2em] font-mono"
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                autoComplete={type === 'password' ? 'current-password' : 'username'}
                className="w-full bg-transparent border border-border text-primary px-4 py-3 text-sm
                           focus:border-primary focus:outline-none focus:ring-1
                           focus:ring-primary transition-all
                           placeholder-outline font-mono"
            />
        </div>
    )
}

export default function Cuenta() {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [error, setError]       = useState(null)
    const [loading, setLoading]   = useState(false)

    const { login, role, user }   = useAuth()
    const navigate                = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            await login(email, password)
            // La redirección se hace basándose en el role que AuthContext
            // cargará después del login. Pequeño delay para que onAuthStateChange
            // y el fetch de role terminen antes de navegar.
            setTimeout(() => {
                // role puede no estar disponible inmediatamente—navegamos
                // de forma optimista al admin; ProtectedRoute redirige si no es admin.
                navigate('/admin', { replace: true })
            }, 300)
        } catch (err) {
            setError(err?.message ?? 'Credenciales inválidas. Verifica e intenta de nuevo.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center px-4 relative overflow-hidden">

            <GridBg />

            {/* ── Panel principal ── */}
            <div className="relative z-10 w-full max-w-md">

                {/* Encabezado */}
                <div className="mb-8 text-center">
                    <p className="font-mono text-[10px] text-primary uppercase tracking-[0.3em] mb-3">
                        // MI CUENTA
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-black text-primary uppercase tracking-tighter">
                        Iniciar sesión
                    </h1>
                    <p className="mt-2 text-xs text-muted font-mono tracking-widest uppercase">
                        Accedé para ver tus pedidos
                    </p>
                </div>

                {/* Tarjeta del formulario */}
                <div className="bg-surface border border-border p-8 relative">
                    {/* Línea de acento superior */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent, #000000, transparent)' }}
                    />

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <Field
                            id="email"
                            label="Email"
                            type="email"
                            placeholder="usuario@dominio.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />

                        <Field
                            id="password"
                            label="Contraseña"
                            type="password"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 px-4 py-3 border border-red-500/30 bg-red-500/5
                                           text-red-600 text-xs font-mono uppercase tracking-wide"
                            >
                                <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
                                {error}
                            </div>
                        )}

                        {/* Botón */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-primary text-white font-black
                                       text-sm uppercase tracking-widest font-mono
                                       hover:bg-primary-strong active:bg-primary-strong
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       transition-colors duration-150 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined text-base animate-spin">
                                        progress_activity
                                    </span>
                                    Autenticando…
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">login</span>
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                </div>

                {/* Enlace back al home */}
                <p className="text-center mt-6 text-xs text-outline font-mono">
                    <Link to="/" className="hover:text-primary transition-colors uppercase tracking-widest">
                        ← Volver al inicio
                    </Link>
                </p>
            </div>
        </div>
    )
}
