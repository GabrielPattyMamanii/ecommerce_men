import { formatPrice, hasWholesale, formatWholesalePrice } from '../lib/productPricing'
import { usePriceVisibility } from '../hooks/usePriceVisibility'

/**
 * Precio de un producto — cuando `price_on_request` es true, en vez de mostrar
 * "Consultar precio" como si fuera un precio más (negro, bold, igual tipografía),
 * lo muestra como una píldora de acento distinta: invita a la acción (consultar)
 * en vez de simular un dato numérico que no existe.
 *
 * Si el admin desactivó el precio por unidad (Configuración → Precios), la
 * tarjeta muestra el precio por docena; requiere `wholesale_price` en el producto.
 */
export default function PriceTag({ product, className = '', size = 'md' }) {
    const { showRetail } = usePriceVisibility()

    if (!showRetail && hasWholesale(product)) {
        return <span className={className}>{formatWholesalePrice(product)}</span>
    }

    if (!showRetail || !product.price_on_request) {
        return <span className={className}>{showRetail ? formatPrice(product) : 'Consultar precio'}</span>
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
