import { useEffect, useState } from 'react'
import { useDebounce } from '../../../../../hooks/useDebounce'

export default function BuscadorInventario({ onSearch, onClear, placeholder = 'Buscar por código de producto o boleta...' }) {
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 300)

    useEffect(() => {
        if (debouncedSearch.trim()) onSearch(debouncedSearch)
        else onClear()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch])

    function handleClear() {
        setSearchTerm('')
        onClear()
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <span
                className="material-symbols-outlined"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1.1rem', pointerEvents: 'none' }}
            >
                search
            </span>
            <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', boxSizing: 'border-box', padding: '0.5rem 2.25rem',
                    background: '#0f172a', border: '1px solid #334155', borderRadius: '2px',
                    color: 'white', fontFamily: 'monospace', fontSize: '0.8rem', outline: 'none',
                }}
            />
            {searchTerm && (
                <button
                    onClick={handleClear}
                    title="Limpiar búsqueda"
                    aria-label="Limpiar búsqueda"
                    style={{
                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
                        display: 'flex', padding: '0.25rem',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                </button>
            )}
        </div>
    )
}
