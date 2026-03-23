// Supabase Edge Function — Mercado Pago: create payment preference
// Deploy: supabase functions deploy create-mp-preference --no-verify-jwt
// Env vars needed in Supabase Dashboard → Settings → Edge Functions:
//   MERCADOPAGO_ACCESS_TOKEN  — tu Access Token de producción o sandbox
//   SITE_URL                  — URL del frontend (ej. https://tudominio.com)

import { MercadoPagoConfig, Preference } from 'npm:mercadopago@^2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  img?: string
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { items }: { items: CartItem[] } = await req.json()

    if (!items?.length) {
      return new Response(
        JSON.stringify({ error: 'El carrito está vacío.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const client = new MercadoPagoConfig({
      accessToken: Deno.env.get('MP_ACCESS_TOKEN') ?? '',
      options: { timeout: 8000 },
    })

    const siteUrl = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

    const response = await new Preference(client).create({
      body: {
        items: items.map((item) => ({
          id: item.id,
          title: item.name,
          unit_price: item.price,
          quantity: item.qty,
          currency_id: 'ARS',
          picture_url: item.img,
        })),
        back_urls: {
          success: `${siteUrl}/pago-resultado?status=success`,
          failure: `${siteUrl}/pago-resultado?status=failure`,
          pending: `${siteUrl}/pago-resultado?status=pending`,
        },
        statement_descriptor: 'NEXO PERFORMANCE',
      },
    })

    return new Response(
      JSON.stringify({
        preferenceId: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('MP Error:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
