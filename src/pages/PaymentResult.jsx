import { Link, useSearchParams } from 'react-router-dom'

const STATUS_CONFIG = {
  success: {
    icon: 'check_circle',
    title: 'Pago Aprobado',
    description: 'Tu pago fue procesado con éxito. Pronto recibirás un email de confirmación.',
    color: 'text-green-400',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    glow: '0 0 20px rgba(34,197,94,0.3)',
  },
  failure: {
    icon: 'cancel',
    title: 'Pago Rechazado',
    description: 'El pago no pudo ser procesado. Podés intentar nuevamente con otro medio de pago.',
    color: 'text-red-400',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    glow: '0 0 20px rgba(239,68,68,0.3)',
  },
  pending: {
    icon: 'schedule',
    title: 'Pago Pendiente',
    description: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    glow: '0 0 20px rgba(234,179,8,0.3)',
  },
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'pending'
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-200 font-body antialiased">
      {/* Grid bg decorativa */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-20 lg:py-32">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Icono de estado */}
          <div
            className={`inline-flex items-center justify-center w-24 h-24 border ${config.border} ${config.bg}`}
            style={{ boxShadow: config.glow }}
          >
            <span className={`material-symbols-outlined text-5xl ${config.color}`}>
              {config.icon}
            </span>
          </div>

          {/* Título */}
          <div className="space-y-3">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              // Payment_Status
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase font-display">
              {config.title}
            </h1>
            <p className="text-sm text-slate-400 font-mono leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Info de referencia (si MP envió datos) */}
          {searchParams.get('payment_id') && (
            <div className="text-xs font-mono text-slate-500 border border-[#333] bg-[#121212] px-4 py-3">
              <span className="text-slate-400">REF:</span>{' '}
              <span className="text-primary">{searchParams.get('payment_id')}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              to="/"
              className="px-6 py-3 bg-[#121212] border border-[#333] text-white text-sm font-mono uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              Volver al Inicio
            </Link>

            {status === 'failure' && (
              <Link
                to="/checkout"
                className="group px-6 py-3 bg-primary text-black text-sm font-mono uppercase tracking-wider font-bold hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2"
              >
                Reintentar Pago
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
