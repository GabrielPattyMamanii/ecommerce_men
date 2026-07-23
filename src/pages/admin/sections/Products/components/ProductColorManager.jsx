import { useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'
import ImageColorPicker from './ImageColorPicker'

/**
 * Sección de colores del formulario de producto. Los colores se muestran
 * siempre como cuadros de color (nunca como texto/hex visible) — mismo
 * criterio de "chip" que ProductSizeManager, pero pintado en vez de rotulado.
 * Alta vía <input type="color"> (selector nativo) o vía "Cuentagotas", que
 * abre un picker propio (ImageColorPicker) para elegir una de las imágenes
 * ya adjuntadas al producto y tomar el color con un clic directo sobre la
 * prenda — funciona en cualquier navegador, sin depender de la EyeDropper
 * API del sistema ni de herramientas externas.
 */
export default function ProductColorManager({ colors = [], onColorsChange, images = [] }) {
    const [pendingColor, setPendingColor] = useState('#00f0ff')
    const [showPicker, setShowPicker] = useState(false)

    const addColor = (hex) => {
        const value = hex.toLowerCase()
        if (colors.includes(value)) return
        onColorsChange([...colors, value])
    }

    const removeColor = (hex) => onColorsChange(colors.filter(c => c !== hex))

    const hasImages = images.length > 0

    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>palette</span>
                Colores disponibles
                <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>

            {/* Selector + cuentagotas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                    type="color"
                    value={pendingColor}
                    onChange={e => setPendingColor(e.target.value)}
                    aria-label="Elegir color"
                    style={{ width: '44px', height: '38px', padding: '2px', border: '1px solid #334155', borderRadius: '2px', background: 'transparent', cursor: 'pointer' }}
                />
                <button type="button" onClick={() => addColor(pendingColor)} style={S.btnGhost}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                    Agregar
                </button>
                <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    disabled={!hasImages}
                    title={hasImages ? 'Tomar color de una imagen del producto' : 'Adjuntá al menos una imagen para usar el cuentagotas'}
                    style={{ ...S.btnGhost, opacity: hasImages ? 1 : 0.5, cursor: hasImages ? 'pointer' : 'not-allowed' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>colorize</span>
                    Cuentagotas
                </button>
            </div>

            {/* Cuadros de colores agregados */}
            {colors.length === 0 ? (
                <p style={{ margin: 0, color: '#475569', fontFamily: 'monospace', fontSize: '0.75rem' }}>Sin colores agregados</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {colors.map(hex => (
                        <div
                            key={hex}
                            style={{
                                display: 'flex', alignItems: 'stretch', height: '34px', borderRadius: '4px', overflow: 'hidden',
                                border: '1px solid #334155',
                            }}
                        >
                            <span
                                title={hex}
                                style={{ width: '34px', background: hex, flexShrink: 0 }}
                            />
                            <button
                                type="button"
                                onClick={() => removeColor(hex)}
                                title={`Quitar color ${hex}`}
                                aria-label={`Quitar color ${hex}`}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '30px', background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                    border: 'none', borderLeft: '1px solid #334155', cursor: 'pointer',
                                    transition: 'background-color 0.15s, color 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = 'white' }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showPicker && (
                <ImageColorPicker
                    images={images}
                    onPick={hex => { addColor(hex); setShowPicker(false) }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    )
}
