import { useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

/**
 * Hook que encapsula el flujo de Checkout PRO con Mercado Pago.
 * Invoca la Edge Function `create-mp-preference` y redirige al checkout de MP.
 */
export function useCheckoutPro() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const checkout = useCallback(async ({ items }) => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = items.map((i) => ({
        id: String(i.id),
        name: i.name,
        price: i.price,
        qty: i.qty,
        img: i.img ?? '',
      }))

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-mp-preference',
        { body: { items: payload } },
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
