/**
 * PromoBanner.jsx — Banner de promoción en vivo (storefront público)
 *
 * Lee el único cupón con show_in_banner = true y status = 'publicado'
 * (RLS ya restringe la lectura anónima a solo cupones publicados) y muestra
 * su `message` (HTML autorizado desde el panel admin) + countdown si tiene
 * contador, en un ticker continuo que se desplaza de izquierda a derecha.
 * Se re-consulta cada 30s para reflejar cambios hechos desde el panel sin
 * requerir que el visitante recargue la página.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const POLL_INTERVAL_MS = 30_000
// Repeticiones del mensaje en el ticker — suficientes para cubrir pantallas
// ultra-anchas sin que se note un hueco durante el loop.
const TICKER_REPEATS = 10

function formatCountdown(ms) {
    if (ms <= 0) return null
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = n => String(n).padStart(2, '0')
    return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export default function PromoBanner() {
    const [coupon, setCoupon] = useState(null)
    const [nowMs, setNowMs] = useState(() => Date.now())

    /* ─ Consulta el cupón activo del banner ─ */
    useEffect(() => {
        let cancelled = false

        async function loadActiveCoupon() {
            const { data } = await supabase
                .from('coupons')
                .select('id, code, discount_percentage, message, has_counter, counter_end_time, applies_to')
                .eq('show_in_banner', true)
                .eq('status', 'publicado')
                .maybeSingle()
            if (!cancelled) setCoupon(data ?? null)
        }

        loadActiveCoupon()
        const pollId = setInterval(loadActiveCoupon, POLL_INTERVAL_MS)
        return () => { cancelled = true; clearInterval(pollId) }
    }, [])

    /* ─ Tick del countdown, solo corre si el cupón activo tiene contador ─ */
    useEffect(() => {
        if (!coupon?.has_counter || !coupon.counter_end_time) return
        const tickId = setInterval(() => setNowMs(Date.now()), 1000)
        return () => clearInterval(tickId)
    }, [coupon?.has_counter, coupon?.counter_end_time])

    if (!coupon) return null

    const remainingMs = coupon.has_counter && coupon.counter_end_time
        ? new Date(coupon.counter_end_time).getTime() - nowMs
        : null
    const countdownLabel = remainingMs !== null ? formatCountdown(remainingMs) : null

    // El contador venció: la promo ya terminó, no tiene sentido seguir mostrándola
    // (el admin sigue viendo la tarjeta en el panel para reiniciarla o apagarla).
    if (remainingMs !== null && countdownLabel === null) return null

    function PromoContent() {
        return (
            <>
                {coupon.message ? (
                    <span
                        className="font-body text-xs sm:text-sm text-primary [&_strong]:font-bold [&_a]:text-primary [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: coupon.message }}
                    />
                ) : (
                    <span className="font-body text-xs sm:text-sm text-primary">
                        <strong>{coupon.discount_percentage}% OFF</strong> con el código <strong>{coupon.code}</strong>
                    </span>
                )}

                {coupon.applies_to !== 'ambos' && (
                    <span className={`font-mono text-xs sm:text-sm font-semibold tabular-nums px-2 py-0.5 rounded-full border ${
                        coupon.applies_to === 'wholesale'
                            ? 'text-amber-600 border-amber-600/40'
                            : 'text-primary border-primary/40'
                    }`}>
                        {coupon.applies_to === 'wholesale' ? 'SOLO POR MAYOR' : 'SOLO POR MENOR'}
                    </span>
                )}

                {countdownLabel && (
                    <span className="font-mono text-xs sm:text-sm font-semibold text-primary tabular-nums px-2 py-0.5 rounded-full border border-primary/40">
                        {countdownLabel}
                    </span>
                )}
            </>
        )
    }

    return (
        <div
            role="region"
            aria-label="Promoción activa"
            className="relative w-full bg-white border-b border-border text-muted overflow-hidden promo-ticker"
        >
            {/* Versión accesible — una sola lectura para lectores de pantalla */}
            <div className="sr-only">
                <PromoContent />
            </div>

            {/* Ticker visual — se repite varias veces para que el loop sea continuo */}
            <div className="promo-ticker__track py-2" aria-hidden="true">
                {Array.from({ length: TICKER_REPEATS }).map((_, i) => (
                    <div key={i} className="promo-ticker__item">
                        <PromoContent />
                        <span className="promo-ticker__sep">✦</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
