// Supabase Edge Function — Envia.com shipping quote
// Deploy: supabase functions deploy envia-cotizar
// No authentication required (like create-mp-preference)
// Validates request body and returns available shipping options

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'
import { armarPaquete, cotizarEnvio, QuoteOption } from '../_shared/envia.ts'

interface QuoteRequest {
  items: Array<{ productId: string; qty: number }>
  destino: {
    street: string
    number: string
    city: string
    province: string
    postalCode: string
  }
}

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)
  console.log(`[ENVIA-COTIZAR] ${req.method} request received`)

  if (!SITE_URL) {
    console.error('[ENVIA-COTIZAR] SITE_URL not configured')
    return new Response(JSON.stringify({ error: 'SITE_URL environment variable not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    let payload: QuoteRequest
    try {
      payload = await req.json()
      console.log('[ENVIA-COTIZAR] Request body parsed:', JSON.stringify(payload))
    } catch (parseErr) {
      console.error('[ENVIA-COTIZAR] JSON parse error:', parseErr)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', detail: String(parseErr) }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const { items, destino } = payload

    // Validate request
    console.log('[ENVIA-COTIZAR] Validating items...')
    if (!items?.length) {
      console.error('[ENVIA-COTIZAR] Items array empty or missing')
      return new Response(
        JSON.stringify({ error: 'Items array required', received: { items } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }
    console.log(`[ENVIA-COTIZAR] Items OK: ${items.length} items`)

    console.log('[ENVIA-COTIZAR] Validating destination...')
    if (!destino) {
      console.error('[ENVIA-COTIZAR] Destination missing entirely')
      return new Response(
        JSON.stringify({ error: 'Destination required', received: { destino } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const missingFields = []
    if (!destino.street) missingFields.push('street')
    if (!destino.number) missingFields.push('number')
    if (!destino.city) missingFields.push('city')
    if (!destino.province) missingFields.push('province')
    if (!destino.postalCode) missingFields.push('postalCode')

    if (missingFields.length > 0) {
      console.error(`[ENVIA-COTIZAR] Missing destination fields: ${missingFields.join(', ')}`)
      return new Response(
        JSON.stringify({
          error: 'Complete destination address required',
          missingFields,
          received: destino,
        }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }
    console.log('[ENVIA-COTIZAR] Destination OK')

    // Build package from product weights
    console.log('[ENVIA-COTIZAR] Creating Supabase admin client...')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    console.log('[ENVIA-COTIZAR] Building package from items...')
    const paquete = await armarPaquete(items, supabaseAdmin)

    if ('error' in paquete) {
      console.error(`[ENVIA-COTIZAR] Package build error: ${paquete.error}`, paquete)
      return new Response(
        JSON.stringify({
          error: paquete.error,
          message: paquete.error === 'FALTA_PESO'
            ? `Product ${paquete.productId} is missing weight/dimensions. Contact support or add manual shipping.`
            : 'Shipping calculation failed',
          productId: paquete.productId,
        }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }
    console.log('[ENVIA-COTIZAR] Package built successfully:', paquete)

    // Get quotes from active carriers
    console.log('[ENVIA-COTIZAR] Requesting quotes from carriers...')
    const opciones: QuoteOption[] = await cotizarEnvio(paquete, destino)
    console.log(`[ENVIA-COTIZAR] Quotes received: ${opciones.length} options`)

    if (opciones.length === 0) {
      console.warn('[ENVIA-COTIZAR] WARNING: No options returned from any carrier')
      console.warn('[ENVIA-COTIZAR] DEBUG INFO:', {
        paquete,
        destino,
        envia_api_url: Deno.env.get('ENVIA_API_URL'),
        envia_token_configured: !!Deno.env.get('ENVIA_API_TOKEN'),
        envia_token_length: Deno.env.get('ENVIA_API_TOKEN')?.length,
        envia_token_preview: Deno.env.get('ENVIA_API_TOKEN')?.substring(0, 30) + '...',
      })
    }

    return new Response(
      JSON.stringify({
        opciones,
        ...(opciones.length === 0 && {
          debug: {
            mensaje: 'No se encontraron opciones de envío para los carriers activos',
            paquete,
            destino,
            envia_api_url: Deno.env.get('ENVIA_API_URL'),
            envia_token_configured: !!Deno.env.get('ENVIA_API_TOKEN'),
          }
        })
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[ENVIA-COTIZAR] Unhandled error:', {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    const message = err instanceof Error ? err.message : 'Shipping quote failed'
    return new Response(
      JSON.stringify({
        error: message,
        type: err instanceof Error ? err.name : 'UnknownError',
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
