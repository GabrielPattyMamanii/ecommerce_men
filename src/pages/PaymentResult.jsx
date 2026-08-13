import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const STATUS_CONFIG = {
  success: {
    icon: 'check_circle',
    title: 'Pago Aprobado',
    description: 'Tu pago fue procesado con éxito. Pronto recibirás un email de confirmación.',
    color: 'text-green-600',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
  },
  failure: {
    icon: 'cancel',
    title: 'Pago Rechazado',
    description: 'El pago no pudo ser procesado. Podés intentar nuevamente con otro medio de pago.',
    color: 'text-red-600',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
  },
  pending: {
    icon: 'schedule',
    title: 'Pago Pendiente',
    description: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
    color: 'text-yellow-600',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
  },
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'pending'
  const orderId = searchParams.get('order_id')
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const { clearCart } = useCart()

  // Clear cart on successful payment
  useEffect(() => {
    if (status === 'success') clearCart()
  }, [status, clearCart])

  return (
    <div className="bg-background min-h-screen text-primary font-body antialiased">
      {/* Grid bg decorativa */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
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
          >
            <span className={`material-symbols-outlined text-5xl ${config.color}`}>
              {config.icon}
            </span>
          </div>

          {/* Título */}
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted uppercase tracking-widest">
              // Payment_Status
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary uppercase font-display">
              {config.title}
            </h1>
            <p className="text-sm text-muted font-mono leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Info de referencia */}
          {(orderId || searchParams.get('payment_id')) && (
            <div className="text-xs font-mono text-muted border border-border bg-surface px-4 py-3 space-y-1">
              {orderId && (
                <p>
                  <span className="text-muted">ORDER:</span>{' '}
                  <span className="text-primary">#{orderId.slice(0, 8).toUpperCase()}</span>
                </p>
              )}
              {searchParams.get('payment_id') && (
                <p>
                  <span className="text-muted">REF:</span>{' '}
                  <span className="text-primary">{searchParams.get('payment_id')}</span>
                </p>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              to="/"
              className="px-6 py-3 bg-surface border border-border text-primary text-sm font-mono uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              Volver al Inicio
            </Link>

            {status === 'failure' && (
              <Link
                to="/checkout"
                className="group px-6 py-3 bg-primary text-white text-sm font-mono uppercase tracking-wider font-bold hover:bg-primary-strong transition-all flex items-center justify-center gap-2"
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
