import { formatPrice } from '../lib/productPricing'

/**
 * Precio de un producto — cuando `price_on_request` es true, en vez de mostrar
 * "Consultar precio" como si fuera un precio más (negro, bold, igual tipografía),
 * lo muestra como una píldora de acento distinta: invita a la acción (consultar)
 * en vez de simular un dato numérico que no existe.
 */
export default function PriceTag({ product, className = '', size = 'md' }) {
    if (!product.price_on_request) {
        return <span className={className}>{formatPrice(product)}</span>
    }

    const sizeClasses = size === 'sm'
        ? 'px-2.5 py-1 text-[10px] gap-1'
        : 'px-3 py-1.5 text-xs gap-1.5'

    return (
        <span className={`inline-flex items-center ${sizeClasses} rounded-full bg-accent/10 text-accent font-mono font-bold uppercase tracking-wide w-fit`}>
            <span className="material-symbols-outlined" style={{ fontSize: size === 'sm' ? '13px' : '15px' }}>
                chat
            </span>
            Consultar precio
        </span>
    )
}
