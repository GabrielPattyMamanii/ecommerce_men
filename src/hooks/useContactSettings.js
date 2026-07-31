import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const EMPTY_SETTINGS = {
    whatsapp_url: '', instagram_url: '', facebook_url: '', tiktok_url: '', email: '', hours_text: '',
}

export function useContactSettings() {
    const [settings, setSettings] = useState(null)

    useEffect(() => {
        let active = true
        async function fetchSettings() {
            const { data } = await supabase
                .from('contact_settings')
                .select('whatsapp_url, instagram_url, facebook_url, tiktok_url, email, hours_text')
                .eq('id', 1)
                .maybeSingle()
            if (active) setSettings(data ?? EMPTY_SETTINGS)
        }
        fetchSettings()
        return () => { active = false }
    }, [])

    return settings
}
