// Supabase Edge Function — Generate actual shipping guide (admin-only, spends real balance)
// Deploy: supabase functions deploy envia-generar
// Env vars needed:
//   All ENVIA_* variables from create-mp-preference
//   SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'
import { armarPaquete, generarEnvio } from '../_shared/envia.ts'

interface GenerateRequest {
  orderId: string
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Auth check: admin only ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden generar guías' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Load order ──
    const { orderId }: GenerateRequest = await req.json()
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, shipping_type, shipping_address, shipping_quote,
        shipping_tracking_number, customer_email,
        order_items ( quantity, product_id, products (id, weight_kg, height_cm, width_cm, length_cm) )
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // Validations
    if (order.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Orden no está pagada (status debe ser "paid")' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (order.shipping_type !== 'shipping') {
      return new Response(
        JSON.stringify({ error: 'Esta orden es para retiro en local, no tiene envío' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (order.shipping_tracking_number) {
      return new Response(
        JSON.stringify({ error: 'Esta orden ya tiene una guía generada' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (!order.shipping_quote) {
      return new Response(
        JSON.stringify({ error: 'Orden sin opción de envío seleccionada' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (!order.shipping_address) {
      return new Response(
        JSON.stringify({ error: 'Orden sin dirección de envío' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Build package from order items ──
    const items = order.order_items.map((oi: any) => ({
      productId: oi.product_id,
      qty: oi.quantity,
    }))

    const paquete = await armarPaquete(items, supabaseAdmin)
    if ('error' in paquete) {
      return new Response(
        JSON.stringify({ error: `Package error: ${paquete.error}` }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Generate via envia.com ──
    const quote = order.shipping_quote
    const result = await generarEnvio(
      quote.carrier,
      quote.service,
      paquete,
      {
        street: order.shipping_address.street,
        number: order.shipping_address.number,
        city: order.shipping_address.city,
        province: order.shipping_address.province,
        postalCode: order.shipping_address.postalCode,
      },
      order.customer_email || '',
      quote.sucursalCodigo,
    )

    // ── Save tracking data ──
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        shipping_tracking_number: result.trackingNumber,
        shipping_tracking_url: result.trackingUrl,
        shipping_label_url: result.labelUrl,
      })
      .eq('id', orderId)

    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        labelUrl: result.labelUrl,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Generate error:', err)
    const message = err instanceof Error ? err.message : 'Guide generation failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
