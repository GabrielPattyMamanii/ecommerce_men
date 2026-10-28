import { useEffect, useState } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { S, useToasts, ToastStack } from '../../../../components/admin/AdminKit'
import { invalidatePriceVisibility } from '../../../../hooks/usePriceVisibility'
import ConfiguracionNav from './ConfiguracionNav'

const PRICE_OPTIONS = [
  {
    field: 'show_retail',
    icon: 'person',
    title: 'Precio por unidad',
    description: 'Compra Por Menor. Se muestra en el catálogo, el inicio y el detalle del producto.',
  },
  {
    field: 'show_wholesale',
    icon: 'inventory_2',
    title: 'Precio por docena',
    description: 'Compra Por Mayor (12 unidades). Solo aplica a productos que tengan precio por docena cargado.',
  },
]

const PURCHASE_OPTION = {
  field: 'purchases_enabled',
  icon: 'shopping_cart',
  title: 'Compras habilitadas',
  onLabel: 'Activadas',
  offLabel: 'Desactivadas',
  description: 'Si lo desactivás, la tienda funciona solo como catálogo: se oculta el carrito y el checkout, y cada producto se consulta por WhatsApp.',
}

export default function ConfiguracionTienda() {
  const [form, setForm] = useState({ show_retail: true, show_wholesale: true, purchases_enabled: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast, dismissToast } = useToasts()

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('site_price_settings')
        .select('show_retail, show_wholesale, purchases_enabled')
        .eq('id', 1)
        .maybeSingle()
      if (error) addToast('error', 'No se pudo cargar la configuración (¿corriste la migración?)')
      if (data) setForm({ show_retail: data.show_retail, show_wholesale: data.show_wholesale, purchases_enabled: data.purchases_enabled !== false })
      setLoading(false)
    }
    fetchSettings()
  }, [])

  function toggle(field) {
    if (field === 'purchases_enabled') {
      setForm(prev => ({ ...prev, purchases_enabled: !prev.purchases_enabled }))
      return
    }
    const other = field === 'show_retail' ? 'show_wholesale' : 'show_retail'
    // Al menos un tipo de precio debe quedar activo.
    if (form[field] && !form[other]) {
      addToast('error', 'Debe haber al menos un tipo de precio activo')
      return
    }
    setForm(prev => ({ ...prev, [field]: !prev[field] }))
  }

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('site_price_settings')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()

    if (error || !data?.length) {
      addToast('error', error ? `Error: ${error.message}` : 'No se pudo guardar la configuración')
    } else {
      invalidatePriceVisibility()
      addToast('success', 'Configuración guardada correctamente')
    }
    setSaving(false)
  }

  function renderSwitch({ field, icon, title, description, onLabel = 'Visible', offLabel = 'Oculto' }) {
    const on = form[field]
    return (
      <button
        key={field}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => toggle(field)}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', width: '100%',
          background: 'var(--admin-surface, transparent)', color: 'var(--admin-text)',
          border: `1px solid ${on ? 'var(--admin-primary)' : 'var(--admin-border, #334155)'}`,
          borderRadius: '6px', padding: '1rem', cursor: 'pointer',
        }}
      >
        <span className="material-symbols-outlined" style={{ color: on ? 'var(--admin-primary)' : 'var(--admin-text-faint)' }}>{icon}</span>
        <span style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: '0.95rem' }}>{title}</strong>
          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{description}</span>
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: on ? 'var(--admin-primary)' : 'var(--admin-text-faint)' }}>
          {on ? onLabel : offLabel}
        </span>
        <span aria-hidden="true" style={{
          width: 42, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
          background: on ? 'var(--admin-primary)' : '#64748b', transition: 'background .15s',
        }}>
          <span style={{
            position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18,
            borderRadius: '50%', background: '#fff', transition: 'left .15s',
          }} />
        </span>
      </button>
    )
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--admin-text-muted)' }}>Cargando…</div>

  const both = form.show_retail && form.show_wholesale

  return (
    <div className="admin-config-page">
      <ConfiguracionNav />
      <h1 style={{ color: 'var(--admin-text)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined">storefront</span>
        Configuración de la tienda
      </h1>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Controlá qué ve y qué puede hacer el público en la tienda: si se puede comprar o es solo un catálogo, y qué precios se muestran.
        Si activás los dos precios, la ficha del producto muestra el selector <strong style={{ color: 'var(--admin-text)' }}>Por Menor / Por Mayor</strong>.
        Un tipo de precio desactivado se oculta en la tienda y tampoco se puede pagar en el checkout.
      </p>

      <h2 style={{ color: 'var(--admin-text)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Compras</h2>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {renderSwitch(PURCHASE_OPTION)}
      </div>
      <p style={{ color: 'var(--admin-text-faint)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
        {form.purchases_enabled
          ? 'Los clientes pueden agregar productos al carrito y pagar.'
          : 'Modo catálogo: los clientes ven productos y precios, pero no pueden comprar. El checkout también queda bloqueado.'}
      </p>

      <h2 style={{ color: 'var(--admin-text)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Visibilidad de precios</h2>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {PRICE_OPTIONS.map(renderSwitch)}
      </div>

      <p style={{ color: 'var(--admin-text-faint)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
        {both
          ? 'Se muestran los dos precios: el cliente elige entre unidad y docena en la ficha del producto.'
          : form.show_retail
            ? 'Solo precio por unidad: las tarjetas y la ficha muestran únicamente el precio Por Menor.'
            : 'Solo precio por docena: las tarjetas muestran el precio por docena y la ficha solo permite compra Por Mayor. Los productos sin precio por docena figurarán como "Consultar precio".'}
      </p>

      <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>save</span>
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
