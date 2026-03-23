import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ─── Líneas de decoración animadas ─── */
function GridBg() {
    return (
        <div
            className="fixed inset-0 pointer-events-none z-0"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)
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
                className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-[0.2em] font-mono"
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
                className="w-full bg-transparent border border-[#1e293b] text-white px-4 py-3 text-sm
                           focus:border-[var(--admin-primary,#0d46f2)] focus:outline-none focus:ring-1
                           focus:ring-[var(--admin-primary,#0d46f2)] transition-all
                           placeholder-[#334155] font-mono"
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

            {/* ── Corner accents (solo desktop) ── */}
            <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-[var(--admin-primary,#0d46f2)] opacity-60 hidden sm:block" />
            <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-[var(--admin-primary,#0d46f2)] opacity-60 hidden sm:block" />
            <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-[var(--admin-primary,#0d46f2)] opacity-60 hidden sm:block" />
            <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-[var(--admin-primary,#0d46f2)] opacity-60 hidden sm:block" />

            {/* ── Panel principal ── */}
            <div className="relative z-10 w-full max-w-md">

                {/* Encabezado */}
                <div className="mb-8 text-center">
                    <p className="font-mono text-[10px] text-[var(--admin-primary,#0d46f2)] uppercase tracking-[0.3em] mb-3">
                        // TECH_ADMIN
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">
                        LOGIN
                    </h1>
                    <p className="mt-2 text-xs text-slate-500 font-mono tracking-widest uppercase">
                        Authorized Access Only
                    </p>
                </div>

                {/* Tarjeta del formulario */}
                <div
                    className="bg-[#0a0f1e] border border-[#1e293b] p-8 relative"
                    style={{ boxShadow: '0 0 60px rgba(13,70,242,0.08)' }}
                >
                    {/* Línea de acento superior */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent, #0d46f2, transparent)' }}
                    />

                    {/* Badge de sistema */}
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#1e293b]">
                        <span className="material-symbols-outlined text-sm text-[var(--admin-primary,#0d46f2)]">
                            settings_backup_restore
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                            Protocol Retrieval — Kinetic_Archive_Node
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <Field
                            id="email"
                            label="User ID / Email"
                            type="email"
                            placeholder="usuario@dominio.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />

                        <Field
                            id="password"
                            label="Access Code / Password"
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
                                           text-red-400 text-xs font-mono uppercase tracking-wide"
                            >
                                <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
                                {error}
                            </div>
                        )}

                        {/* Botón */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[var(--admin-primary,#0d46f2)] text-white font-black
                                       text-sm uppercase tracking-widest font-mono
                                       hover:bg-blue-600 active:bg-blue-700
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

                    {/* Footer del panel */}
                    <div className="mt-6 pt-4 border-t border-[#1e293b] flex items-center justify-between">
                        <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                            SYS_AUTH v2.4
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-mono text-[9px] text-green-500 uppercase tracking-widest">
                                ONLINE
                            </span>
                        </div>
                    </div>
                </div>

                {/* Enlace back al home */}
                <p className="text-center mt-6 text-xs text-slate-600 font-mono">
                    <Link to="/" className="hover:text-slate-400 transition-colors uppercase tracking-widest">
                        ← Volver al inicio
                    </Link>
                </p>
            </div>
        </div>
    )
}
