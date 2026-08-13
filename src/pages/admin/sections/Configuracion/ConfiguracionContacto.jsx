import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'
import ConfiguracionNav from './ConfiguracionNav'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const EMPTY_HORA = { abierto: true, inicio: '09:00', fin: '18:00' }
const EMPTY_HORARIOS = DIAS_SEMANA.reduce((acc, dia) => {
  acc[dia] = { ...EMPTY_HORA }
  return acc
}, {})

const EMPTY_FORM = {
  whatsapp_url: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  email: '',
  horarios: EMPTY_HORARIOS,
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
          horarios: EMPTY_HORARIOS,
        })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  function handleChangeRed(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleChangeHorario(dia, field, value) {
    setForm(prev => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [dia]: { ...prev.horarios[dia], [field]: value }
      }
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const horarios_json = JSON.stringify(form.horarios)

      const { data, error } = await supabase
        .from('contact_settings')
        .update({
          whatsapp_url: (form.whatsapp_url || '').trim() || null,
          instagram_url: (form.instagram_url || '').trim() || null,
          facebook_url: (form.facebook_url || '').trim() || null,
          tiktok_url: (form.tiktok_url || '').trim() || null,
          email: (form.email || '').trim() || null,
          hours_text: horarios_json,
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
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
      <ConfiguracionNav />
      <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">contact_mail</span>
        Configuración de Contacto
      </h1>

      {/* Sección: Redes Sociales */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: '#00f0ff', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // CANALES DE COMUNICACIÓN
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={S.label}>WhatsApp (URL wa.me)</label>
            <input style={S.input} value={form.whatsapp_url}
              onChange={e => handleChangeRed('whatsapp_url', e.target.value)}
              placeholder="https://wa.me/549..." />
          </div>
          <div>
            <label style={S.label}>Instagram (URL)</label>
            <input style={S.input} value={form.instagram_url}
              onChange={e => handleChangeRed('instagram_url', e.target.value)}
              placeholder="https://instagram.com/tu_usuario" />
          </div>
          <div>
            <label style={S.label}>Facebook (URL)</label>
            <input style={S.input} value={form.facebook_url}
              onChange={e => handleChangeRed('facebook_url', e.target.value)}
              placeholder="https://facebook.com/tu_pagina" />
          </div>
          <div>
            <label style={S.label}>TikTok (URL)</label>
            <input style={S.input} value={form.tiktok_url}
              onChange={e => handleChangeRed('tiktok_url', e.target.value)}
              placeholder="https://tiktok.com/@tu_usuario" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Email de contacto</label>
            <input style={S.input} value={form.email}
              onChange={e => handleChangeRed('email', e.target.value)}
              placeholder="info@tudominio.com" />
          </div>
        </div>
      </div>

      {/* Sección: Horarios */}
      <div>
        <h2 style={{ color: '#00f0ff', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // HORARIOS DE ATENCIÓN
        </h2>

        <div style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #333b49', borderRadius: '2px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333b49', background: '#1a1f27' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#00f0ff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Día</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#00f0ff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abierto</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#00f0ff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inicio</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#00f0ff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fin</th>
              </tr>
            </thead>
            <tbody>
              {DIAS_SEMANA.map((dia, idx) => (
                <tr key={dia} style={{ borderBottom: idx < DIAS_SEMANA.length - 1 ? '1px solid #2a3142' : 'none', background: idx % 2 === 0 ? 'transparent' : 'rgba(0, 240, 255, 0.02)' }}>
                  <td style={{ padding: '1rem', color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>{dia}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={form.horarios[dia].abierto}
                      onChange={e => handleChangeHorario(dia, 'abierto', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00f0ff' }}
                    />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input
                      type="time"
                      disabled={!form.horarios[dia].abierto}
                      value={form.horarios[dia].inicio}
                      onChange={e => handleChangeHorario(dia, 'inicio', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #334155',
                        color: form.horarios[dia].abierto ? 'white' : '#64748b',
                        padding: '0.5rem',
                        borderRadius: '2px',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        cursor: form.horarios[dia].abierto ? 'pointer' : 'not-allowed',
                        opacity: form.horarios[dia].abierto ? 1 : 0.5,
                      }}
                    />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input
                      type="time"
                      disabled={!form.horarios[dia].abierto}
                      value={form.horarios[dia].fin}
                      onChange={e => handleChangeHorario(dia, 'fin', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #334155',
                        color: form.horarios[dia].abierto ? 'white' : '#64748b',
                        padding: '0.5rem',
                        borderRadius: '2px',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        cursor: form.horarios[dia].abierto ? 'pointer' : 'not-allowed',
                        opacity: form.horarios[dia].abierto ? 1 : 0.5,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón Guardar */}
      <div style={{ marginTop: '2rem' }}>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
