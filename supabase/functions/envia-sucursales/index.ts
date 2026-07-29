// Supabase Edge Function — Get available branches for branch-based shipping
// Deploy: supabase functions deploy envia-sucursales
// Called when user selects a "Branch" type shipping option

import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'
import { sucursalesDisponibles } from '../_shared/envia.ts'

interface BranchesRequest {
  carrier: string
  postalCode: string
  province: string
}

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (!SITE_URL) {
    return new Response(JSON.stringify({ error: 'SITE_URL environment variable not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { carrier, postalCode, province }: BranchesRequest = await req.json()

    if (!carrier || !postalCode || !province) {
      return new Response(
        JSON.stringify({ error: 'carrier, postalCode, and province required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const sucursales = await sucursalesDisponibles(carrier, postalCode, province)

    return new Response(
      JSON.stringify({ sucursales }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Branches error:', err)
    const message = err instanceof Error ? err.message : 'Branches fetch failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
