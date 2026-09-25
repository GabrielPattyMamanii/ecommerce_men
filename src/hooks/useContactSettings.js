import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const EMPTY_SETTINGS = {
    whatsapp_url: '', instagram_url: '', facebook_url: '', tiktok_url: '', email: '', hours_text: '', consult_message: '',
    whatsapp_active: true, instagram_active: true, facebook_active: true, tiktok_active: true, email_active: true,
}

export function useContactSettings() {
    const [settings, setSettings] = useState(null)

    useEffect(() => {
        let active = true
        async function fetchSettings() {
            const { data } = await supabase
                .from('contact_settings')
                .select('whatsapp_url, instagram_url, facebook_url, tiktok_url, email, hours_text, consult_message, whatsapp_active, instagram_active, facebook_active, tiktok_active, email_active')
                .eq('id', 1)
                .maybeSingle()
            if (active) setSettings(data ?? EMPTY_SETTINGS)
        }
        fetchSettings()
        return () => { active = false }
    }, [])

    return settings
}
