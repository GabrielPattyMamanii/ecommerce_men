import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'
import ProductImageUploader from '../Products/components/ProductImageUploader'
import ConfiguracionNav from './ConfiguracionNav'

const LOGO_BUCKET = 'site-logo'

export default function ConfiguracionLogo() {
  const [images, setImages] = useState([]) // [] vacío, o [string url existente], o [File nuevo]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast, dismissToast } = useToasts()

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('site_logo_settings')
        .select('logo_url')
        .eq('id', 1)
        .maybeSingle()
      if (error) addToast('error', 'No se pudo cargar la configuración del logo')
      if (data) {
        setImages(data.logo_url ? [data.logo_url] : [])
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      let logo_url = images.length > 0 && typeof images[0] === 'string' ? images[0] : null

      // Si el usuario cargó un archivo nuevo (no un string), subirlo al bucket.
      const pendingFile = images.find(img => typeof img !== 'string')
      if (pendingFile) {
        const fileName = `${crypto.randomUUID()}.webp`
        const { error: uploadError } = await supabase.storage
          .from(LOGO_BUCKET)
          .upload(fileName, pendingFile)
        if (uploadError) {
          addToast('error', `Error al subir la imagen: ${uploadError.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName)
        logo_url = publicUrl
      }

      const { data, error } = await supabase
        .from('site_logo_settings')
        .update({
          logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select()

      if (error) {
        console.error('Error guardando logo:', error)
        addToast('error', `Error: ${error.message}`)
        setSaving(false)
        return
      }

      if (!data?.length) {
        addToast('error', 'No se pudo guardar el logo (sin datos)')
        setSaving(false)
        return
      }

      addToast('success', 'Logo guardado correctamente')
      setSaving(false)
    } catch (err) {
      console.error('Excepción al guardar logo:', err)
      addToast('error', 'Error inesperado al guardar')
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Cargando…</div>

  return (
    <div className="admin-config-page">
      <ConfiguracionNav />
      <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">image</span>
        Logo del Sitio
      </h1>

      <div style={{ marginBottom: '2rem' }}>
        <ProductImageUploader
          images={images}
          onImagesChange={setImages}
          maxImages={1}
          onError={msg => addToast('error', msg)}
        />
      </div>

      <div>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
          {saving ? 'Guardando…' : 'Guardar logo'}
        </button>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
