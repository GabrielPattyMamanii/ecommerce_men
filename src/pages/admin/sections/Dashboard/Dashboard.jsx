/**
 * Dashboard.jsx — Panel Admin - Introducción
 *
 * Página de bienvenida con diseño coherente al tema oscuro del admin.
 * Paleta: fondo oscuro (#161b2e), textos claros (#f1f5f9), accents azul (#0d46f2)
 * Mantiene la identidad visual del admin TEKGEAR.
 */

/* ── Secciones del Panel Admin ─────────────────── */
const ADMIN_SECTIONS = [
    {
        id: 'productos',
        title: 'Gestión de Productos',
        description: 'Crea, edita y elimina productos del catálogo. Maneja precios, colores y tamaños.',
        icon: 'shopping_bag',
        accentColor: '#0d46f2', // Azul principal
    },
    {
        id: 'ordenes',
        title: 'Órdenes',
        description: 'Visualiza y gestiona todas las órdenes de compra de tus clientes.',
        icon: 'shopping_cart',
        accentColor: '#10b981', // Verde
    },
    {
        id: 'usuarios',
        title: 'Usuarios de Staff',
        description: 'Administra usuarios con acceso al panel admin con permisos específicos.',
        icon: 'group',
        accentColor: '#8b5cf6', // Púrpura
    },
    {
        id: 'inventario',
        title: 'Inventario',
        description: 'Controla tandas, marcas y stock de productos en tiempo real.',
        icon: 'inventory_2',
        accentColor: '#f59e0b', // Ámbar
    },
    {
        id: 'cupones',
        title: 'Cupones',
        description: 'Crea y gestiona códigos de descuento con restricciones por tipo de cliente.',
        icon: 'redeem',
        accentColor: '#ef4444', // Rojo
    },
    {
        id: 'configuracion',
        title: 'Configuración',
        description: 'Personaliza banners, logo, navegación y datos de contacto del sitio.',
        icon: 'settings',
        accentColor: '#94a3b8', // Gris
    },
]

/* ── Tarjeta de Sección ────────────────────────── */
function SectionCard({ title, description, icon, accentColor }) {
    return (
        <div
            className="group relative rounded border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-800/50 cursor-pointer"
            style={{
                borderLeftColor: accentColor,
                borderLeftWidth: '3px',
            }}
        >
            <div className="flex items-start gap-4">
                <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded"
                    style={{ background: `${accentColor}15` }}
                >
                    <span
                        className="material-symbols-outlined text-2xl"
                        style={{ color: accentColor }}
                        aria-hidden="true"
                    >
                        {icon}
                    </span>
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-100 mb-1">{title}</h3>
                    <p className="text-sm text-slate-400">{description}</p>
                </div>
            </div>
            <div className="absolute top-3 right-3 text-slate-600 group-hover:text-slate-400 transition-colors">
                <span className="material-symbols-outlined">arrow_outward</span>
            </div>
        </div>
    )
}

/* ── Card de Característica ────────────────── */
function FeatureCard({ icon, title, description, accentColor }) {
    return (
        <div className="rounded border border-slate-800 bg-slate-900/30 p-5 flex flex-col items-center text-center">
            <div
                className="flex h-10 w-10 items-center justify-center rounded mb-3"
                style={{ background: `${accentColor}15` }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ color: accentColor }}
                    aria-hidden="true"
                >
                    {icon}
                </span>
            </div>
            <h4 className="font-bold text-slate-100 mb-2 text-sm">{title}</h4>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
    )
}

/* ── DASHBOARD PAGE ─────────────────────────────── */
export default function Dashboard() {
    return (
        <section aria-label="Dashboard del Panel Admin" className="space-y-8">

            {/* ─ Encabezado Principal ─ */}
            <div className="border-b border-slate-800 pb-8">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                    // Admin Dashboard
                </p>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 mb-2 uppercase tracking-tight">
                            Panel de Control
                        </h1>
                        <p className="text-sm text-slate-400 max-w-2xl">
                            Gestiona todos los aspectos de tu tienda online desde este panel centralizado.
                            Accede a productos, órdenes, usuarios, inventario, promociones y configuración.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-2">
                        <span
                            className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                            aria-hidden="true"
                        />
                        <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">System Active</span>
                    </div>
                </div>
            </div>

            {/* ─ Características Principales ─ */}
            <div className="grid gap-4 sm:grid-cols-3">
                <FeatureCard
                    icon="dashboard"
                    title="Acceso Centralizado"
                    description="Todas tus herramientas en un único lugar"
                    accentColor="#0d46f2"
                />
                <FeatureCard
                    icon="lock"
                    title="Seguridad Garantizada"
                    description="Solo usuarios autorizados pueden acceder"
                    accentColor="#10b981"
                />
                <FeatureCard
                    icon="speed"
                    title="Interfaz Rápida"
                    description="Diseño optimizado para máxima eficiencia"
                    accentColor="#8b5cf6"
                />
            </div>

            {/* ─ Secciones Disponibles ─ */}
            <div>
                <div className="mb-6">
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                        // Secciones
                    </p>
                    <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">
                        Herramientas Disponibles
                    </h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {ADMIN_SECTIONS.map(section => (
                        <SectionCard
                            key={section.id}
                            title={section.title}
                            description={section.description}
                            icon={section.icon}
                            accentColor={section.accentColor}
                        />
                    ))}
                </div>
            </div>

            {/* ─ Información de Funcionalidades ─ */}
            <div className="rounded border border-slate-800 bg-slate-900/30 p-8 mt-12">
                <div className="mb-6">
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                        // Guía rápida
                    </p>
                    <h3 className="text-lg font-bold text-slate-100 uppercase tracking-tight">¿Qué puedes hacer aquí?</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded"
                                style={{ background: '#0d46f215' }}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ color: '#0d46f2' }}>
                                    shopping_bag
                                </span>
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm mb-1">Productos</p>
                            <p className="text-xs text-slate-500">Crea nuevos artículos, edita precios, colores, tamaños e imágenes del catálogo.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded"
                                style={{ background: '#10b98115' }}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ color: '#10b981' }}>
                                    shopping_cart
                                </span>
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm mb-1">Órdenes</p>
                            <p className="text-xs text-slate-500">Revisa las compras de tus clientes y actualiza estados de entrega.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded"
                                style={{ background: '#8b5cf615' }}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ color: '#8b5cf6' }}>
                                    group
                                </span>
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm mb-1">Usuarios Staff</p>
                            <p className="text-xs text-slate-500">Crea y gestiona cuentas de personal con permisos específicos por sección.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded"
                                style={{ background: '#f59e0b15' }}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ color: '#f59e0b' }}>
                                    inventory_2
                                </span>
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm mb-1">Inventario</p>
                            <p className="text-xs text-slate-500">Organiza tandas de productos, marcas y control de stock en tiempo real.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded"
                                style={{ background: '#ef444415' }}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ color: '#ef4444' }}>
                                    redeem
                                </span>
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm mb-1">Cupones</p>
                            <p className="text-xs text-slate-500">Crea códigos de descuento con restricciones por tipo de cliente (mayorista/minorista).</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded"
                                style={{ background: '#94a3b815' }}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ color: '#94a3b8' }}>
                                    settings
                                </span>
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm mb-1">Configuración</p>
                            <p className="text-xs text-slate-500">Personaliza el banner principal, logo, navegación y datos de contacto.</p>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    )
}
