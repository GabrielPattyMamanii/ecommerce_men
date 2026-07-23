import { useRef, useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'

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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
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
                                padding: '0.3rem 0.65rem', borderRadius: '2px',
                                border: `1px solid ${active ? 'var(--admin-primary)' : '#334155'}`,
                                background: active ? 'rgba(13,70,242,0.15)' : 'rgba(15,23,42,0.4)',
                                color: active ? 'var(--admin-primary)' : '#94a3b8',
                                fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600,
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
                    style={{ ...S.input, flex: 1 }}
                />
                <button type="button" onClick={() => addSize(customSize)} style={{ ...S.btnGhost, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                    Agregar
                </button>
            </div>

            {/* Chips de talles agregados (presets + custom) */}
            {sizes.length === 0 ? (
                <p style={{ margin: 0, color: '#475569', fontFamily: 'monospace', fontSize: '0.75rem' }}>Sin talles agregados</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {sizes.map(size => (
                        <div
                            key={size}
                            style={{
                                display: 'flex', alignItems: 'stretch', height: '34px', borderRadius: '4px', overflow: 'hidden',
                                background: '#1e293b', border: '1px solid #334155',
                            }}
                        >
                            <span style={{
                                display: 'flex', alignItems: 'center', padding: '0 0.75rem',
                                color: 'white', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600,
                            }}>
                                {size}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeSize(size)}
                                title={`Quitar talle ${size}`}
                                aria-label={`Quitar talle ${size}`}
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
        </div>
    )
}
