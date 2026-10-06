import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'
import ProductImageUploader from '../Products/components/ProductImageUploader'
import ConfiguracionNav from './ConfiguracionNav'

const LOGO_BUCKET = 'site-logo'

// Cada tipo define cómo debe prepararse la imagen y cómo la muestra la tienda
// (Navbar.css: .navbar__logo / .navbar__logo--stacked; Footer.jsx: h-14 / h-24).
const LOGO_TYPES = {
  horizontal: {
    label: 'Horizontal',
    icon: 'crop_landscape',
    description: 'Icono + nombre en una sola línea (ej. ▲ AURA STORE).',
    ratio: '4 / 1',
    size: '760 × 200 px',
    shown: '190 × 50 px en escritorio y 130 × 36 px en celular',
    ratioText: 'cerca de 4:1 (ancho ≈ 4 veces el alto)',
    convert: { quality: 0.92, maxWidth: 800, maxHeight: 400 },
  },
  stacked: {
    label: 'Apilado (texto debajo)',
    icon: 'crop_din',
    description: 'Siglas o nombre grande con una línea de texto debajo (ej. KRM / indumentaria).',
    ratio: '9 / 5',
    size: '900 × 500 px',
    shown: '210 × 116 px en escritorio y 130 × 72 px en celular (la cabecera crece para acomodarlo)',
    ratioText: 'cerca de 1.8:1 (ancho ≈ 1.8 veces el alto)',
    convert: { quality: 0.92, maxWidth: 1000, maxHeight: 600 },
  },
}

export default function ConfiguracionLogo() {
  const [images, setImages] = useState([]) // [] vacío, o [string url existente], o [File nuevo]
  const [logoType, setLogoType] = useState('horizontal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast, dismissToast } = useToasts()

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('site_logo_settings')
        .select('logo_url, logo_type')
        .eq('id', 1)
        .maybeSingle()
      if (error) addToast('error', 'No se pudo cargar la configuración del logo')
      if (data) {
        setImages(data.logo_url ? [data.logo_url] : [])
        if (LOGO_TYPES[data.logo_type]) setLogoType(data.logo_type)
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
          logo_type: logoType,
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

  const type = LOGO_TYPES[logoType]

  if (loading) return <div style={{ padding: '2rem', color: 'var(--admin-text-muted)' }}>Cargando…</div>

  return (
    <div className="admin-config-page">
      <ConfiguracionNav />
      <h1 style={{ color: 'var(--admin-text)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">image</span>
        Logo del Sitio
      </h1>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--admin-text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          Tipo de logo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(LOGO_TYPES).map(([key, t]) => {
            const active = key === logoType
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLogoType(key)}
                aria-pressed={active}
                style={{
                  textAlign: 'left', padding: '0.9rem 1rem', cursor: 'pointer', borderRadius: '2px',
                  border: `2px solid ${active ? 'var(--admin-primary)' : 'var(--admin-border-strong)'}`,
                  background: active ? 'rgba(var(--admin-primary-rgb),0.08)' : 'var(--admin-surface)',
                  color: 'var(--admin-text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: active ? 'var(--admin-primary)' : 'inherit' }}>{t.icon}</span>
                  {t.label}
                  {active && <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', marginLeft: 'auto', color: 'var(--admin-primary)' }}>check_circle</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.3rem' }}>{t.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-surface)', borderRadius: '2px', color: 'var(--admin-text)', fontSize: '0.8rem', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>info</span>
          Cómo preparar el logo ({type.label.toLowerCase()})
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--admin-text-muted)' }}>
          <li><strong>Formato:</strong> PNG con fondo transparente (recomendado) o WebP. También se acepta JPG, pero con fondo blanco sólido. No se admite SVG.</li>
          <li><strong>Proporción:</strong> {type.ratioText}.</li>
          <li><strong>Tamaño recomendado:</strong> <strong>{type.size}</strong>. Se muestra a {type.shown}; el doble de resolución mantiene la nitidez en pantallas retina.</li>
          <li><strong>Sin márgenes:</strong> recortá la imagen al borde del logo. Si tiene espacio vacío alrededor, se verá más pequeño.</li>
          <li><strong>Colores:</strong> el fondo de la tienda es claro (blanco); usá una versión del logo oscura o de color y evitá letras blancas.</li>
          <li><strong>Peso:</strong> idealmente menos de 200 KB (máximo 10 MB). Se convierte automáticamente a WebP y se reduce a {type.convert.maxWidth} × {type.convert.maxHeight} px como máximo.</li>
          <li>El mismo logo se usa en la cabecera y en el pie de página. Elegí el tipo que coincida con tu imagen: si no, se verá deformado o muy pequeño.</li>
        </ul>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <ProductImageUploader
          images={images}
          onImagesChange={setImages}
          maxImages={1}
          onError={msg => addToast('error', msg)}
          label="Logo de la tienda"
          optionalLabel={false}
          emptyText="Adjuntar logo"
          moreText="Para cambiarlo, eliminá el logo actual (✕)"
          previewFit="contain"
          previewAspect={type.ratio}
          previewMinWidth={240}
          previewBg="repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 16px 16px"
          convertOptions={type.convert}
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
