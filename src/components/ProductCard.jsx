import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/productPricing'

export default function ProductCard({ product, badge }) {
    const imgUrl = product.images?.[0] || null

    return (
        <Link
            to={`/producto/${product.id}`}
            className="group bg-surface flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
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
                <h3 className="font-display text-xl font-bold uppercase tracking-tight text-primary leading-tight line-clamp-2 min-h-[2.9rem] transition-colors group-hover:text-primary-strong">
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
            </div>
        </Link>
    )
}
