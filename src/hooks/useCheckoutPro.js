import { useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

/**
 * Hook que encapsula el flujo de Checkout PRO con Mercado Pago.
 * Invoca la Edge Function `create-mp-preference` y redirige al checkout de MP.
 */
export function useCheckoutPro() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

<<<<<<< HEAD
  const checkout = useCallback(async ({ items, payer, shippingMethod, shippingAddress, shippingQuote }) => {
=======
  const checkout = useCallback(async ({
    items,
    payer,
    shippingMethod,
    shippingAddress,
    shippingCost,
    shippingCarrier,
    shippingService,
    shippingIsBranch,
  }) => {
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        items: items.map((i) => ({
          id: String(i.id),
          productId: i.productId ?? String(i.id),
          name: i.name,
          price: i.price,
          qty: i.qty,
          img: i.img ?? '',
          spec: i.spec ?? '',
        })),
        payer: {
          email: payer.email,
          phone: payer.phone,
          firstName: payer.firstName,
          lastName: payer.lastName,
        },
        shippingMethod,
        shippingAddress: shippingAddress ?? null,
<<<<<<< HEAD
        shippingQuote: shippingQuote ?? null,
=======
        shippingCost: shippingCost ?? 0,
        shippingCarrier: shippingCarrier ?? null,
        shippingService: shippingService ?? null,
        shippingIsBranch: shippingIsBranch ?? false,
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-mp-preference',
        { body: payload },
      )

      if (fnError) throw fnError

      window.location.href = data.init_point
    } catch (err) {
      setError(err?.message ?? 'Error al procesar el pago. Intente de nuevo.')
      setIsLoading(false)
    }
  }, [])

  return { checkout, isLoading, error }
}
