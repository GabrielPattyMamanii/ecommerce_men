import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

// El logo vive únicamente en Supabase (bucket `site-logo`, tabla
// `site_logo_settings`). No hay fallback a un asset local: si todavía no
// se subió un logo desde /admin/configuracion/logo, `logoUrl` es null
// y el consumidor decide qué mostrar (ej. nada, o un placeholder).
// `logoType`: 'horizontal' (apaisado ~4:1) | 'stacked' (apilado ~1.8:1).
export function useSiteLogo() {
    const [logo, setLogo] = useState({ logoUrl: null, logoType: 'horizontal' })

    useEffect(() => {
        let active = true
        async function fetchSettings() {
            const { data } = await supabase
                .from('site_logo_settings')
                .select('logo_url, logo_type')
                .eq('id', 1)
                .maybeSingle()
            if (active) {
                setLogo({
                    logoUrl: data?.logo_url || null,
                    logoType: data?.logo_type === 'stacked' ? 'stacked' : 'horizontal',
                })
            }
        }
        fetchSettings()
        return () => { active = false }
    }, [])

    return logo
}
