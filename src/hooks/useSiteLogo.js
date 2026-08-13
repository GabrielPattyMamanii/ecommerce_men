import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

// El logo vive únicamente en Supabase (bucket `site-logo`, tabla
// `site_logo_settings`). No hay fallback a un asset local: si todavía no
// se subió un logo desde /admin/configuracion/logo, el hook devuelve null
// y el consumidor decide qué mostrar (ej. nada, o un placeholder).
export function useSiteLogo() {
    const [logoUrl, setLogoUrl] = useState(null)

    useEffect(() => {
        let active = true
        async function fetchSettings() {
            const { data } = await supabase
                .from('site_logo_settings')
                .select('logo_url')
                .eq('id', 1)
                .maybeSingle()
            if (active) {
                setLogoUrl(data?.logo_url || null)
            }
        }
        fetchSettings()
        return () => { active = false }
    }, [])

    return logoUrl
}
