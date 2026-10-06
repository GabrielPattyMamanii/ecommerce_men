import { useState } from 'react'
import { PF, pfStyles } from './productFormTheme'
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
    const [pendingColor, setPendingColor] = useState('#00f2ff')
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', ...pfStyles.label, marginBottom: '0.6rem' }}>
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
                    style={{ width: '44px', height: '38px', padding: '2px', border: `1px solid ${PF.color.borderStrong}`, borderRadius: PF.radius.md, background: 'transparent', cursor: 'pointer' }}
                />
                <button type="button" onClick={() => addColor(pendingColor)} style={pfStyles.btnGhost}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                    Agregar
                </button>
                <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    disabled={!hasImages}
                    title={hasImages ? 'Tomar color de una imagen del producto' : 'Adjuntá al menos una imagen para usar el cuentagotas'}
                    style={{ ...pfStyles.btnGhost, opacity: hasImages ? 1 : 0.5, cursor: hasImages ? 'pointer' : 'not-allowed' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>colorize</span>
                    Cuentagotas
                </button>
            </div>

            {/* Cuadros de colores agregados */}
            {colors.length === 0 ? (
                <p style={{ margin: 0, color: PF.color.textMuted, fontFamily: PF.font.body, fontSize: '0.75rem' }}>Sin colores agregados</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {colors.map(hex => (
                        <div key={hex} style={pfStyles.chip}>
                            <span title={hex} style={{ width: '34px', background: hex, flexShrink: 0 }} />
                            <button
                                type="button"
                                onClick={() => removeColor(hex)}
                                title={`Quitar color ${hex}`}
                                aria-label={`Quitar color ${hex}`}
                                style={pfStyles.chipRemove}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = PF.color.danger; e.currentTarget.style.color = PF.color.surfaceLow }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = PF.color.dangerSoft; e.currentTarget.style.color = PF.color.danger }}
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
