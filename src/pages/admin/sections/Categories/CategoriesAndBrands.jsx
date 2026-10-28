/**
 * CategoriesAndBrands.jsx — Admin: "Categorías y Marcas"
 * Ruta: /admin/categorias (el permiso/sección sigue siendo 'categorias')
 * Contenedor con pestañas: Categorías (árbol) | Marcas.
 */
import { useState } from 'react'
import CategoriesTable from './CategoriesTable'
import BrandsTable from './BrandsTable'

const TABS = [
    { key: 'categorias', label: 'Categorías', icon: 'category' },
    { key: 'marcas',     label: 'Marcas',     icon: 'sell' },
]

export default function CategoriesAndBrands() {
    const [tab, setTab] = useState('categorias')

    return (
        <div>
            <div role="tablist" aria-label="Categorías y marcas" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {TABS.map(t => {
                    const active = tab === t.key
                    return (
                        <button
                            key={t.key} role="tab" aria-selected={active}
                            onClick={() => setTab(t.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer',
                                border: '1px solid var(--admin-border-strong)',
                                background: active ? 'var(--admin-primary)' : 'transparent',
                                color: active ? 'white' : 'var(--admin-text-muted)',
                                fontFamily: 'var(--admin-font)', fontSize: '0.8rem', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                            {t.label}
                        </button>
                    )
                })}
            </div>
            {tab === 'categorias' ? <CategoriesTable /> : <BrandsTable />}
        </div>
    )
}
