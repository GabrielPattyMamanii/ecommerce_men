import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatDimensions } from '../lib/cartDimensions'
import { formatCurrency } from '../lib/productPricing'

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
function CartLineItem({ id, name, spec, price, qty, img, type, dimensions, changeQty, removeItem }) {
    const dimensionLabel = formatDimensions(dimensions, type)

    return (
        <div className="flex gap-4 group relative">
            {/* Indicador izquierdo de hover */}
            <div className="absolute -left-2 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Imagen */}
            <div className="h-28 w-24 flex-shrink-0 overflow-hidden border border-[#e2e2e4] bg-[#f3f3f5] relative">
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
                        <h3 className="text-sm font-bold text-primary leading-tight uppercase font-display tracking-tight">
                            {name}
                        </h3>
                        <p className="text-sm font-bold text-primary font-mono ml-2 flex-shrink-0">
                            {formatCurrency(price)}
                        </p>
                    </div>
                    <p className="mt-1 text-[10px] text-muted uppercase tracking-wider font-mono">
                        {spec}
                    </p>
                    {dimensionLabel !== '—' && (
                        <p className="mt-1 text-[9px] text-outline uppercase tracking-wider font-mono">
                            <span className="material-symbols-outlined" style={{ fontSize: '10px', verticalAlign: 'middle', marginRight: '2px' }}>straighten</span>
                            {dimensionLabel}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between mt-2">
                    {/* Qty ± */}
                    <div className="flex items-center border border-[#e2e2e4] bg-[#f3f3f5]">
                        <button
                            onClick={() => changeQty(id, -1)}
                            aria-label="Reducir cantidad"
                            className="px-2 py-1 text-muted hover:text-primary hover:bg-[#e2e2e4] transition-colors text-sm font-mono"
                        >
                            −
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-primary font-mono">{qty}</span>
                        <button
                            onClick={() => changeQty(id, +1)}
                            aria-label="Aumentar cantidad"
                            className="px-2 py-1 text-muted hover:text-primary hover:bg-[#e2e2e4] transition-colors text-sm font-mono"
                        >
                            +
                        </button>
                    </div>

                    {/* Remove */}
                    <button
                        onClick={() => removeItem(id)}
                        className="text-[10px] font-bold text-muted uppercase hover:text-red-500 transition-colors tracking-wider border-b border-transparent hover:border-red-500 font-mono"
                    >
                        Eliminar
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

    // Envío se calcula dinámicamente en checkout

    return (
        <>
            {/* ── Drawer sidebar — native <dialog> for built-in focus trap,
                Escape handling, and ::backdrop (replaces custom overlay div). ── */}
            <dialog
                ref={dialogRef}
                aria-label="Carrito"
                className="cart-drawer bg-white border-l border-[#e2e2e4] shadow-[0_0_50px_rgba(0,0,0,0.15)]"
                onClick={(e) => { if (e.target === dialogRef.current) closeCart() }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-[#e2e2e4] px-6 py-5 bg-white/95 backdrop-blur flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">shopping_cart</span>
                        <h2 className="text-lg font-bold text-primary uppercase tracking-widest font-display">
                            Carrito
                        </h2>
                        <span className="flex h-5 w-5 items-center justify-center bg-primary text-xs font-bold text-white font-mono">
                            {totalCount}
                        </span>
                    </div>
                    <button
                        onClick={closeCart}
                        aria-label="Cerrar carrito"
                        className="flex h-8 w-8 items-center justify-center border border-[#e2e2e4] bg-[#f3f3f5] hover:border-primary hover:text-primary text-muted transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* ── Nota de envío ── */}
                <div className="px-6 py-4 bg-[#f3f3f5] border-b border-[#e2e2e4] flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted">
                        <span className="material-symbols-outlined text-sm">local_shipping</span>
                        Envío se calcula en checkout según tu dirección
                    </div>
                </div>

                {/* ── Lista de ítems ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-white">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                            <span className="material-symbols-outlined text-5xl text-outline">shopping_bag</span>
                            <p className="text-muted font-mono text-xs uppercase tracking-widest">
                                Tu carrito está vacío
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
                                            <CartLineItem
                                                key={item.id}
                                                {...item}
                                                type="retail"
                                                changeQty={changeQty}
                                                removeItem={removeItem}
                                            />
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
                                        accent={{ text: 'text-amber-600', badge: 'border-amber-600/40 text-amber-600 bg-amber-600/10', line: 'bg-amber-600/20' }}
                                    />
                                    <div className="space-y-6">
                                        {wholesaleItems.map(item => (
                                            <CartLineItem
                                                key={item.id}
                                                {...item}
                                                type="wholesale"
                                                changeQty={changeQty}
                                                removeItem={removeItem}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer con totales y CTA ── */}
                <div className="border-t border-[#e2e2e4] bg-[#f3f3f5] p-6 flex-shrink-0 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.08)]">
                    {/* Totales */}
                    <div className="mb-5 space-y-2 font-mono text-sm">
                        <div className="flex justify-between text-muted">
                            <span className="uppercase">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted">
                            <span className="uppercase">Shipping</span>
                            <span className="text-muted text-xs">Cálc. en checkout</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-primary mt-2 pt-2 border-t border-[#e2e2e4]">
                            <span className="uppercase tracking-wider">Subtotal</span>
                            <span>
                                {formatCurrency(subtotal)}
                            </span>
                        </div>
                        <p className="text-[10px] text-outline uppercase tracking-wide">
                            Taxes calculated at next step.
                        </p>
                    </div>

                    {/* CTA — Proceed to Checkout */}
                    <button
                        onClick={handleCheckout}
                        id="minicart-checkout-btn"
                        disabled={items.length === 0}
                        className="w-full group relative flex items-center justify-center gap-2 bg-white border border-[#e2e2e4] hover:bg-primary py-4 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="text-primary text-sm font-black uppercase tracking-widest group-hover:pr-4 group-hover:text-white transition-all">
                            Finalizar compra
                        </span>
                        <span className="material-symbols-outlined text-white text-sm absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            arrow_forward
                        </span>
                    </button>

                    {/* Trust icons */}
                    <div className="mt-4 flex justify-center gap-2 opacity-40">
                        <span className="material-symbols-outlined text-2xl text-primary">lock</span>
                        <span className="material-symbols-outlined text-2xl text-primary">verified_user</span>
                        <span className="material-symbols-outlined text-2xl text-primary">shield</span>
                    </div>
                </div>
            </dialog>
        </>
    )
}
