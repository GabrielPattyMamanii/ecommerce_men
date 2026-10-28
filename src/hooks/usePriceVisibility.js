import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

// Ajustes públicos de la tienda (tabla `site_price_settings`, editable desde
// /admin/configuracion/tienda): qué tipos de precio se muestran y si las compras
// están habilitadas (`purchasesEnabled` = false → modo catálogo). Mientras carga
// —o si la tabla/columna todavía no existe— se asume todo activo, que es el
// comportamiento previo.
const DEFAULT_VISIBILITY = { showRetail: true, showWholesale: true, purchasesEnabled: true }

// Cache a nivel de módulo: las tarjetas de producto usan el hook muchas veces
// y todas comparten una sola consulta.
let cached = null
let pending = null

function fetchVisibility() {
    if (!pending) {
        pending = supabase
            .from('site_price_settings')
            .select('show_retail, show_wholesale, purchases_enabled')
            .eq('id', 1)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    // No cachear el fallo (p. ej. migración sin correr): reintenta en el próximo uso.
                    console.warn('[usePriceVisibility] no se pudo leer site_price_settings:', error.message)
                    pending = null
                    return DEFAULT_VISIBILITY
                }
                cached = data
                    ? {
                        showRetail: data.show_retail !== false,
                        showWholesale: data.show_wholesale !== false,
                        purchasesEnabled: data.purchases_enabled !== false,
                    }
                    : DEFAULT_VISIBILITY
                return cached
            })
            .catch(() => {
                pending = null
                return DEFAULT_VISIBILITY
            })
    }
    return pending
}

/** Lo llama el admin tras guardar, para que la tienda (misma SPA) relea el valor nuevo. */
export function invalidatePriceVisibility() {
    cached = null
    pending = null
}

export function usePriceVisibility() {
    const [visibility, setVisibility] = useState(cached ?? DEFAULT_VISIBILITY)

    useEffect(() => {
        let active = true
        fetchVisibility().then(v => { if (active) setVisibility(v) })
        return () => { active = false }
    }, [])

    return visibility
}
