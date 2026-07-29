import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { MercadoPagoBrick } from '../components/payment/MercadoPagoBrick'
import { ShippingOptions } from '../components/checkout/ShippingOptions'
import { PROVINCIAS } from '../constants/provincias'
import { supabase } from '../services/supabaseClient'

/* ── Datos mock del resumen de orden (Tarea 4 lo reemplazará) ── */
const ORDER_ITEMS = [
    {
        id: 1,
        name: 'Spectre Shell Jacket',
        qty: 1,
        price: 450,
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBI3nMLg4qgdT8_gAj_wI7hfoDMzjQINOXASjujQ94t-BLaSPaysrh1T-54nepMTneVtw-9Ao473WSTGuZctzZLeZA-27eNiG8uAdyrcElHTW5MiNLoUkowJiOpjvEkQupmlTDa_2qOjnWCdUs1tEd8g4aE1UUqUaOJaUnRtlqDjbMO3DcLOO8stAaC_Jhtpxt8mId7UZ1ZJYatOL4-hTpt4VMv7l7yjnhFtBCyhlIjGqciEFv5ZcajnhsxQDzd0CGHY1tBDRvOG1',
    },
    {
        id: 2,
        name: 'Urban Street Sneakers',
        qty: 1,
        price: 299,
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeymrPqleX-ea-M9umROMAR1fPpaEhxo6rHC42f7LySEjY5C1kD1putf733ugxi07Ohghvdh7uihAHWLQpf1adI9y-_Z5tR2QGfEpzaR3pWN7WUBYWoCdyIGfeJwLtI6Gcqo_baFTB-7abERT6gs19EU88lFbraof5Tc5j7AWk5M-3htlNNaPFztok6nMzz61H11yZ65m_J56PP92V-U6RqKAyjBxyBp1PKgcYAOcypuUcSdgFjWFgd7ZP_2rpORLZnIpgAzwdGik0',
    },
]

/* ── Encabezado de sección (Por Menor / Por Mayor) del Order_Manifest ── */
function ManifestSectionHeader({ label, count, accent }) {
    return (
        <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
            <span className={`text-[10px] font-bold font-mono uppercase tracking-widest ${accent.text}`}>
                {label}
            </span>
            <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono border ${accent.badge}`}>
                {count}
            </span>
            <div className={`flex-1 h-px ${accent.line}`} />
        </div>
    )
}

/* ── Campo de formulario reutilizable (controlado) ── */
function FormField({ label, type = 'text', placeholder = '', colSpan = 1, required = false, value, onChange }) {
    return (
        <div className={colSpan === 2 ? 'col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wide">
                {label}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                required={required}
                value={value}
                onChange={onChange}
                className="w-full bg-[#12161c] border border-[#333b49] text-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-[#5a6478] font-mono outline-none"
            />
        </div>
    )
}

export default function Checkout() {
    const [paymentMethod, setPaymentMethod] = useState('cc')
    const [shippingMethod, setShippingMethod] = useState('shipping')
    const { items, subtotal, shipping } = useCart()
    const { user } = useAuth()

    /* ── Estado del formulario ── */
    const [email, setEmail]         = useState('')
    const [phone, setPhone]         = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName]   = useState('')
    const [street, setStreet]       = useState('')
    const [number, setNumber]       = useState('')
    const [city, setCity]           = useState('')
    const [province, setProvince]   = useState('Buenos Aires')
    const [postalCode, setPostalCode] = useState('')
    const [selectedShippingOption, setSelectedShippingOption] = useState(null)

    /* ── Estado de cotización de envío ── */
    const [shippingOptions, setShippingOptions] = useState([])
    const [shippingLoading, setShippingLoading] = useState(false)
    const [shippingError, setShippingError] = useState(null)
    const [selectedShipping, setSelectedShipping] = useState(null)
    const [selectedBranch, setSelectedBranch] = useState(null)

    /* Pre-llenar email si el usuario está logueado */
    useEffect(() => {
        if (user?.email) setEmail(user.email)
    }, [user])

    // ✅ Cotización SOLO manual (cuando clickea el botón, no automática)

    /* Usa los ítems reales del carrito; si está vacío cae al mock de demo */
    const displayItems = items.length > 0 ? items : ORDER_ITEMS
    const retailItems = displayItems.filter(i => (i.type ?? 'retail') === 'retail')
    const wholesaleItems = displayItems.filter(i => i.type === 'wholesale')
    const displaySubtotal = subtotal || ORDER_ITEMS.reduce((s, i) => s + i.price * i.qty, 0)
    // Use actual shipping quote price from envia.com, or fallback to flat rate
    const displayShipping = shippingMethod === 'pickup'
      ? 0
      : (selectedShippingOption?.price ?? (shipping || 0))
    const displayTax = +(displaySubtotal * 0.037).toFixed(2) // ~3.7% estimado
    const displayTotal = displaySubtotal + displayShipping + displayTax

    // Build current direccion object for ShippingOptions component
    const currentDireccion = {
      street, number, city, province, postalCode,
    }

    // Validar que sea posible proceder al pago
    const addressComplete = shippingMethod === 'pickup' || (street && number && city && province && postalCode && selectedShippingOption)

    return (
        <div className="bg-[#12161c] min-h-screen text-slate-200 font-body antialiased">

            {/* ── Grid bg decorativa ── */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px)
          `,
                    backgroundSize: '20px 20px',
                }}
                aria-hidden="true"
            />

            <main className="relative z-10 flex-1 px-6 py-10 lg:px-20 lg:py-12 max-w-[1200px] mx-auto w-full">

                {/* ── Encabezado de página ── */}
                <div className="mb-10 border-b border-[#333b49] pb-6 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-3 uppercase tracking-widest">
                            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                            <span className="text-primary">›</span>
                            <Link to="/" onClick={() => window.history.back()} className="hover:text-primary transition-colors">Cart</Link>
                            <span className="text-primary">›</span>
                            <span className="text-white">Checkout</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase font-display">
                            <span className="text-primary">01.</span> Checkout
                        </h1>
                        <p className="text-slate-500 flex items-center gap-2 text-xs uppercase tracking-widest font-mono mt-2">
                            <span className="material-symbols-outlined text-primary text-sm">lock_person</span>
                            Encrypted Connection // Protocol V.4
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>STATUS:</span>
                        <span className="text-green-500 animate-pulse">ONLINE</span>
                    </div>
                </div>

                {/* ── Grid principal 12 cols ── */}
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">

                        {/* ══════ Columna formulario (7 cols) ══════ */}
                        <div className="lg:col-span-7 space-y-8">

                            {/* ── Sección 1: Contact_Data ── */}
                            <section className="bg-[#1a1f27] border border-[#333b49] p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#4a5568]" />
                                <div className="flex items-center justify-between mb-6 border-b border-[#333b49] pb-4">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm">contact_mail</span>
                                        Contact_Data
                                    </h3>
                                    <Link
                                        to="/cuenta"
                                        className="text-xs font-medium text-primary hover:text-white font-mono uppercase transition-colors"
                                    >
                                        &lt; Log_In /&gt;
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <FormField label="Email Address" type="email" placeholder="USER@DOMAIN.COM" required value={email} onChange={e => setEmail(e.target.value)} />
                                    <FormField label="Phone Number" type="tel" placeholder="+54 9 11 0000-0000" required value={phone} onChange={e => setPhone(e.target.value)} />
                                    <div className="flex items-center gap-3 group cursor-pointer col-span-1 sm:col-span-2">
                                        <input
                                            type="checkbox"
                                            id="newsletter"
                                            className="h-4 w-4 appearance-none border border-[#4a5568] bg-[#12161c] checked:border-primary checked:bg-primary transition-all cursor-pointer"
                                        />
                                        <label
                                            htmlFor="newsletter"
                                            className="text-xs text-slate-400 font-mono uppercase group-hover:text-primary transition-colors cursor-pointer tracking-wide"
                                        >
                                            Subscribe to tactical updates
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* ── Sección 2: Fulfillment_Method ── */}
                            <section className="bg-[#1a1f27] border border-[#333b49] p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#4a5568]" />
                                <h3 className="text-sm font-bold text-white mb-6 border-b border-[#333b49] pb-4 uppercase tracking-wider font-mono flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm">local_shipping</span>
                                    Fulfillment_Method
                                </h3>

                                {/* ── Selector de Método ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                    <button
                                        type="button"
                                        onClick={() => { setShippingMethod('shipping'); setSelectedShipping(null) }}
                                        className={`p-4 border transition-all text-left flex flex-col gap-2 relative overflow-hidden group ${
                                            shippingMethod === 'shipping'
                                            ? 'border-primary bg-primary/10'
                                            : 'border-[#333b49] bg-[#12161c] hover:border-[#4a5568]'
                                        }`}
                                    >
                                        {shippingMethod === 'shipping' && (
                                            <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-primary text-black">
                                                <span className="material-symbols-outlined text-sm font-bold">check</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-2xl transition-colors ${shippingMethod === 'shipping' ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`}>local_shipping</span>
                                            <span className="font-bold text-white uppercase font-mono text-sm tracking-wide">Delivery</span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono leading-relaxed">
                                            Envío a domicilio. Costo cotizado en base a destino.
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setShippingMethod('pickup'); setShippingOptions([]) }}
                                        className={`p-4 border transition-all text-left flex flex-col gap-2 relative overflow-hidden group ${
                                            shippingMethod === 'pickup'
                                            ? 'border-primary bg-primary/10'
                                            : 'border-[#333b49] bg-[#12161c] hover:border-[#4a5568]'
                                        }`}
                                    >
                                        {shippingMethod === 'pickup' && (
                                            <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-primary text-black">
                                                <span className="material-symbols-outlined text-sm font-bold">check</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-2xl transition-colors ${shippingMethod === 'pickup' ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`}>storefront</span>
                                            <span className="font-bold text-white uppercase font-mono text-sm tracking-wide">Store Pickup</span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono leading-relaxed">
                                            Retira en local. Nos pondremos en contacto.
                                        </span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-4">
                                    <FormField label="First Name" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                                    <FormField label="Last Name" type="text" required value={lastName} onChange={e => setLastName(e.target.value)} />

                                    {shippingMethod === 'shipping' ? (
                                        <>
                                            <FormField label="Street" type="text" required value={street} onChange={e => setStreet(e.target.value)} />
                                            <FormField label="Number" type="text" required value={number} onChange={e => setNumber(e.target.value)} />
                                            <FormField label="City" type="text" required value={city} onChange={e => setCity(e.target.value)} />
                                            <div className="col-span-1 sm:col-span-2">
                                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wide">
                                                    Province
                                                </label>
                                                <select
                                                    value={province}
                                                    onChange={e => setProvince(e.target.value)}
                                                    className="w-full bg-[#12161c] border border-[#333b49] text-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-[#5a6478] font-mono outline-none"
                                                >
                                                    {PROVINCIAS.map(prov => (
                                                        <option key={prov.codigo} value={prov.nombre}>
                                                            {prov.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <FormField label="Postal Code" type="text" required value={postalCode} onChange={e => setPostalCode(e.target.value)} />

                                            {/* Botón Cotizar Manual */}
                                            <div className="col-span-1 sm:col-span-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        console.clear()
                                                        console.log('%c═══ COTIZACIÓN INICIADA ═══', 'color: cyan; font-weight: bold; font-size: 14px')
                                                        setShippingLoading(true)
                                                        setShippingError(null)

                                                        const cotizarManual = async () => {
                                                            try {
                                                                const origen = {
                                                                    nombre: 'NEXO Performance',
                                                                    telefono: '1159691814',
                                                                    email: 'codebygabrielpatty@gmail.com',
                                                                    calle: 'Gral. Pintos',
                                                                    numero: '2383',
                                                                    ciudad: 'Buenos Aires',
                                                                    provincia: 'Buenos Aires',
                                                                    cp: 'B1768DTB',
                                                                }
                                                                const carriers = ['correo_argentino', 'oca', 'andreani']

                                                                console.log('%cORIGEN:', 'color: yellow; font-weight: bold', origen)
                                                                console.log('%cCARRIERS:', 'color: yellow; font-weight: bold', carriers)
                                                                console.log('%cDESTINO:', 'color: yellow; font-weight: bold', { city, province, postalCode })
                                                                console.log('%cITEMS:', 'color: yellow; font-weight: bold', items)

                                                                console.log('%c→ Enviando a Edge Function...', 'color: blue')
                                                                const { data, error } = await supabase.functions.invoke('envia-cotizar', {
                                                                    body: {
                                                                        items: items.map(i => ({ productId: i.productId, qty: i.qty })),
                                                                        destino: { city, province, postalCode },
                                                                        origen,
                                                                        carriers,
                                                                    },
                                                                })

                                                                if (error) {
                                                                    console.error('%c❌ ERROR DE SUPABASE:', 'color: red; font-weight: bold', error)
                                                                    throw error
                                                                }

                                                                console.log('%c← RESPONSE RECIBIDA:', 'color: green; font-weight: bold')
                                                                console.log('%cData:', 'color: green', data)
                                                                console.log('%cError field:', 'color: green', data?.error)

                                                                if (data?.error) {
                                                                    console.error('%c⚠️ ERROR EN RESPONSE:', 'color: orange; font-weight: bold', data.error)
                                                                    setShippingError(data.error)
                                                                    setShippingOptions([])
                                                                } else if (data?.opciones?.length > 0) {
                                                                    console.log('%c✅ ÉXITO - Opciones encontradas:', 'color: green; font-weight: bold', data.opciones.length)
                                                                    console.table(data.opciones)
                                                                    setShippingOptions(data.opciones)
                                                                } else {
                                                                    console.warn('%c⚠️ SIN OPCIONES', 'color: orange; font-weight: bold')
                                                                    setShippingOptions([])
                                                                }
                                                            } catch (err) {
                                                                console.error('%c🔥 EXCEPTION CAPTURADA:', 'color: red; font-weight: bold; font-size: 14px')
                                                                console.error('%cNombre:', 'color: red', err?.name)
                                                                console.error('%cMensaje:', 'color: red', err?.message)
                                                                console.error('%cStack:', 'color: red', err?.stack)
                                                                console.error('%cObjeto completo:', 'color: red', err)
                                                                setShippingError(err?.message || 'Error desconocido')
                                                                setShippingOptions([])
                                                            } finally {
                                                                setShippingLoading(false)
                                                                console.log('%c═══════════════════════════', 'color: cyan; font-weight: bold; font-size: 14px')
                                                            }
                                                        }
                                                        cotizarManual()
                                                    }}
                                                    disabled={shippingLoading || !street || !number || !city || !province || !postalCode}
                                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold uppercase text-sm transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {shippingLoading ? 'progress_activity' : 'local_shipping'}
                                                    </span>
                                                    {shippingLoading ? 'Cotizando...' : 'Cotizar Envío'}
                                                </button>
                                            </div>

                                            {/* Shipping options component */}
                                            {shippingOptions.length > 0 || shippingError ? (
                                                <div className="col-span-1 sm:col-span-2">
                                                    {shippingError && (
                                                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-sm font-mono mb-3">
                                                            {shippingError}
                                                        </div>
                                                    )}
                                                    {shippingOptions.length > 0 && (
                                                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded text-sm font-mono">
                                                            ✓ {shippingOptions.length} opciones disponibles
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}

                                            <ShippingOptions
                                                items={displayItems}
                                                direccion={currentDireccion}
                                                onSelect={setSelectedShippingOption}
                                                selectedOption={selectedShippingOption}
                                            />
                                        </>
                                    ) : (
                                        <div className="col-span-1 sm:col-span-2 bg-[#232a35]/50 border border-[#333b49] p-4 mt-2 mb-2 relative">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <p className="text-sm text-slate-300 font-mono mb-2">
                                                <span className="text-primary font-bold">Dirección de Retiro:</span> Microcentro, Buenos Aires
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono leading-relaxed">
                                                <span className="material-symbols-outlined text-[14px] mr-1 align-text-bottom text-primary/70">check_circle</span>
                                                Una vez confirmada la compra recibiŕas un email para coordinar el horario de retiro en nuestro showroom.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── Sección 3: Payment_Method ── */}
                            <section className="bg-[#1a1f27] border border-[#333b49] p-6 relative overflow-hidden">
                                {/* Neon left border */}
                                <div
                                    className="absolute top-0 left-0 w-1 h-full bg-primary"
                                    style={{ boxShadow: '0 0 10px #00f0ff' }}
                                />
                                <h3 className="text-sm font-bold text-white mb-6 border-b border-[#333b49] pb-4 uppercase tracking-wider font-mono flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm">credit_card</span>
                                    Payment_Method
                                </h3>

                                <div className="border border-[#333b49] bg-[#12161c]/50 overflow-hidden">
                                    {/* ─ Credit Card ─ */}
                                    <div className="border-b border-[#333b49] p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <RadioBtn id="cc" name="payment" checked={paymentMethod === 'cc'} onChange={() => setPaymentMethod('cc')} ariaLabel="Credit Card" />
                                                <label htmlFor="cc" className="font-bold text-white uppercase font-mono text-sm cursor-pointer">
                                                    Credit Card
                                                </label>
                                            </div>
                                            <div className="flex gap-2 text-slate-500">
                                                <span className="material-symbols-outlined">credit_card</span>
                                                <span className="material-symbols-outlined">lock</span>
                                            </div>
                                        </div>

                                        {paymentMethod === 'cc' && (
                                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 bg-[#232a35]/50 p-4 border border-[#333b49]">
                                                <div className="col-span-2">
                                                    <input
                                                        type="text"
                                                        placeholder="0000 0000 0000 0000"
                                                        className="w-full bg-[#12161c] border border-[#333b49] text-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono placeholder-[#5a6478] outline-none"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="MM / YY"
                                                    className="w-full bg-[#12161c] border border-[#333b49] text-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono placeholder-[#5a6478] outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="CVC"
                                                    className="w-full bg-[#12161c] border border-[#333b49] text-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono placeholder-[#5a6478] outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* ─ Mercado Pago ─ */}
                                    <div className={`p-4 transition-colors ${paymentMethod === 'mp' ? 'bg-[#232a35]' : 'bg-[#232a35]/20 hover:bg-[#232a35]/40'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <RadioBtn id="mp" name="payment" checked={paymentMethod === 'mp'} onChange={() => setPaymentMethod('mp')} ariaLabel="Mercado Pago" />
                                                <label htmlFor="mp" className="font-bold text-slate-300 uppercase font-mono text-sm cursor-pointer">
                                                    Mercado Pago
                                                </label>
                                            </div>
                                            <span className="text-primary font-bold text-sm font-mono opacity-80">MP</span>
                                        </div>
                                        {paymentMethod === 'mp' && (
                                            <p className="mt-3 text-xs text-slate-500 font-mono uppercase tracking-wide pl-7">
                                                <span className="material-symbols-outlined text-primary text-xs mr-1">info</span>
                                                Serás redirigido a Mercado Pago para completar el pago de forma segura.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* ── Botón Pagar ── */}
                            {paymentMethod === 'mp' ? (
                                <MercadoPagoBrick
                                    items={displayItems}
                                    payer={{ email, phone, firstName, lastName }}
                                    shippingMethod={shippingMethod}
                                    shippingAddress={shippingMethod === 'shipping' ? { street, number, city, province, postalCode, email } : null}
                                    shippingQuote={shippingMethod === 'shipping' ? selectedShippingOption : null}
                                    isShippingComplete={shippingMethod === 'shipping' && selectedShippingOption}
                                />
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!addressComplete}
                                    className="group w-full relative overflow-hidden bg-primary py-4 text-center transition-all hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <span className="relative text-black text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
                                        Initiate Payment ${displayTotal.toFixed(2)}
                                        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                                            arrow_forward
                                        </span>
                                    </span>
                                </button>
                            )}

                            {/* ── Garantía ── */}
                            <div className="flex items-center justify-center gap-3 text-xs text-primary font-mono border border-primary/20 bg-primary/5 py-3">
                                <span className="material-symbols-outlined text-lg">verified_user</span>
                                <span className="uppercase tracking-wide">30-Day Performance Guarantee</span>
                            </div>
                        </div>

                        {/* ══════ Columna Order Manifest (5 cols sticky) ══════ */}
                        <div className="hidden lg:block lg:col-span-5">
                            <div className="sticky top-24 p-6 bg-[#1a1f27] border border-[#333b49] shadow-2xl">

                                {/* Header */}
                                <div className="flex justify-between items-center mb-6 border-b border-[#333b49] pb-4">
                                    <h3 className="text-lg font-bold text-white uppercase font-mono">Order_Manifest</h3>
                                    <span className="text-xs text-slate-500 font-mono">[{displayItems.length} ITEMS]</span>
                                </div>

                                {/* Resumen numérico */}
                                <div className="space-y-3 font-mono text-sm mb-8">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 uppercase">Subtotal</span>
                                        <span className="font-medium text-white">${displaySubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 uppercase">Shipping</span>
                                        <span className="font-bold text-primary uppercase">
                                            {displayShipping === 0 ? 'Free' : `$${displayShipping.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 uppercase">Tax [Est.]</span>
                                        <span className="font-medium text-white">${displayTax.toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-[#333b49] my-2" />
                                    <div className="flex justify-between text-base font-bold items-center">
                                        <span className="text-white uppercase tracking-wider">Total Amount</span>
                                        <span
                                            className="text-primary text-2xl"
                                            style={{ textShadow: '0 0 8px rgba(0,240,255,0.5)' }}
                                        >
                                            ${displayTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Items de la orden — agrupados por menor / mayor */}
                                <div>
                                    {retailItems.length > 0 && (
                                        <>
                                            <ManifestSectionHeader
                                                label="Por Menor"
                                                count={retailItems.length}
                                                accent={{ text: 'text-primary', badge: 'border-primary/40 text-primary bg-primary/10', line: 'bg-primary/20' }}
                                            />
                                            <div className="space-y-3">
                                                {retailItems.map(({ id, name, qty, price, img }) => (
                                                    <div key={id} className="flex gap-4 p-3 bg-[#12161c]/50 border border-[#333b49]/50">
                                                        <div className="h-16 w-12 bg-[#232a35] border border-[#4a5568] overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={img}
                                                                alt={name}
                                                                className="h-full w-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col justify-center gap-1 flex-1">
                                                            <span className="text-xs font-bold text-white uppercase font-mono leading-tight">
                                                                {name}
                                                            </span>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] text-slate-500 font-mono">QTY: {qty}</span>
                                                                <span className="text-xs text-primary font-mono font-bold">${price}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {wholesaleItems.length > 0 && (
                                        <>
                                            <ManifestSectionHeader
                                                label="Por Mayor"
                                                count={wholesaleItems.length}
                                                accent={{ text: 'text-amber-400', badge: 'border-amber-400/40 text-amber-400 bg-amber-400/10', line: 'bg-amber-400/20' }}
                                            />
                                            <div className="space-y-3">
                                                {wholesaleItems.map(({ id, name, qty, price, img }) => (
                                                    <div key={id} className="flex gap-4 p-3 bg-[#12161c]/50 border border-amber-400/20">
                                                        <div className="h-16 w-12 bg-[#232a35] border border-[#4a5568] overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={img}
                                                                alt={name}
                                                                className="h-full w-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col justify-center gap-1 flex-1">
                                                            <span className="text-xs font-bold text-white uppercase font-mono leading-tight">
                                                                {name}
                                                            </span>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] text-slate-500 font-mono">QTY: {qty}</span>
                                                                <span className="text-xs text-amber-400 font-mono font-bold">${price}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Promo code */}
                                <div className="mt-6">
                                    <div className="flex">
                                        <input
                                            type="text"
                                            placeholder="PROMO_CODE"
                                            className="flex-1 bg-[#12161c] border border-[#333b49] text-white px-4 py-2.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono placeholder-[#5a6478] outline-none"
                                        />
                                        <button
                                            type="button"
                                            className="px-4 py-2.5 bg-[#232a35] border border-l-0 border-[#333b49] hover:border-primary hover:text-primary text-slate-400 text-xs font-mono uppercase tracking-wide transition-all"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                {/* Seguridad */}
                                <div className="mt-6 flex items-center justify-center gap-4 opacity-30">
                                    <span className="material-symbols-outlined text-2xl text-white">lock</span>
                                    <span className="material-symbols-outlined text-2xl text-white">verified_user</span>
                                    <span className="material-symbols-outlined text-2xl text-white">shield</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>
            </main>
        </div>
    )
}

/* ── Radio button custom ── */
function RadioBtn({ id, name, checked, onChange, ariaLabel }) {
    return (
        <div className="relative flex items-center">
            <input
                type="radio"
                id={id}
                name={name}
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                className="peer h-4 w-4 appearance-none rounded-full border border-[#4a5568] bg-[#12161c] checked:border-primary checked:bg-[#12161c] transition-all cursor-pointer"
            />
            <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
        </div>
    )
}
