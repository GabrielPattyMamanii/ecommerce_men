import { useRef, useState } from 'react'
import { PF, pfStyles } from './productFormTheme'

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Único']

/**
 * Sección de talles del formulario de producto. Igual que ProductImageUploader,
 * no tiene estado "fuente de verdad" propio — lo mantiene el padre (ProductFormModal).
 */
export default function ProductSizeManager({ sizes = [], onSizesChange }) {
    const [customSize, setCustomSize] = useState('')
    const inputRef = useRef(null)

    const addSize = (rawValue) => {
        const value = rawValue.trim().toUpperCase()
        if (!value || sizes.includes(value)) {
            setCustomSize('')
            inputRef.current?.focus()
            return
        }
        onSizesChange([...sizes, value])
        setCustomSize('')
        inputRef.current?.focus()
    }

    const removeSize = (size) => onSizesChange(sizes.filter(s => s !== size))

    const togglePreset = (preset) => {
        if (sizes.includes(preset)) removeSize(preset)
        else onSizesChange([...sizes, preset])
    }

    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', ...pfStyles.label, marginBottom: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>straighten</span>
                Talles disponibles
                <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>

            {/* Presets rápidos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                {SIZE_PRESETS.map(preset => {
                    const active = sizes.includes(preset)
                    return (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => togglePreset(preset)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.3rem 0.65rem', borderRadius: PF.radius.md,
                                border: `1px solid ${active ? PF.color.accent : PF.color.borderStrong}`,
                                background: active ? PF.color.accentSoft : PF.color.surfaceLowest,
                                color: active ? PF.color.accent : PF.color.textMuted,
                                fontFamily: PF.font.body, fontSize: '0.75rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {active && <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>check</span>}
                            {preset}
                        </button>
                    )
                })}
            </div>

            {/* Input de talle personalizado */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                    ref={inputRef}
                    value={customSize}
                    onChange={e => setCustomSize(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(customSize) } }}
                    placeholder='Talle personalizado (ej. "38", "S/M")'
                    style={{ ...pfStyles.input, flex: 1 }}
                />
                <button type="button" onClick={() => addSize(customSize)} style={{ ...pfStyles.btnGhost, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                    Agregar
                </button>
            </div>

            {/* Chips de talles agregados (presets + custom) */}
            {sizes.length === 0 ? (
                <p style={{ margin: 0, color: PF.color.textMuted, fontFamily: PF.font.body, fontSize: '0.75rem' }}>Sin talles agregados</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {sizes.map(size => (
                        <div key={size} style={pfStyles.chip}>
                            <span style={{
                                display: 'flex', alignItems: 'center', padding: '0 0.75rem',
                                color: PF.color.text, fontFamily: PF.font.body, fontSize: '0.8rem', fontWeight: 600,
                            }}>
                                {size}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeSize(size)}
                                title={`Quitar talle ${size}`}
                                aria-label={`Quitar talle ${size}`}
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
        </div>
    )
}
