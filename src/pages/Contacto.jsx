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
    const [form, setForm]       = useState({ name: '', email: '', message: '' })
    const [sent, setSent]       = useState(false)
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
                <div className="mb-10 border-b border-[#1a1a2e] pb-6">
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

                    {/* ── Canales ── */}
                    <div>
                        <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-5">
                            // DIRECT_CHANNELS
                        </p>
                        <div className="space-y-3">
                            {CHANNELS.map(ch => (
                                <a
                                    key={ch.id}
                                    href={ch.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-5 p-5 border border-[#1a1a2e] hover:border-[#00f0ff40] bg-[#0a0a0a] hover:bg-[#0f0f18] transition-all duration-200"
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

                        {/* Horarios ── */}
                        <div className="mt-6 border border-[#1a1a2e] p-5">
                            <p className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-widest mb-3">
                                SYSTEM_UPTIME
                            </p>
                            <div className="space-y-2 font-mono text-[10px] text-slate-500 uppercase tracking-wide">
                                <div className="flex justify-between">
                                    <span>Lun — Vie</span>
                                    <span className="text-slate-300">09:00 — 18:00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Sábado</span>
                                    <span className="text-slate-300">10:00 — 14:00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Domingo</span>
                                    <span className="text-red-500">OFFLINE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Formulario ── */}
                    <div>
                        <p className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-5">
                            // TRANSMIT_INQUIRY
                        </p>

                        {sent ? (
                            <div className="h-full flex flex-col items-center justify-center py-16 border border-[#00f0ff30] bg-[#00f0ff05] text-center gap-4">
                                <span className="material-symbols-outlined text-4xl text-[#00f0ff]">check_circle</span>
                                <p className="font-mono text-sm text-[#00f0ff] uppercase tracking-widest">TRANSMISSION_SENT</p>
                                <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">We'll respond within 24h</p>
                                <button
                                    onClick={() => setSent(false)}
                                    className="mt-4 px-6 py-2 border border-[#1a1a2e] hover:border-[#00f0ff] text-slate-500 hover:text-[#00f0ff] font-mono text-[10px] uppercase tracking-widest transition-all"
                                >
                                    NEW_INQUIRY
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5 bg-[#0a0a0a] border border-[#1a1a2e] p-6 relative">
                                {/* Línea superior ── */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-[1px]"
                                    style={{ background: 'linear-gradient(90deg, transparent, #00f0ff40, transparent)' }}
                                />

                                <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest mb-4">
                                    ENCRYPTED DATA PACKET SUBMISSION
                                </p>

                                {/* Nombre ── */}
                                <div>
                                    <label className="block font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                                        OPERATOR_ID
                                    </label>
                                    <input
                                        name="name"
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Tu nombre"
                                        className="w-full bg-transparent border border-[#1e293b] text-white px-4 py-3 font-mono text-sm placeholder-[#334155]
                                                   focus:border-[#00f0ff] focus:outline-none focus:ring-1 focus:ring-[#00f0ff20] transition-all"
                                    />
                                </div>

                                {/* Email ── */}
                                <div>
                                    <label className="block font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                                        EMAIL_AUTH
                                    </label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="tu@email.com"
                                        className="w-full bg-transparent border border-[#1e293b] text-white px-4 py-3 font-mono text-sm placeholder-[#334155]
                                                   focus:border-[#00f0ff] focus:outline-none focus:ring-1 focus:ring-[#00f0ff20] transition-all"
                                    />
                                </div>

                                {/* Mensaje ── */}
                                <div>
                                    <label className="block font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                                        MESSAGE_PAYLOAD
                                    </label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={5}
                                        value={form.message}
                                        onChange={handleChange}
                                        placeholder="Describe tu consulta..."
                                        className="w-full bg-transparent border border-[#1e293b] text-white px-4 py-3 font-mono text-sm placeholder-[#334155]
                                                   focus:border-[#00f0ff] focus:outline-none focus:ring-1 focus:ring-[#00f0ff20] transition-all resize-none"
                                    />
                                </div>

                                {/* Botón ── */}
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full py-3.5 bg-[#00f0ff] text-black font-black font-mono text-xs uppercase tracking-widest
                                               hover:bg-[#00d4e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                                               flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                            TRANSMITTING…
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-base">send</span>
                                            SEND_PACKET
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
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
                <div className="w-full h-80 border border-[#1a1a2e] bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 text-slate-600">
                    <span className="material-symbols-outlined text-4xl">location_on</span>
                    <p className="font-mono text-[10px] uppercase tracking-widest">GOOGLE_MAPS // PENDIENTE</p>
                </div>
            </section>

        </div>
    )
}
