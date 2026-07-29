import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export function useShippingQuote() {
  const [opciones, setOpciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [debounceTimer, setDebounceTimer] = useState(null)

  // Debounced cotizar function to avoid excessive API calls
  const cotizar = useCallback(async (items, direccion) => {
    setLoading(true)
    setError(null)

    if (!items?.length) {
      setOpciones([])
      setLoading(false)
      return
    }

    if (!direccion?.street || !direccion?.number || !direccion?.city || !direccion?.province || !direccion?.postalCode) {
      setOpciones([])
      setLoading(false)
      return
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('envia-cotizar', {
        body: {
          items: items.map(i => ({ productId: i.productId, qty: i.qty })),
          destino: direccion,
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
      setError(err?.message || 'Error al cotizar envío')
      setOpciones([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Wrapper con debounce
  const cotizarDebounced = useCallback((items, direccion) => {
    if (debounceTimer) clearTimeout(debounceTimer)

    setLoading(true)
    const timer = setTimeout(() => {
      cotizar(items, direccion)
    }, 500) // 500ms debounce

    setDebounceTimer(timer)
  }, [cotizar, debounceTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [debounceTimer])

  return { opciones, loading, error, cotizar: cotizarDebounced }
}
