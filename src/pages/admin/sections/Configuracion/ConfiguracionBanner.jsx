import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'
import ProductImageUploader from '../Products/components/ProductImageUploader'
import ConfiguracionNav from './ConfiguracionNav'

const BANNER_BUCKET = 'site-banners'

const EMPTY_FORM = {
  eyebrow: '',
  headline_line1: '',
  headline_line2: '',
  description: '',
  cta_primary_text: '',
  cta_primary_link: '',
  cta_secondary_text: '',
  cta_secondary_link: '',
}

export default function ConfiguracionBanner() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [images, setImages] = useState([]) // [] vacío, o [string url existente], o [File nuevo]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast, dismissToast } = useToasts()

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('home_banner_settings')
        .select('eyebrow, headline_line1, headline_line2, description, cta_primary_text, cta_primary_link, cta_secondary_text, cta_secondary_link, image_url')
        .eq('id', 1)
        .maybeSingle()
      if (error) addToast('error', 'No se pudo cargar la configuración del banner')
      if (data) {
        setForm({
          eyebrow: data.eyebrow || '',
          headline_line1: data.headline_line1 || '',
          headline_line2: data.headline_line2 || '',
          description: data.description || '',
          cta_primary_text: data.cta_primary_text || '',
          cta_primary_link: data.cta_primary_link || '',
          cta_secondary_text: data.cta_secondary_text || '',
          cta_secondary_link: data.cta_secondary_link || '',
        })
        setImages(data.image_url ? [data.image_url] : [])
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
      let image_url = images.length > 0 && typeof images[0] === 'string' ? images[0] : null

      // Si el usuario cargó un archivo nuevo (no un string), subirlo al bucket.
      const pendingFile = images.find(img => typeof img !== 'string')
      if (pendingFile) {
        const fileName = `${crypto.randomUUID()}.webp`
        const { error: uploadError } = await supabase.storage
          .from(BANNER_BUCKET)
          .upload(fileName, pendingFile)
        if (uploadError) {
          addToast('error', `Error al subir la imagen: ${uploadError.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(fileName)
        image_url = publicUrl
      }

      const { data, error } = await supabase
        .from('home_banner_settings')
        .update({
          eyebrow: (form.eyebrow || '').trim() || null,
          headline_line1: (form.headline_line1 || '').trim() || null,
          headline_line2: (form.headline_line2 || '').trim() || null,
          description: (form.description || '').trim() || null,
          cta_primary_text: (form.cta_primary_text || '').trim() || null,
          cta_primary_link: (form.cta_primary_link || '').trim() || null,
          cta_secondary_text: (form.cta_secondary_text || '').trim() || null,
          cta_secondary_link: (form.cta_secondary_link || '').trim() || null,
          image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select()

      if (error) {
        console.error('Error guardando banner:', error)
        addToast('error', `Error: ${error.message}`)
        setSaving(false)
        return
      }

      if (!data?.length) {
        addToast('error', 'No se pudo guardar el banner (sin datos)')
        setSaving(false)
        return
      }

      addToast('success', 'Banner guardado correctamente')
      setSaving(false)
    } catch (err) {
      console.error('Excepción al guardar banner:', err)
      addToast('error', 'Error inesperado al guardar')
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Cargando…</div>

  return (
    <div className="admin-config-page">
      <ConfiguracionNav />
      <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">campaign</span>
        Banner de Inicio
      </h1>

      <div style={{ marginBottom: '2rem' }}>
        <ProductImageUploader
          images={images}
          onImagesChange={setImages}
          maxImages={1}
          onError={msg => addToast('error', msg)}
        />
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: 'var(--admin-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // TEXTOS DEL BANNER
        </h2>

        <div className="admin-form-grid-2">
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Eyebrow (texto pequeño arriba del título)</label>
            <input style={S.input} value={form.eyebrow}
              onChange={e => handleChange('eyebrow', e.target.value)}
              placeholder="NUEVA TEMPORADA" />
          </div>
          <div>
            <label style={S.label}>Título — línea 1</label>
            <input style={S.input} value={form.headline_line1}
              onChange={e => handleChange('headline_line1', e.target.value)}
              placeholder="RENDIMIENTO" />
          </div>
          <div>
            <label style={S.label}>Título — línea 2 (se muestra con efecto de contorno)</label>
            <input style={S.input} value={form.headline_line2}
              onChange={e => handleChange('headline_line2', e.target.value)}
              placeholder="SIN LÍMITES" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Descripción</label>
            <textarea style={{ ...S.input, minHeight: '80px', resize: 'vertical' }} value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Descripción breve debajo del título" />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: 'var(--admin-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          // BOTONES (CTA)
        </h2>

        <div className="admin-form-grid-2">
          <div>
            <label style={S.label}>Botón principal — texto</label>
            <input style={S.input} value={form.cta_primary_text}
              onChange={e => handleChange('cta_primary_text', e.target.value)}
              placeholder="Ver Catálogo" />
          </div>
          <div>
            <label style={S.label}>Botón principal — link</label>
            <input style={S.input} value={form.cta_primary_link}
              onChange={e => handleChange('cta_primary_link', e.target.value)}
              placeholder="/catalogo" />
          </div>
          <div>
            <label style={S.label}>Botón secundario — texto (opcional)</label>
            <input style={S.input} value={form.cta_secondary_text}
              onChange={e => handleChange('cta_secondary_text', e.target.value)}
              placeholder="Dejar vacío para no mostrarlo" />
          </div>
          <div>
            <label style={S.label}>Botón secundario — link</label>
            <input style={S.input} value={form.cta_secondary_link}
              onChange={e => handleChange('cta_secondary_link', e.target.value)}
              placeholder="/catalogo" />
          </div>
        </div>
      </div>

      <div>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
          {saving ? 'Guardando…' : 'Guardar banner'}
        </button>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
