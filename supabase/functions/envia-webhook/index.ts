// Supabase Edge Function — webhook de envia.com (tracking updates)
// POST /functions/v1/envia-webhook?token=SECRET
// Deploy: supabase functions deploy envia-webhook --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const webhookSecret = Deno.env.get('ENVIA_WEBHOOK_SECRET')

    // ── Validar token secreto ──
    if (!token || token !== webhookSecret) {
      console.warn('Webhook: invalid token')
      return new Response('Unauthorized', { status: 401, headers: CORS })
    }

    // ── Parse webhook payload ──
    const body = await req.json() as Record<string, unknown>

    // envia.com envía: { shipmentId, shipment_id, trackingNumber, tracking_number, status, ... }
    // Campos pueden variar entre versiones de su API
    const shipmentId = (body.shipmentId || body.shipment_id) as string | undefined
    const trackingNumber = (body.trackingNumber || body.tracking_number) as string | undefined
    const status = body.status as string | undefined

    if (!status) {
      console.log('Webhook: no status field, skipping')
      return new Response('OK', { status: 200, headers: CORS })
    }

    // ── Buscar orden por tracking ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let order
    if (shipmentId) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('envia_shipment_id', shipmentId)
        .single()
      order = data
    } else if (trackingNumber) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('tracking_number', trackingNumber)
        .single()
      order = data
    }

    if (!order) {
      console.warn(`Webhook: no order found for shipmentId=${shipmentId}, trackingNumber=${trackingNumber}`)
      return new Response('OK', { status: 200, headers: CORS })
    }

    // ── Actualizar estado de tracking ──
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        shipping_status: status,
        shipping_status_updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (error) {
      console.error(`Webhook: update failed for order ${order.id}:`, error)
      // Still return 200 so envia stops retrying
      return new Response('OK', { status: 200, headers: CORS })
    }

    console.log(`Webhook: order ${order.id} → shipping_status=${status}`)
    return new Response('OK', { status: 200, headers: CORS })
  } catch (err) {
    console.error('Webhook error:', err)
    // Always return 200 so envia stops retrying
    return new Response('OK', { status: 200, headers: CORS })
  }
})
