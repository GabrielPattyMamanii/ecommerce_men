import { Link } from 'react-router-dom'
import PriceTag from './PriceTag'

export default function ProductCard({ product }) {
    const imgUrl = product.images?.[0] || null

    return (
        <Link
            to={`/producto/${product.id}`}
            className="group bg-surface flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_-16px_rgba(59,91,253,0.25)]"
        >
            <div className="relative aspect-[3/4] overflow-hidden bg-surface-container rounded-2xl">
                {imgUrl ? (
                    <img
                        src={imgUrl}
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-5xl">image_not_supported</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col gap-2">
                <h3 className="font-display text-xl font-bold uppercase tracking-tight text-primary leading-tight line-clamp-2 transition-colors group-hover:text-accent">
                    {product.name}
                </h3>
                <PriceTag product={product} className="font-display text-2xl font-bold tracking-tight text-primary mt-2" />
            </div>
        </Link>
    )
}
