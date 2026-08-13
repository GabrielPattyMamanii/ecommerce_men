import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const FALLBACK_SETTINGS = {
    eyebrow: 'NUEVA TEMPORADA',
    headline_line1: 'RENDIMIENTO',
    headline_line2: 'SIN LÍMITES',
    description: 'La mejor calidad en indumentaria masculina. Ropa de invierno y verano, los mejores estilos, los mejores precios.',
    cta_primary_text: 'Ver Catálogo',
    cta_primary_link: '/catalogo',
    cta_secondary_text: '',
    cta_secondary_link: '',
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_9NRPfEgpDNtB65uyhYqwPS6t6wAjgKX4fu2aF-OGpFOBnKT0XfE2Hv5U7P4jVoKBNZ8sHPKuIxbgZ3xsg26w2SMvSUqRf67N_CDIct8k1Fb-LiePUYIt2y1FVn984wM4YupjE7miiZEsWyCTTD4LIYM_YAcvoF8hG3cjnUtu9BVK5g21zl3wvkraOKA8NxD2jvolRH1qMf2NaZcXOo85X-ahXdUrP3cWssdT2W8AaOx_Df7lQM2n0_3FFNd08XNe677bCI_kzosO',
}

export function useHomeBannerSettings() {
    const [settings, setSettings] = useState(FALLBACK_SETTINGS)

    useEffect(() => {
        let active = true
        async function fetchSettings() {
            const { data } = await supabase
                .from('home_banner_settings')
                .select('eyebrow, headline_line1, headline_line2, description, cta_primary_text, cta_primary_link, cta_secondary_text, cta_secondary_link, image_url')
                .eq('id', 1)
                .maybeSingle()
            if (active && data) {
                setSettings({
                    eyebrow: data.eyebrow || FALLBACK_SETTINGS.eyebrow,
                    headline_line1: data.headline_line1 || FALLBACK_SETTINGS.headline_line1,
                    headline_line2: data.headline_line2 || FALLBACK_SETTINGS.headline_line2,
                    description: data.description || FALLBACK_SETTINGS.description,
                    cta_primary_text: data.cta_primary_text || FALLBACK_SETTINGS.cta_primary_text,
                    cta_primary_link: data.cta_primary_link || FALLBACK_SETTINGS.cta_primary_link,
                    cta_secondary_text: data.cta_secondary_text || '',
                    cta_secondary_link: data.cta_secondary_link || '',
                    image_url: data.image_url || FALLBACK_SETTINGS.image_url,
                })
            }
        }
        fetchSettings()
        return () => { active = false }
    }, [])

    return settings
}
