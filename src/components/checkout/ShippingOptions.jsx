import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export function ShippingOptions({ onSelect, selectedOption, opciones = [], loading = false, error = null, direccion }) {
  const [sucursales, setSucursales] = useState([])
  const [loadingSucursales, setLoadingSucursales] = useState(false)

  async function cargarSucursales(opcion) {
    if (opcion.dropOffType !== 'Branch') return

    setLoadingSucursales(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('envia-sucursales', {
        body: {
          carrier: opcion.carrier,
          postalCode: direccion.postalCode,
          province: direccion.province,
        },
      })

      if (fnError) throw fnError
      setSucursales(data?.sucursales || [])
    } catch (err) {
      console.error('Error al cargar sucursales:', err)
    } finally {
      setLoadingSucursales(false)
    }
  }

  function handleSelectOption(opcion) {
    if (opcion.dropOffType === 'Branch') {
      cargarSucursales(opcion)
    }
    onSelect(opcion)
  }

  if (!opciones?.length && !loading && !error) {
    return null
  }

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #333b49' }}>
      <h4 style={{
        fontSize: '0.875rem', fontWeight: 700, color: 'white', textTransform: 'uppercase',
        fontFamily: 'var(--admin-font)', letterSpacing: '0.05em', marginBottom: '1rem', margin: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.5rem' }}>
          local_shipping
        </span>
        Opciones de Envío
      </h4>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
            progress_activity
          </span>
          Cotizando opciones…
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444',
          fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
          {error}
        </div>
      )}

      {!loading && !error && opciones.length === 0 && (
        <div style={{
          background: 'rgba(219,234,254,0.08)', border: '1px solid rgba(219,234,254,0.3)',
          borderRadius: '2px', padding: '0.75rem 1rem', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            info
          </span>
          No hay opciones de envío disponibles para esta dirección. Coordina por WhatsApp.
        </div>
      )}

      {opciones.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {opciones.map((opcion, idx) => (
            <div key={idx}>
              <button
                onClick={() => handleSelectOption(opcion)}
                style={{
                  width: '100%', padding: '1rem', background: selectedOption?.carrier === opcion.carrier && selectedOption?.service === opcion.service ? '#1e293b' : '#232a35',
                  border: selectedOption?.carrier === opcion.carrier && selectedOption?.service === opcion.service ? '1px solid #10b981' : '1px solid #3f4452',
                  borderRadius: '2px', color: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.target.style.borderColor = '#4a5568'}
                onMouseLeave={e => e.target.style.borderColor = selectedOption?.carrier === opcion.carrier ? '#10b981' : '#3f4452'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: selectedOption?.carrier === opcion.carrier && selectedOption?.service === opcion.service ? '#10b981' : 'white' }}>
                    {opcion.carrier} — {opcion.dropOffDescription || opcion.service}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: selectedOption?.carrier === opcion.carrier && selectedOption?.service === opcion.service ? '#6ee7b7' : '#cbd5e1', fontFamily: 'monospace' }}>
                    Entrega estimada: {opcion.dias || 'N/A'} días
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: selectedOption?.carrier === opcion.carrier && selectedOption?.service === opcion.service ? '#10b981' : '#3b82f6' }}>
                    ${opcion.precio?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </button>

              {selectedOption?.carrier === opcion.carrier && selectedOption?.service === opcion.service && opcion.dropOffType === 'Branch' && (
                <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                  {loadingSucursales ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cargando sucursales…</div>
                  ) : sucursales.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>No hay sucursales disponibles</div>
                  ) : (
                    <>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Elegí una sucursal
                      </label>
                      <select
                        onChange={e => {
                          const sucursal = sucursales.find(s => s.codigo === e.target.value)
                          if (sucursal) {
                            onSelect({ ...opcion, sucursalCodigo: sucursal.codigo, sucursalDireccion: sucursal.direccion })
                          }
                        }}
                        style={{
                          width: '100%', padding: '0.5rem', background: '#12161c', border: '1px solid #334155',
                          color: 'white', fontSize: '0.875rem', borderRadius: '2px', fontFamily: 'monospace',
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {sucursales.map(s => (
                          <option key={s.codigo} value={s.codigo}>
                            {s.nombre} — {s.direccion}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
