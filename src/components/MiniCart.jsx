import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const FREE_SHIPPING_THRESHOLD = 200

/* ── Encabezado de sección (Por Menor / Por Mayor) ── */
function CartSectionHeader({ icon, label, count, accent }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <span className={`material-symbols-outlined text-sm ${accent.text}`}>{icon}</span>
            <h4 className={`text-xs font-display font-bold uppercase tracking-widest ${accent.text}`}>
                {label}
            </h4>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold font-mono border ${accent.badge}`}>
                {count}
            </span>
            <div className={`flex-1 h-px ${accent.line}`} />
        </div>
    )
}

/* ── Fila de ítem del carrito ── */
function CartLineItem({ id, name, spec, price, qty, img, changeQty, removeItem }) {
    return (
        <div className="flex gap-4 group relative">
            {/* Indicador izquierdo de hover */}
            <div className="absolute -left-2 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Imagen */}
            <div className="h-28 w-24 flex-shrink-0 overflow-hidden border border-[#4a5568] bg-[#12161c] relative">
                <div className="absolute inset-0 bg-primary/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img
                    src={img}
                    alt={name}
                    className="h-full w-full object-cover object-center grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                />
            </div>

            {/* Info + controles */}
            <div className="flex flex-1 flex-col justify-between py-1">
                <div>
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-white leading-tight uppercase font-display tracking-tight">
                            {name}
                        </h3>
                        <p className="text-sm font-bold text-primary font-mono ml-2 flex-shrink-0">
                            ${price}
                        </p>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        {spec}
                    </p>
                </div>

                <div className="flex items-center justify-between mt-2">
                    {/* Qty ± */}
                    <div className="flex items-center border border-[#4a5568] bg-[#12161c]">
                        <button
                            onClick={() => changeQty(id, -1)}
                            aria-label="Reducir cantidad"
                            className="px-2 py-1 text-slate-400 hover:text-white hover:bg-[#232a35] transition-colors text-sm font-mono"
                        >
                            −
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-white font-mono">{qty}</span>
                        <button
                            onClick={() => changeQty(id, +1)}
                            aria-label="Aumentar cantidad"
                            className="px-2 py-1 text-slate-400 hover:text-white hover:bg-[#232a35] transition-colors text-sm font-mono"
                        >
                            +
                        </button>
                    </div>

                    {/* Remove */}
                    <button
                        onClick={() => removeItem(id)}
                        className="text-[10px] font-bold text-slate-500 uppercase hover:text-red-500 transition-colors tracking-wider border-b border-transparent hover:border-red-500 font-mono"
                    >
                        Remove_Item
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function MiniCart() {
    const { items, isOpen, closeCart, changeQty, removeItem, totalCount, subtotal, shipping } = useCart()
    const navigate = useNavigate()
    const dialogRef = useRef(null)

    const retailItems = items.filter(i => i.type === 'retail')
    const wholesaleItems = items.filter(i => i.type === 'wholesale')

    /* Bloquear scroll del body cuando el drawer está abierto */
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    /* Sync isOpen → showModal() / close()
       Native <dialog> handles Escape key and focus trapping automatically. */
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (isOpen) {
            if (!dialog.open) dialog.showModal()
        } else {
            if (dialog.open) dialog.close()
        }
    }, [isOpen])

    /* Sync native dialog close event (e.g. Escape key) back to CartContext */
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        dialog.addEventListener('close', closeCart)
        return () => dialog.removeEventListener('close', closeCart)
    }, [closeCart])

    function handleCheckout() {
        closeCart()
        navigate('/checkout')
    }

    /* Progreso envío gratis */
    const progressPct = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)
    const freeShipping = shipping === 0

    return (
        <>
            {/* ── Drawer sidebar — native <dialog> for built-in focus trap,
                Escape handling, and ::backdrop (replaces custom overlay div). ── */}
            <dialog
                ref={dialogRef}
                aria-label="Equipment Bag"
                className="cart-drawer bg-[#1a1f27] border-l border-[#333b49]/50 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                onClick={(e) => { if (e.target === dialogRef.current) closeCart() }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-[#333b49] px-6 py-5 bg-[#1a1f27]/95 backdrop-blur flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">shopping_cart</span>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest font-display">
                            Equipment Bag
                        </h2>
                        <span className="flex h-5 w-5 items-center justify-center bg-primary text-xs font-bold text-black font-mono">
                            {totalCount}
                        </span>
                    </div>
                    <button
                        onClick={closeCart}
                        aria-label="Cerrar carrito"
                        className="flex h-8 w-8 items-center justify-center border border-[#4a5568] bg-[#12161c] hover:border-primary hover:text-primary text-slate-400 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* ── Barra de envío gratis ── */}
                <div className="px-6 py-4 bg-[#232a35] border-b border-[#333b49] flex-shrink-0">
                    <div className="flex items-center justify-between text-xs font-mono uppercase mb-2">
                        {freeShipping ? (
                            <span className="font-bold text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                Logistics cost: WAIVED
                            </span>
                        ) : (
                            <span className="font-bold text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(0)} away from free shipping
                            </span>
                        )}
                        <span className="text-slate-500">Threshold: ${FREE_SHIPPING_THRESHOLD}</span>
                    </div>
                    <div className="h-1 w-full bg-[#333b49] relative overflow-hidden">
                        <div
                            className="absolute h-full bg-primary transition-all duration-700"
                            style={{ width: `${progressPct}%`, boxShadow: '0 0 10px #00f0ff' }}
                        />
                    </div>
                </div>

                {/* ── Lista de ítems ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-[#1a1f27]">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-600">shopping_bag</span>
                            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                                Equipment Bag Empty
                            </p>
                        </div>
                    ) : (
                        <>
                            {retailItems.length > 0 && (
                                <div>
                                    <CartSectionHeader
                                        icon="local_mall"
                                        label="Por Menor"
                                        count={retailItems.length}
                                        accent={{ text: 'text-primary', badge: 'border-primary/40 text-primary bg-primary/10', line: 'bg-primary/20' }}
                                    />
                                    <div className="space-y-6">
                                        {retailItems.map(item => (
                                            <CartLineItem key={item.id} {...item} changeQty={changeQty} removeItem={removeItem} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wholesaleItems.length > 0 && (
                                <div>
                                    <CartSectionHeader
                                        icon="inventory_2"
                                        label="Por Mayor"
                                        count={wholesaleItems.length}
                                        accent={{ text: 'text-amber-400', badge: 'border-amber-400/40 text-amber-400 bg-amber-400/10', line: 'bg-amber-400/20' }}
                                    />
                                    <div className="space-y-6">
                                        {wholesaleItems.map(item => (
                                            <CartLineItem key={item.id} {...item} changeQty={changeQty} removeItem={removeItem} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer con totales y CTA ── */}
                <div className="border-t border-[#333b49] bg-[#232a35] p-6 flex-shrink-0 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
                    {/* Totales */}
                    <div className="mb-5 space-y-2 font-mono text-sm">
                        <div className="flex justify-between text-slate-400">
                            <span className="uppercase">Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span className="uppercase">Shipping</span>
                            <span className={freeShipping ? 'text-primary uppercase' : ''}>
                                {freeShipping ? 'Free' : `$${shipping.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-white mt-2 pt-2 border-t border-[#333b49]">
                            <span className="uppercase tracking-wider">Total</span>
                            <span style={{ textShadow: '0 0 8px rgba(0,240,255,0.5)' }}>
                                ${(subtotal + shipping).toFixed(2)}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">
                            Taxes calculated at next step.
                        </p>
                    </div>

                    {/* CTA — Proceed to Checkout */}
                    <button
                        onClick={handleCheckout}
                        id="minicart-checkout-btn"
                        disabled={items.length === 0}
                        className="w-full group relative flex items-center justify-center gap-2 bg-white hover:bg-primary py-4 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="text-black text-sm font-black uppercase tracking-widest group-hover:pr-4 transition-all">
                            Proceed to Checkout
                        </span>
                        <span className="material-symbols-outlined text-black text-sm absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            arrow_forward
                        </span>
                    </button>

                    {/* Trust icons */}
                    <div className="mt-4 flex justify-center gap-2 opacity-30">
                        <span className="material-symbols-outlined text-2xl text-white">lock</span>
                        <span className="material-symbols-outlined text-2xl text-white">verified_user</span>
                        <span className="material-symbols-outlined text-2xl text-white">shield</span>
                    </div>
                </div>
            </dialog>
        </>
    )
}
