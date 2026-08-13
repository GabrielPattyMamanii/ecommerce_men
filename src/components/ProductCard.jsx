import { Link } from 'react-router-dom'
import { formatPrice, isPurchasable } from '../lib/productPricing'
import { buildConsultWhatsappUrl } from '../lib/whatsappConsult'

export default function ProductCard({ product, onAdd, badge, contactSettings }) {
    const imgUrl = product.images?.[0] || null
    const isConsult = product.price_on_request
    const consultUrl = isConsult ? buildConsultWhatsappUrl(contactSettings, product.name) : null

    function handleButtonClick() {
        if (isConsult) {
            if (consultUrl) window.open(consultUrl, '_blank')
            return
        }
        onAdd(product, 'default', 'M')
    }

    return (
        <article className="group bg-surface flex flex-col transition-all duration-300">
            <div className="relative aspect-[3/4] overflow-hidden bg-surface-container">
                {imgUrl ? (
                    <img
                        src={imgUrl}
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-5xl">image_not_supported</span>
                    </div>
                )}
                {badge && (
                    <div className="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                        {badge}
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col gap-2">
                <h3 className="font-display text-xl font-bold uppercase tracking-tight text-primary leading-tight line-clamp-2 min-h-[2.9rem]">
                    {product.name}
                </h3>
                {product.description && (
                    <p className="text-[11px] text-muted font-medium uppercase tracking-wide truncate">
                        {product.description}
                    </p>
                )}
                <span className="font-display text-2xl font-bold tracking-tight text-primary mt-2">
                    {formatPrice(product)}
                </span>

                <div className="grid grid-cols-2 gap-2 mt-3">
                    <Link
                        to={`/producto/${product.id}`}
                        className="py-3 border border-primary text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-on-primary transition-all text-center"
                    >
                        Detalle
                    </Link>
                    <button
                        onClick={handleButtonClick}
                        disabled={isConsult ? !consultUrl : !isPurchasable(product)}
                        className="py-3 bg-primary text-[11px] font-bold uppercase tracking-widest text-on-primary hover:bg-primary-strong transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isConsult ? 'Consultar' : (isPurchasable(product) ? 'Agregar' : 'N/A')}
                    </button>
                </div>
            </div>
        </article>
    )
}
