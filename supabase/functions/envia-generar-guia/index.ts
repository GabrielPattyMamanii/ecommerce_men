// Supabase Edge Function — generar guía de envío (solo admin)
// POST /functions/v1/envia-generar-guia
// Body: { orderId: string }

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '@shared/cors.ts'
import { generarEnvio } from '@shared/envia.ts'

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { orderId } = (await req.json()) as { orderId: string }

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId requerido' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Verificar admin vía RLS (is_admin()) ──
    // Intentamos leer una tabla admin-only; si falla RLS, no es admin
    const { data: adminCheck, error: adminErr } = await supabaseAdmin
      .from('coupons') // tabla admin-only, al insertarla la RLS valida is_admin()
      .select('id')
      .limit(1)

    if (adminErr && adminErr.code === '42501') {
      // RLS policy violation = not admin
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Cargar orden (debe estar paid + shipping = automático) ──
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, total, customer_name, customer_email, customer_phone,
        shipping_type, shipping_address, shipping_carrier, shipping_service,
        shipping_is_branch,
        order_items (
          quantity, unit_price, spec,
          products ( id, name, unit_weight, unit_height, unit_width, unit_length,
                     dozen_weight, dozen_height, dozen_width, dozen_length )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderErr) throw orderErr

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Orden no encontrada' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (order.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Orden no está paid' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (order.shipping_type !== 'shipping') {
      return new Response(
        JSON.stringify({ error: 'Orden no es envío automático' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (!order.shipping_address) {
      return new Response(
        JSON.stringify({ error: 'Orden sin dirección de envío' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Cargar datos de origen desde env vars ──
    const origen = {
      nombre: Deno.env.get('ENVIA_ORIGEN_NOMBRE')!,
      empresa: Deno.env.get('ENVIA_ORIGEN_EMPRESA'),
      telefono: Deno.env.get('ENVIA_ORIGEN_TELEFONO')!,
      email: Deno.env.get('ENVIA_ORIGEN_EMAIL'),
      calle: Deno.env.get('ENVIA_ORIGEN_CALLE')!,
      numero: Deno.env.get('ENVIA_ORIGEN_NUMERO')!,
      ciudad: Deno.env.get('ENVIA_ORIGEN_CIUDAD')!,
      provincia: Deno.env.get('ENVIA_ORIGEN_PROVINCIA')!,
      cp: Deno.env.get('ENVIA_ORIGEN_CP')!,
    }

    // Validar datos de origen
    const missingOrigen = Object.entries(origen)
      .filter(([key, val]) => !val && key !== 'empresa' && key !== 'email')
      .map(([key]) => key)

    if (missingOrigen.length > 0) {
      return new Response(
        JSON.stringify({ error: `Datos de origen incompletos: ${missingOrigen.join(', ')}` }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Calcular paquete desde order_items ──
    let totalWeight = 0
    let maxHeight = 0
    let maxWidth = 0
    let totalLength = 0

    for (const item of order.order_items) {
      const product = item.products
      const itemType = item.spec?.includes('Docena') ? 'wholesale' : 'retail'

      const dims = itemType === 'retail'
        ? {
            weight: product.unit_weight,
            height: product.unit_height,
            width: product.unit_width,
            length: product.unit_length,
          }
        : {
            weight: product.dozen_weight,
            height: product.dozen_height,
            width: product.dozen_width,
            length: product.dozen_length,
          }

      totalWeight += dims.weight * item.quantity
      maxHeight = Math.max(maxHeight, dims.height)
      maxWidth = Math.max(maxWidth, dims.width)
      totalLength += dims.length * item.quantity
    }

    // ── Llamar a generarEnvio ──
    const result = await generarEnvio(
      { peso: totalWeight, alto: maxHeight, ancho: maxWidth, largo: totalLength },
      order.shipping_carrier!,
      order.shipping_service!,
      origen,
      {
        nombre: order.customer_name || 'Cliente',
        email: order.customer_email,
        telefono: order.customer_phone || '',
        calle: order.shipping_address.address,
        numero: order.shipping_address.number || '1',
        ciudad: order.shipping_address.city,
        provincia: order.shipping_address.province,
        cp: order.shipping_address.postalCode,
        branchCode: order.shipping_is_branch ? order.shipping_address.branchCode : undefined,
      }
    )

    // ── Actualizar orden con tracking ──
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'shipped',
        envia_shipment_id: result.shipmentId,
        tracking_number: result.trackingNumber,
        tracking_url: result.trackingUrl,
        label_url: result.labelUrl,
        shipping_status: 'pending', // estado inicial del tracking
        shipping_status_updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateErr) throw updateErr

    console.log(`Order ${orderId} → shipped. Tracking: ${result.trackingNumber}`)

    return new Response(
      JSON.stringify({
        success: true,
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        labelUrl: result.labelUrl,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('envia-generar-guia error:', err)
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
