import { useState } from 'react'
import { ToggleSwitch } from '../../../../../components/admin/AdminKit'
import { PF, pfStyles } from './productFormTheme'
import { createEmptySizeGuide } from './sizeGuideUtils'

/**
 * Editor de la guía de talles. Estado en el padre (ProductFormModal):
 * `guide === null` significa desactivada. Las filas salen siempre de `sizes`,
 * así que agregar/quitar talles se refleja solo y los valores ya cargados
 * de los talles que siguen existiendo se conservan.
 */
export default function ProductSizeGuideEditor({ guide, onGuideChange, sizes, disabled }) {
    const [newColumn, setNewColumn] = useState('')
    const enabled = guide !== null

    const toggle = () => onGuideChange(enabled ? null : createEmptySizeGuide())

    const setColumnName = (idx, name) =>
        onGuideChange({ ...guide, columns: guide.columns.map((c, i) => (i === idx ? name : c)) })

    const removeColumn = (idx) => onGuideChange({
        columns: guide.columns.filter((_, i) => i !== idx),
        values: Object.fromEntries(Object.entries(guide.values).map(([s, vals]) => [s, vals.filter((_, i) => i !== idx)])),
    })

    const addColumn = () => {
        const name = newColumn.trim()
        if (!name) return
        onGuideChange({ ...guide, columns: [...guide.columns, name] })
        setNewColumn('')
    }

    const setValue = (size, idx, value) => {
        const row = [...(guide.values[size] ?? [])]
        while (row.length < guide.columns.length) row.push('')
        row[idx] = value
        onGuideChange({ ...guide, values: { ...guide.values, [size]: row } })
    }

    const cellInput = {
        width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none',
        color: PF.color.text, fontFamily: PF.font.body, fontSize: '0.85rem', padding: '0.5rem 0.6rem',
        outline: 'none', textAlign: 'center',
    }
    const th = {
        padding: 0, borderBottom: `1px solid ${PF.color.borderStrong}`, background: PF.color.surfaceContainer,
        fontFamily: PF.font.headline, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
    }
    const td = { padding: 0, borderBottom: `1px solid ${PF.color.border}` }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: PF.color.surfaceContainer, border: `1px solid ${PF.color.border}`, borderRadius: PF.radius.md }}>
                <ToggleSwitch checked={enabled} onChange={toggle} label="Mostrar guía de talles" disabled={disabled} />
                <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: PF.color.text, cursor: 'pointer' }} onClick={disabled ? undefined : toggle}>
                        Mostrar guía de talles
                    </div>
                    <div style={{ fontSize: '0.72rem', color: PF.color.textMuted, lineHeight: 1.4 }}>
                        Agrega una pestaña &quot;Guía de talles&quot; en la página del producto.
                    </div>
                </div>
            </div>

            {enabled && (
                <div style={{ marginTop: '1rem' }}>
                    {sizes.length === 0 ? (
                        <p style={{ margin: 0, color: PF.color.textMuted, fontSize: '0.78rem', lineHeight: 1.5 }}>
                            Primero agregá talles en &quot;Talles y Colores&quot;: cada talle será una fila de la tabla.
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto', border: `1px solid ${PF.color.border}`, borderRadius: PF.radius.md }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '320px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...th, padding: '0.5rem 0.75rem', color: PF.color.textMuted, width: '90px' }}>Talle</th>
                                        {guide.columns.map((col, i) => (
                                            <th key={i} style={th}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <input
                                                        value={col} onChange={e => setColumnName(i, e.target.value)}
                                                        aria-label={`Nombre de la columna ${i + 1}`}
                                                        style={{ ...cellInput, fontFamily: PF.font.headline, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, minWidth: '70px' }}
                                                    />
                                                    <button
                                                        type="button" onClick={() => removeColumn(i)}
                                                        title={`Quitar columna ${col}`} aria-label={`Quitar columna ${col}`}
                                                        style={{ background: 'transparent', border: 'none', color: PF.color.danger, cursor: 'pointer', display: 'flex', padding: '0 0.3rem' }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sizes.map(size => (
                                        <tr key={size}>
                                            <td style={{ ...td, padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: PF.color.text, background: PF.color.surfaceLowest }}>
                                                {size}
                                            </td>
                                            {guide.columns.map((col, i) => (
                                                <td key={i} style={td}>
                                                    <input
                                                        value={guide.values[size]?.[i] ?? ''}
                                                        onChange={e => setValue(size, i, e.target.value)}
                                                        aria-label={`${col || `Columna ${i + 1}`} del talle ${size}`}
                                                        placeholder="—" style={cellInput}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <input
                            value={newColumn} onChange={e => setNewColumn(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn() } }}
                            placeholder='Nueva columna (ej. "Mangas", "Cintura")'
                            style={{ ...pfStyles.input, flex: 1 }}
                        />
                        <button type="button" onClick={addColumn} style={{ ...pfStyles.btnGhost, flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                            Agregar columna
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
