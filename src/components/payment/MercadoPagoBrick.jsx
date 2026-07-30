import { useCheckoutPro } from '../../hooks/useCheckoutPro'

/**
 * Botón de pago con Mercado Pago (Checkout PRO redirect).
 * Maneja estados de carga, error y disabled.
 */
export function MercadoPagoBrick({ items, payer, shippingMethod, shippingAddress, shippingQuote, isShippingComplete, couponCode }) {
  const { checkout, isLoading, error } = useCheckoutPro()

  const missingPayer = !payer?.email || !payer?.firstName || !payer?.lastName
  // Para shipping, requiere que se haya elegido una opción de envío
  const shippingMissing = shippingMethod === 'shipping' && !isShippingComplete

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-xs font-mono uppercase tracking-wide border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => checkout({ items, payer, shippingMethod, shippingAddress, shippingQuote, couponCode })}
        disabled={isLoading || !items?.length || missingPayer || shippingMissing}
        className="group w-full relative overflow-hidden py-4 text-center transition-all hover:shadow-[0_0_10px_rgba(0,157,227,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#009EE3' }}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <span className="relative text-white text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
          {shippingMissing ? (
            <>
              <span className="material-symbols-outlined text-xl">info</span>
              Elegí un método de envío
            </>
          ) : isLoading ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              Redirigiendo a Mercado Pago…
            </>
          ) : (
            <>
              <span className="font-bold text-sm font-mono opacity-90">MP</span>
              Pagar con Mercado Pago
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </>
          )}
        </span>
      </button>
    </div>
  )
}
