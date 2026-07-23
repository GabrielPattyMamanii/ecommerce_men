import { createContext, useContext, useEffect, useState } from 'react'

const CART_KEY = 'cart'

const CartCtx = createContext(null)

export function CartProvider({ children }) {
    // Lazy initializer: lee localStorage una sola vez en el primer render
    const [items, setItems] = useState(
        () => JSON.parse(localStorage.getItem(CART_KEY) ?? 'null') ?? []
    )
    const [isOpen, setIsOpen] = useState(false)

    // Sincronizar items → localStorage en cada cambio
    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(items))
    }, [items])

    const openCart  = () => setIsOpen(true)
    const closeCart = () => setIsOpen(false)
    const toggleCart = () => setIsOpen(o => !o)

    /* ─ Lógica de carrito ─ */

    function changeQty(id, delta) {
        setItems(prev =>
            prev
                .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
                .filter(i => i.qty > 0)
        )
    }

    function removeItem(id) {
        setItems(prev => prev.filter(i => i.id !== id))
    }

    /**
     * Añade un producto al carrito. Si ya existe la misma variante (id único
     * = productId + color + size) incrementa la cantidad en 1.
     *
     * @param {{ id: string, name: string, retail_price: number, images: string[] }} product
     * @param {string} color  — valor del color seleccionado (ej. 'midnight_blk')
     * @param {string} size   — talla seleccionada (ej. 'M')
     */
    function addItem(product, color, size) {
        const itemId = `${product.id}-${color}-${size}`.toLowerCase()
        const exists = items.some(i => i.id === itemId)

        if (exists) {
            changeQty(itemId, 1)
        } else {
            const colorLabel = color
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())

            setItems(prev => [
                ...prev,
                {
                    id:        itemId,
                    productId: product.id,
                    name:      product.name,
                    spec:      `${colorLabel} // Sz: ${size}`,
                    price:     product.retail_price,
                    qty:       1,
                    img:       product.images?.[0] ?? '',
                },
            ])
        }

        openCart()
    }

    function clearCart() {
        setItems([])
    }

    const totalCount = items.reduce((sum, i) => sum + i.qty, 0)
    const subtotal   = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const shipping   = subtotal >= 200 ? 0 : 12
    const total      = subtotal + shipping

    return (
        <CartCtx.Provider value={{
            items,
            isOpen,
            openCart, closeCart, toggleCart,
            changeQty, removeItem, addItem, clearCart,
            totalCount, subtotal, shipping, total,
        }}>
            {children}
        </CartCtx.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
    const ctx = useContext(CartCtx)
    if (!ctx) throw new Error('useCart must be inside CartProvider')
    return ctx
}
