import { rangoFechas } from '../../lib/lotesUtils'

const muted = { color: 'var(--admin-text-muted)' }
const monoLabel = { ...muted, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }

/** Barra de lo que queda respecto de lo que entró (tope visual 100%). */
export function Barra({ actual, inicial }) {
    const pct = inicial > 0 ? Math.min(100, Math.round((actual / inicial) * 100)) : 0
    const color = actual === 0 ? '#64748b' : pct <= 25 ? '#f59e0b' : '#10b981'
    return (
        <div role="img" aria-label={`Queda el ${pct}%`} style={{ height: '6px', borderRadius: '9999px', background: 'var(--admin-border)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color }} />
        </div>
    )
}

/** Tarjeta de un lote (grupo de `agruparLotes`). Al hacer clic llama onOpen(codigo). */
export function LoteCard({ lote, onOpen }) {
    return (
        <button
            type="button" onClick={() => onOpen(lote.codigo)} aria-label={`Ver productos del ${lote.codigo}`}
            style={{
                textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem',
                background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: '16px', color: 'inherit', font: 'inherit',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--admin-text)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {lote.codigo}
                        {lote.sistema && (
                            <span title="Lote del sistema: no se puede eliminar" style={{ ...monoLabel, border: '1px solid var(--admin-border-strong)', borderRadius: '9999px', padding: '0.1rem 0.5rem', fontWeight: 600 }}>
                                sistema
                            </span>
                        )}
                    </div>
                    <div style={{ ...muted, fontFamily: 'monospace', fontSize: '0.7rem', marginTop: '0.2rem' }}>{rangoFechas(lote)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--admin-text)' }}>{Math.trunc(lote.actual)}</div>
                    <div style={monoLabel}>de {Math.trunc(lote.inicial)} doc.</div>
                </div>
            </div>
            <Barra actual={lote.actual} inicial={lote.inicial} />
            <div style={{ ...muted, fontFamily: 'monospace', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{lote.items.length === 0 ? 'Lote vacío' : `${lote.items.length} ${lote.items.length === 1 ? 'producto' : 'productos'}`}{lote.sistema ? ' · sin lote' : ''}</span>
                <span>{lote.items.length === 0 ? 'agregar productos' : 'ver productos'}</span>
            </div>
        </button>
    )
}
