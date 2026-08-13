import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'
import { DEFAULT_CONSULT_MESSAGE } from '../../../../lib/whatsappConsult'
import ConfiguracionNav from './ConfiguracionNav'

const EMPTY_FORM = {
  whatsapp_url: '',
  consult_message: '',
}

const EXAMPLE_PRODUCT_NAME = 'Campera Nexo Performance Talle L'

export default function ConfiguracionWhatsapp() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast, dismissToast } = useToasts()

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('contact_settings')
        .select('whatsapp_url, consult_message')
        .eq('id', 1)
        .maybeSingle()
      if (error) addToast('error', 'No se pudo cargar la configuración')
      if (data) {
        setForm({
          whatsapp_url: data.whatsapp_url || '',
          consult_message: data.consult_message || '',
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
          consult_message: (form.consult_message || '').trim() || null,
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

  const previewIntro = form.consult_message.trim() || DEFAULT_CONSULT_MESSAGE
  const previewMessage = `${previewIntro}\n\n${EXAMPLE_PRODUCT_NAME}`

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
      <ConfiguracionNav />
      <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">chat</span>
        Configuración de WhatsApp
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Define a qué número y con qué mensaje se contacta un cliente al presionar el botón{' '}
        <strong style={{ color: 'white' }}>"Consultar"</strong> de un producto marcado como{' '}
        <em>Precio a consultar</em> en el catálogo.
      </p>

      <div style={{
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '2px', padding: '0.85rem 1rem', marginBottom: '2rem',
      }}>
        <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '1.1rem' }}>info</span>
        <p style={{ color: '#fbbf24', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
          Este mensaje de bienvenida <strong>solo</strong> se usa cuando el cliente presiona el botón{' '}
          <strong>"Consultar"</strong> de un producto puntual. El número de WhatsApp de acá arriba también
          es el que usa el <strong>botón flotante</strong> (el ícono verde fijo abajo a la derecha de toda
          la web), pero ese botón flotante manda su propio mensaje genérico fijo ("¿Tenés dudas sobre
          nuestros productos?") — no lee este mensaje de bienvenida ni el nombre de ningún producto.
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#00f0ff', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // NÚMERO DE WHATSAPP
        </h2>
        <label style={S.label}>WhatsApp (URL wa.me)</label>
        <input
          style={S.input}
          value={form.whatsapp_url}
          onChange={e => handleChange('whatsapp_url', e.target.value)}
          placeholder="https://wa.me/549..."
        />
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Es el mismo número usado en el resto del sitio (Footer y página de Contacto). Editarlo acá lo actualiza en todos lados.
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#00f0ff', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // MENSAJE DE BIENVENIDA
        </h2>
        <label style={S.label}>Mensaje que recibe el cliente al presionar "Consultar"</label>
        <textarea
          style={{ ...S.input, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
          value={form.consult_message}
          onChange={e => handleChange('consult_message', e.target.value)}
          placeholder={DEFAULT_CONSULT_MESSAGE}
        />
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          El nombre del producto consultado se agrega automáticamente al final del mensaje — no hace falta escribirlo.
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#00f0ff', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // VISTA PREVIA
        </h2>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '2px', padding: '1rem', color: '#e2e8f0', fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {previewMessage}
        </div>
      </div>

      <div>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
