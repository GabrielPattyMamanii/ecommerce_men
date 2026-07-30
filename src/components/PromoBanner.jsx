/**
 * PromoBanner.jsx — Banner de promoción en vivo (storefront público)
 *
 * Lee el único cupón con show_in_banner = true y status = 'publicado'
 * (RLS ya restringe la lectura anónima a solo cupones publicados) y muestra
 * su `message` (HTML autorizado desde el panel admin) + countdown si tiene
 * contador. Se re-consulta cada 30s para reflejar cambios hechos desde el
 * panel sin requerir que el visitante recargue la página.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const POLL_INTERVAL_MS = 30_000

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

    const fallbackMessage = `${coupon.discount_percentage}% OFF con el código ${coupon.code}`

    return (
        <div
            role="region"
            aria-label="Promoción activa"
            className="relative w-full bg-background-dark border-b border-primary/30 text-tech-grey"
        >
            <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
                <span
                    className="font-body text-xs sm:text-sm text-slate-200 [&_strong]:text-primary [&_strong]:font-bold [&_a]:text-primary [&_a]:underline"
                    dangerouslySetInnerHTML={coupon.message ? { __html: coupon.message } : undefined}
                >
                    {!coupon.message ? fallbackMessage : undefined}
                </span>

                {coupon.applies_to !== 'ambos' && (
                    <span className={`font-mono text-xs sm:text-sm font-semibold tabular-nums shadow-neon-sm px-2 py-0.5 rounded-sm border ${
                        coupon.applies_to === 'wholesale'
                            ? 'text-amber-400 border-amber-400/40'
                            : 'text-primary border-primary/40'
                    }`}>
                        {coupon.applies_to === 'wholesale' ? 'SOLO POR MAYOR' : 'SOLO POR MENOR'}
                    </span>
                )}

                {countdownLabel && (
                    <span className="font-mono text-xs sm:text-sm font-semibold text-primary tabular-nums shadow-neon-sm px-2 py-0.5 rounded-sm border border-primary/40">
                        {countdownLabel}
                    </span>
                )}
            </div>
        </div>
    )
}
