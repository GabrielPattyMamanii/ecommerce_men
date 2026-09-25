import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack, ToggleSwitch } from '../../../../components/admin/AdminKit'
import ConfiguracionNav from './ConfiguracionNav'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const EMPTY_HORA = { abierto: true, inicio: '09:00', fin: '18:00' }
const EMPTY_HORARIOS = DIAS_SEMANA.reduce((acc, dia) => {
  acc[dia] = { ...EMPTY_HORA }
  return acc
}, {})

// Un canal = una URL/dato de contacto + su toggle de activo, igual al patrón
// "abierto" de HORARIOS DE ATENCIÓN: desactivar no borra lo cargado, solo
// oculta el canal en el sitio público (Footer, /contacto, botón WhatsApp).
// Íconos y colores calcan los de CHANNEL_META en pages/Contacto.jsx (mismo
// canal, mismo color, en el admin y en el sitio público) — Email usa el azul
// de marca del panel en vez de un color de red social porque es el canal
// "propio" del sitio, no una plataforma de terceros.
const CANALES = [
  { field: 'whatsapp_url', activeField: 'whatsapp_active', label: 'WhatsApp', placeholder: 'https://wa.me/549...', icon: 'chat', color: '#25d366' },
  { field: 'instagram_url', activeField: 'instagram_active', label: 'Instagram', placeholder: 'https://instagram.com/tu_usuario', icon: 'photo_camera', color: '#e1306c' },
  { field: 'facebook_url', activeField: 'facebook_active', label: 'Facebook', placeholder: 'https://facebook.com/tu_pagina', icon: 'thumb_up', color: '#1877f2' },
  { field: 'tiktok_url', activeField: 'tiktok_active', label: 'TikTok', placeholder: 'https://tiktok.com/@tu_usuario', icon: 'video_library', color: '#69c9d0' },
  { field: 'email', activeField: 'email_active', label: 'Email de contacto', placeholder: 'info@tudominio.com', icon: 'mail', color: '#0d46f2' },
]

const EMPTY_FORM = {
  whatsapp_url: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  email: '',
  whatsapp_active: true,
  instagram_active: true,
  facebook_active: true,
  tiktok_active: true,
  email_active: true,
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
        .select('whatsapp_url, instagram_url, facebook_url, tiktok_url, email, hours_text, whatsapp_active, instagram_active, facebook_active, tiktok_active, email_active')
        .eq('id', 1)
        .maybeSingle()
      if (error) addToast('error', 'No se pudo cargar la configuración')
      if (data) {
        let horarios = EMPTY_HORARIOS
        if (data.hours_text) {
          try {
            const parsed = JSON.parse(data.hours_text)
            // merge para tolerar días faltantes/formato viejo sin romper el formulario
            horarios = DIAS_SEMANA.reduce((acc, dia) => {
              acc[dia] = { ...EMPTY_HORA, ...parsed[dia] }
              return acc
            }, {})
          } catch (e) {
            console.error('No se pudo parsear hours_text:', e)
          }
        }
        setForm({
          whatsapp_url: data.whatsapp_url || '',
          instagram_url: data.instagram_url || '',
          facebook_url: data.facebook_url || '',
          tiktok_url: data.tiktok_url || '',
          email: data.email || '',
          // ?? true: si la migración de las columnas *_active todavía no corrió
          // (o la fila es vieja), el canal se sigue mostrando como hoy.
          whatsapp_active: data.whatsapp_active ?? true,
          instagram_active: data.instagram_active ?? true,
          facebook_active: data.facebook_active ?? true,
          tiktok_active: data.tiktok_active ?? true,
          email_active: data.email_active ?? true,
          horarios,
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
          whatsapp_active: form.whatsapp_active,
          instagram_active: form.instagram_active,
          facebook_active: form.facebook_active,
          tiktok_active: form.tiktok_active,
          email_active: form.email_active,
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
    <div className="admin-config-page">
      <ConfiguracionNav />
      <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">contact_mail</span>
        Configuración de Contacto
      </h1>

      {/* Sección: Redes Sociales */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: 'var(--admin-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // CANALES DE COMUNICACIÓN
        </h2>

        <div className="admin-channel-list">
          {CANALES.map(({ field, activeField, label, placeholder, icon, color }) => {
            const isActive = form[activeField]
            return (
              <div
                key={field}
                className={`admin-channel-row${isActive ? '' : ' admin-channel-row--inactive'}`}
                style={{ '--channel-accent': color }}
              >
                <div
                  className="admin-channel-row__icon"
                  style={{ borderColor: `${color}40`, background: `${color}1a`, color }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }}>{icon}</span>
                </div>

                <label className="admin-channel-row__label" htmlFor={`canal-${field}`}>{label}</label>

                <input
                  id={`canal-${field}`}
                  className="admin-channel-row__input"
                  value={form[field]}
                  onChange={e => handleChangeRed(field, e.target.value)}
                  placeholder={placeholder}
                />

                <div className="admin-channel-row__toggle">
                  <span className="admin-channel-row__toggle-label">{isActive ? 'Activo' : 'Inactivo'}</span>
                  <ToggleSwitch
                    checked={isActive}
                    onChange={() => handleChangeRed(activeField, !isActive)}
                    label={`${isActive ? 'Desactivar' : 'Activar'} ${label}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sección: Horarios — tabla en desktop (≥1024px), lista apilada en mobile/tablet */}
      <div>
        <h2 style={{ color: 'var(--admin-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // HORARIOS DE ATENCIÓN
        </h2>

        <div className="admin-desktop-only" style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #333b49', borderRadius: '2px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333b49', background: '#1a1f27' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--admin-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Día</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--admin-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abierto</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--admin-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inicio</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--admin-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fin</th>
              </tr>
            </thead>
            <tbody>
              {DIAS_SEMANA.map((dia, idx) => (
                <tr key={dia} style={{ borderBottom: idx < DIAS_SEMANA.length - 1 ? '1px solid #2a3142' : 'none', background: idx % 2 === 0 ? 'transparent' : 'rgba(13, 70, 242, 0.04)' }}>
                  <td style={{ padding: '1rem', color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>{dia}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={form.horarios[dia].abierto}
                      onChange={e => handleChangeHorario(dia, 'abierto', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--admin-primary)' }}
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

        <div className="admin-schedule-list admin-mobile-only">
          {DIAS_SEMANA.map(dia => {
            const { abierto, inicio, fin } = form.horarios[dia]
            return (
              <div key={dia} className={`admin-schedule-row${abierto ? '' : ' admin-schedule-row--closed'}`}>
                <label className="admin-schedule-row__day">
                  <input
                    type="checkbox"
                    checked={abierto}
                    onChange={e => handleChangeHorario(dia, 'abierto', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--admin-primary)', flexShrink: 0 }}
                  />
                  {dia}
                </label>
                <div className="admin-schedule-row__times">
                  <input
                    type="time"
                    disabled={!abierto}
                    value={inicio}
                    onChange={e => handleChangeHorario(dia, 'inicio', e.target.value)}
                    style={{
                      background: 'transparent', border: '1px solid #334155',
                      color: abierto ? 'white' : '#64748b', padding: '0.4rem 0.5rem',
                      borderRadius: '2px', fontFamily: 'monospace', fontSize: '0.8rem',
                      cursor: abierto ? 'pointer' : 'not-allowed',
                    }}
                  />
                  <span>a</span>
                  <input
                    type="time"
                    disabled={!abierto}
                    value={fin}
                    onChange={e => handleChangeHorario(dia, 'fin', e.target.value)}
                    style={{
                      background: 'transparent', border: '1px solid #334155',
                      color: abierto ? 'white' : '#64748b', padding: '0.4rem 0.5rem',
                      borderRadius: '2px', fontFamily: 'monospace', fontSize: '0.8rem',
                      cursor: abierto ? 'pointer' : 'not-allowed',
                    }}
                  />
                </div>
              </div>
            )
          })}
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
