// Secciones delegables a un usuario de staff. Debe coincidir exactamente con
// el CHECK constraint de admin_permissions.section (migration-admin-users.sql).
// 'usuarios' queda deliberadamente afuera: nunca es delegable.
export const ASSIGNABLE_SECTIONS = [
    { key: 'productos', label: 'Productos' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'categorias', label: 'Categorías' },
    { key: 'cupones', label: 'Cupones' },
    { key: 'ordenes', label: 'Pedidos' },
    { key: 'clientes', label: 'Usuarios registrados' },
    { key: 'compras', label: 'Compras' },
    { key: 'configuracion', label: 'Configuración' },
]

export const SECTION_LABELS = Object.fromEntries(
    ASSIGNABLE_SECTIONS.map(({ key, label }) => [key, label])
)
