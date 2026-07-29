import { useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

export function useShippingQuote() {
  const [opciones, setOpciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cotizar = useCallback(async (items, direccion, origen, carriers) => {
    setLoading(true)
    setError(null)

    if (!items?.length || !origen?.nombre || !carriers?.length) {
      setOpciones([])
      setLoading(false)
      return
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('envia-cotizar', {
        body: {
          items: items.map(i => ({ productId: i.productId, qty: i.qty })),
          destino: { city: direccion.city, province: direccion.province, postalCode: direccion.postalCode },
          origen,
          carriers,
        },
      })

      if (fnError) throw fnError

      if (data?.error) {
        setError(data.error)
        setOpciones([])
      } else {
        setOpciones(data?.opciones || [])
      }
    } catch (err) {
      setError(err?.message || 'Error al cotizar')
      setOpciones([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { opciones, loading, error, cotizar }
}
