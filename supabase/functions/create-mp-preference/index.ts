// Supabase Edge Function — Mercado Pago: create payment preference
// Deploy: supabase functions deploy create-mp-preference
// Env vars needed in Supabase Dashboard → Settings → Edge Functions:
//   MP_ACCESS_TOKEN  — tu Access Token de producción o sandbox
//   SITE_URL         — URL del frontend (ej. https://tudominio.com)
// Auto-available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { MercadoPagoConfig, Preference } from 'npm:mercadopago@^2'
import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'

interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  qty: number
  img?: string
  spec?: string
}

interface Payer {
  email: string
  phone: string
  firstName: string
  lastName: string
}

interface ShippingAddress {
  street: string
  number: string
  city: string
  province: string
  postalCode: string
  email: string
}

interface ShippingQuote {
  carrier: string
  service: string
  serviceDescription: string
  price: number
  currency: string
  estimatedDays: number
  dropOffType: 'Delivery' | 'Branch'
  sucursalCodigo?: string
  sucursalDireccion?: string
}

interface CheckoutPayload {
  items: CartItem[]
  payer: Payer
  shippingMethod: 'shipping' | 'pickup'
  shippingAddress?: ShippingAddress | null
  shippingQuote?: ShippingQuote | null
}

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (!SITE_URL) {
    return new Response(JSON.stringify({ error: 'SITE_URL environment variable not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { items, payer, shippingMethod, shippingAddress }: CheckoutPayload =
      await req.json()

    if (!items?.length) {
      return new Response(
        JSON.stringify({ error: 'El carrito está vacío.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (!payer?.email) {
      return new Response(
        JSON.stringify({ error: 'El email del comprador es obligatorio.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Supabase admin client (bypasses RLS) ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Extract user_id from Authorization header (if logged in) ──
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', ''),
      )
      userId = user?.id ?? null
    }

    // ── Compute totals ──
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    // Use actual shipping quote price from envia.com, or 0 for pickup
    const shippingCost = shippingMethod === 'pickup' ? 0 : (shippingQuote?.price ?? 0)
    const total = subtotal + shippingCost

    // ── 1. Create order in DB (status: pending) ──
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        total,
        customer_email: payer.email,
        customer_phone: payer.phone || null,
        customer_name: `${payer.firstName} ${payer.lastName}`.trim() || null,
        shipping_type: shippingMethod,
        shipping_address: shippingMethod === 'shipping' && shippingAddress
          ? shippingAddress
          : null,
        shipping_quote: shippingMethod === 'shipping' && shippingQuote
          ? shippingQuote
          : null,
      })
      .select('id')
      .single()

    if (orderErr) throw orderErr

    // ── 2. Insert order_items ──
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.qty,
      unit_price: item.price,
      spec: item.spec || null,
    }))

    const { error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsErr) throw itemsErr

    // ── 3. Create Mercado Pago preference ──
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) {
      throw new Error('MP_ACCESS_TOKEN environment variable not set')
    }

    const client = new MercadoPagoConfig({
      accessToken: mpAccessToken,
      options: { timeout: 8000 },
    })

    const siteUrl = SITE_URL.replace(/\/$/, '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const notificationUrl = `${supabaseUrl}/functions/v1/handle-mp-webhook`

    const response = await new Preference(client).create({
      body: {
        items: items.map((item) => ({
          id: item.productId,
          title: item.name,
          unit_price: item.price,
          quantity: item.qty,
          currency_id: 'ARS',
          picture_url: item.img,
        })),
        payer: {
          email: payer.email,
          phone: { number: payer.phone || '' },
          name: payer.firstName,
          surname: payer.lastName,
        },
        external_reference: order.id,
        notification_url: notificationUrl,
        back_urls: {
          success: `${siteUrl}/pago-resultado?status=success&order_id=${order.id}`,
          failure: `${siteUrl}/pago-resultado?status=failure&order_id=${order.id}`,
          pending: `${siteUrl}/pago-resultado?status=pending&order_id=${order.id}`,
        },
        auto_return: 'approved',
        statement_descriptor: 'NEXO PERFORMANCE',
      },
    })

    // ── 4. Store preference_id on the order ──
    await supabaseAdmin
      .from('orders')
      .update({ payment_id: response.id })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({
        preferenceId: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        order_id: order.id,
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
