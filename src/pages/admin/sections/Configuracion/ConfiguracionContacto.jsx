import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'

const EMPTY_FORM = {
    whatsapp_url: '', instagram_url: '', facebook_url: '', tiktok_url: '', email: '', hours_text: '',
}

export default function ConfiguracionContacto() {
    const [form, setForm] = useState(EMPTY_FORM)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { toasts, addToast, dismissToast } = useToasts()

    useEffect(() => {
        async function fetchSettings() {
            const { data, error } = await supabase
                .from('contact_settings')
                .select('whatsapp_url, instagram_url, facebook_url, tiktok_url, email, hours_text')
                .eq('id', 1)
                .maybeSingle()
            if (error) addToast('error', 'No se pudo cargar la configuración')
            if (data) {
                setForm({
                    whatsapp_url: data.whatsapp_url || '',
                    instagram_url: data.instagram_url || '',
                    facebook_url: data.facebook_url || '',
                    tiktok_url: data.tiktok_url || '',
                    email: data.email || '',
                    hours_text: data.hours_text || '',
                })
            }
            setLoading(false)
        }
        fetchSettings()
    }, [])

    function handleChange(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { data, error } = await supabase
                .from('contact_settings')
                .update({
                    whatsapp_url: (form.whatsapp_url || '').trim() || null,
                    instagram_url: (form.instagram_url || '').trim() || null,
                    facebook_url: (form.facebook_url || '').trim() || null,
                    tiktok_url: (form.tiktok_url || '').trim() || null,
                    email: (form.email || '').trim() || null,
                    hours_text: form.hours_text || '',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', 1)
                .select()

            if (error) {
                console.error('Error guardando configuración:', error)
                addToast('error', `Error: ${error.message}`)
                setSaving(false)
                return
            }

            if (!data?.length) {
                console.warn('No data returned from update')
                addToast('error', 'No se pudo guardar la configuración (sin datos)')
                setSaving(false)
                return
            }

            addToast('success', 'Configuración guardada correctamente')
            setSaving(false)
        } catch (err) {
            console.error('Exception al guardar:', err)
            addToast('error', 'Error inesperado al guardar')
            setSaving(false)
        }
    }

    if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Cargando…</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '640px' }}>
            <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                Configuración de Contacto
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <label style={S.label}>WhatsApp (URL wa.me)</label>
                    <input style={S.input} value={form.whatsapp_url}
                        onChange={e => handleChange('whatsapp_url', e.target.value)}
                        placeholder="https://wa.me/549..." />
                </div>
                <div>
                    <label style={S.label}>Instagram (URL)</label>
                    <input style={S.input} value={form.instagram_url}
                        onChange={e => handleChange('instagram_url', e.target.value)}
                        placeholder="https://instagram.com/tu_usuario" />
                </div>
                <div>
                    <label style={S.label}>Facebook (URL)</label>
                    <input style={S.input} value={form.facebook_url}
                        onChange={e => handleChange('facebook_url', e.target.value)}
                        placeholder="https://facebook.com/tu_pagina" />
                </div>
                <div>
                    <label style={S.label}>TikTok (URL)</label>
                    <input style={S.input} value={form.tiktok_url}
                        onChange={e => handleChange('tiktok_url', e.target.value)}
                        placeholder="https://tiktok.com/@tu_usuario" />
                </div>
                <div>
                    <label style={S.label}>Email de contacto</label>
                    <input style={S.input} value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                        placeholder="info@tudominio.com" />
                </div>
                <div>
                    <label style={S.label}>Horarios de atención (texto libre)</label>
                    <textarea style={{ ...S.input, minHeight: '120px', resize: 'vertical', fontFamily: 'monospace' }}
                        value={form.hours_text}
                        onChange={e => handleChange('hours_text', e.target.value)}
                        placeholder={'Lunes: 7:00AM — 12:30AM\nMiercoles: 7:00AM — 12:30AM'} />
                </div>

                <div>
                    <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
