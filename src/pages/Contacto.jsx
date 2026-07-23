import { useState } from 'react'

const CHANNELS = [
    {
        id: 'whatsapp',
        icon: 'chat',
        label: 'WHATSAPP',
        desc: 'Respuesta directa en tiempo real',
        href: 'https://wa.me/5491100000000',
        color: '#25d366',
    },
    {
        id: 'instagram',
        icon: 'photo_camera',
        label: 'INSTAGRAM',
        desc: 'Seguinos para novedades y drops',
        href: 'https://instagram.com/',
        color: '#e1306c',
    },
    {
        id: 'tiktok',
        icon: 'video_library',
        label: 'TIKTOK',
        desc: 'Contenido técnico y behind the scenes',
        href: 'https://tiktok.com/',
        color: '#69c9d0',
    },
    {
        id: 'email',
        icon: 'mail',
        label: 'EMAIL_AUTH',
        desc: 'Para consultas detalladas y pedidos custom',
        href: 'mailto:info@tekgear.com',
        color: '#00f0ff',
    },
]

export default function Contacto() {
    const [form, setForm] = useState({ name: '', email: '', message: '' })
    const [sent, setSent] = useState(false)
    const [sending, setSending] = useState(false)

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    function handleSubmit(e) {
        e.preventDefault()
        setSending(true)
        // Simula envío (aquí se conectaría a un endpoint real / Edge Function)
        setTimeout(() => {
            setSending(false)
            setSent(true)
            setForm({ name: '', email: '', message: '' })
        }, 1200)
    }

    return (
        <div className="min-h-screen bg-transparent text-slate-200">

            {/* Grid bg ── */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,240,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                }}
                aria-hidden="true"
            />

            <main className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

                {/* Encabezado ── */}
                <div className="mb-10 border-b border-[#333b49] pb-6">
                    <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.3em] mb-2">
            // COMM_PROTOCOL
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                        CONTACT_<span className="text-[#00f0ff]">NODE</span>
                    </h1>
                    <p className="mt-3 text-xs text-slate-500 font-mono max-w-xl leading-relaxed uppercase tracking-wide">
                        Direct terminal access to the Kinetic Archive support unit. All inquiries are processed via encrypted uplink. Establish communication through the channels below.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* ── Canales (IZQUIERDA) ── */}
                    <div>
                        <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-5">
                // CANALES DE COMUNICACIÓN
                        </p>
                        <div className="space-y-3">
                            {CHANNELS.map(ch => (
                                <a
                                    key={ch.id}
                                    href={ch.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-5 p-5 border border-[#333b49] hover:border-[#00f0ff40] bg-[#1a1f27] hover:bg-[#232a35] transition-all duration-200"
                                >
                                    <div
                                        className="flex-shrink-0 flex items-center justify-center w-10 h-10 border"
                                        style={{ borderColor: ch.color + '40', color: ch.color }}
                                    >
                                        <span className="material-symbols-outlined text-lg">{ch.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs font-bold uppercase tracking-widest text-white group-hover:text-[#00f0ff] transition-colors">
                                            {ch.label}
                                        </p>
                                        <p className="font-mono text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                                            {ch.desc}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-600 group-hover:text-[#00f0ff] group-hover:translate-x-1 transition-all text-sm">
                                        arrow_forward
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* ── Horarios (DERECHA) ── */}
                    <div>
                        <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-5">
                            //HORARIOS DE ATENCIÓN AL PUBLICO
                        </p>
                        <div className="border border-[#333b49] p-5">
                            <div className="space-y-2 font-mono text-[10px] text-slate-500 uppercase tracking-wide">
                                <div className="flex justify-between">
                                    <span>Lunes</span>
                                    <span className="text-slate-300 text-[15px]">7:00AM — 12:30AM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Miercoles</span>
                                    <span className="text-slate-300 text-[15px]">7:00AM — 12:30AM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Sabado</span>
                                    <span className="text-slate-300 text-[15px]">7:00AM — 12:30AM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* ── UBICACIÓN ── */}
            <section className="relative z-10 mt-10 px-4 sm:px-6 lg:px-10 max-w-[1100px] mx-auto pb-16">
                <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-4">
                    // GEO_LOCATION
                </p>
                {/* ── Google Maps Embed ──
                    Cuando tengas el iframe de Google Maps, reemplazá el div de abajo
                    por el <iframe ...> que te proporciona Google Maps al hacer clic en
                    "Compartir → Insertar mapa". Ejemplo:
                    <iframe
                        src="TU_URL_DE_GOOGLE_MAPS_AQUI"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Ubicación NEXO Performance"
                    />
                */}
                <div className="w-full h-80 border border-[#333b49] bg-[#1a1f27] flex flex-col items-center justify-center gap-3 text-slate-600">
                    <span className="material-symbols-outlined text-4xl">location_on</span>
                    <p className="font-mono text-[10px] uppercase tracking-widest">GOOGLE_MAPS // PENDIENTE</p>
                </div>
            </section>

        </div>
    )
}
