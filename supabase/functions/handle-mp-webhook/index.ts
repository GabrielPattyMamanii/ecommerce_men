// Supabase Edge Function — Mercado Pago webhook handler
// Deploy: supabase functions deploy handle-mp-webhook --no-verify-jwt
// Env vars needed in Supabase Dashboard → Settings → Edge Functions:
//   MP_ACCESS_TOKEN   — Access Token de producción o sandbox
//   RESEND_API_KEY    — API key de Resend (resend.com)
//   SENDER_EMAIL      — Email verificado en Resend (ej: orders@tudominio.com)
// Auto-available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '@shared/cors.ts'

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
    const url = new URL(req.url)
    let paymentId: string | null = null

    // ── Parse notification (webhook POST or IPN query params) ──
    if (req.method === 'POST') {
      const body = await req.json()
      if (body.type === 'payment' && body.data?.id) {
        paymentId = String(body.data.id)
      }
    }

    // IPN fallback: ?topic=payment&id=123
    if (!paymentId) {
      const topic = url.searchParams.get('topic') ?? url.searchParams.get('type')
      if (topic === 'payment') {
        paymentId = url.searchParams.get('id') ?? url.searchParams.get('data.id')
      }
    }

    // Not a payment notification — acknowledge and return
    if (!paymentId) {
      return new Response('OK', { status: 200, headers: CORS })
    }

    // ── Verify payment with Mercado Pago API ──
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${mpToken}` } },
    )
    const payment = await mpRes.json()

    // Only process approved payments
    if (payment.status !== 'approved') {
      console.log(`Payment ${paymentId} status: ${payment.status} — skipping`)
      return new Response('OK', { status: 200, headers: CORS })
    }

    const orderId = payment.external_reference
    if (!orderId) {
      console.error('Payment approved but no external_reference:', paymentId)
      return new Response('OK', { status: 200, headers: CORS })
    }

    // ── Update order in database ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Idempotency: only update if still pending
    const { data: order, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        payment_id: String(paymentId),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select(`
        id, total, customer_email, customer_name, customer_phone,
        shipping_type, shipping_address,
        order_items ( quantity, unit_price, spec, products ( name ) )
      `)
      .single()

    if (updateErr) {
      // Likely already processed (idempotent) — log but don't fail
      console.warn('Order update skipped (may be already processed):', updateErr.message)
      return new Response('OK', { status: 200, headers: CORS })
    }

    // ── Send confirmation email via Resend ──
    await sendConfirmationEmail(order)

    console.log(`Order ${orderId} → paid. Email sent to ${order.customer_email}`)
    return new Response('OK', { status: 200, headers: CORS })
  } catch (err) {
    console.error('Webhook error:', err)
    // Always return 200 so MP stops retrying
    return new Response('OK', { status: 200, headers: CORS })
  }
})

// ── Email helper ──────────────────────────────────────────────

async function sendConfirmationEmail(order: Record<string, any>) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const senderEmail = Deno.env.get('SENDER_EMAIL') ?? 'noreply@tudominio.com'

  if (!resendKey || !order.customer_email) {
    console.warn('Skipping email: missing RESEND_API_KEY or customer_email')
    return
  }

  const shortId = order.id.slice(0, 8).toUpperCase()

  // Build items HTML rows
  const itemsHtml = (order.order_items ?? [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #1a1a2e;color:#e0e0e0;font-family:'Courier New',monospace;font-size:14px;">
          ${escapeHtml(item.products?.name ?? 'Producto')}
          ${item.spec ? `<br><span style="color:#00f0ff;font-size:12px;">${escapeHtml(item.spec)}</span>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #1a1a2e;color:#e0e0e0;text-align:center;font-family:'Courier New',monospace;">
          ${item.quantity}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #1a1a2e;color:#00f0ff;text-align:right;font-family:'Courier New',monospace;font-weight:bold;">
          $${Number(item.unit_price).toFixed(2)}
        </td>
      </tr>`,
    )
    .join('')

  // Shipping info block
  const shippingHtml =
    order.shipping_type === 'pickup'
      ? `
      <div style="margin-top:24px;padding:16px;background:#0a0f14;border-left:3px solid #00f0ff;">
        <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#00f0ff;text-transform:uppercase;letter-spacing:2px;">
          Retiro en Local
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:#ccc;">
          Te contactaremos para coordinar el horario de retiro en nuestro showroom (Microcentro, Buenos Aires).
        </p>
      </div>`
      : order.shipping_address
        ? `
      <div style="margin-top:24px;padding:16px;background:#0a0f14;border-left:3px solid #00f0ff;">
        <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#00f0ff;text-transform:uppercase;letter-spacing:2px;">
          Envío a domicilio
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:#ccc;">
          ${escapeHtml(order.shipping_address.address ?? '')}
          ${order.shipping_address.city ? `, ${escapeHtml(order.shipping_address.city)}` : ''}
          ${order.shipping_address.postalCode ? ` (${escapeHtml(order.shipping_address.postalCode)})` : ''}
        </p>
      </div>`
        : ''

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#050505;color:#e0e0e0;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 0;border-bottom:1px solid #00f0ff;">
      <h1 style="margin:0;font-family:'Courier New',monospace;font-size:28px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ffffff;">
        NEXO <span style="color:#00f0ff;">PERFORMANCE</span>
      </h1>
    </div>

    <!-- Status -->
    <div style="text-align:center;padding:40px 0;">
      <p style="font-family:'Courier New',monospace;font-size:11px;color:#00f0ff;text-transform:uppercase;letter-spacing:3px;margin-bottom:12px;">
        // Order Confirmed
      </p>
      <h2 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:2px;">
        Pago Aprobado
      </h2>
    </div>

    <!-- Order ID -->
    <div style="background:#0a0f14;border:1px solid #1a1a2e;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:12px;color:#888;">ORDER ID</p>
      <p style="margin:0;font-family:'Courier New',monospace;font-size:14px;color:#00f0ff;">#${shortId}</p>
    </div>

    <!-- Customer -->
    ${order.customer_name ? `
    <div style="background:#0a0f14;border:1px solid #1a1a2e;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:12px;color:#888;">CLIENTE</p>
      <p style="margin:0;font-size:14px;color:#e0e0e0;">${escapeHtml(order.customer_name)}</p>
      <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:12px;color:#00f0ff;">${escapeHtml(order.customer_email)}</p>
    </div>` : ''}

    <!-- Items table -->
    <table style="width:100%;border-collapse:collapse;background:#0a0f14;border:1px solid #1a1a2e;">
      <thead>
        <tr style="background:#0d1117;">
          <th style="padding:12px 16px;text-align:left;font-family:'Courier New',monospace;font-size:11px;color:#00f0ff;text-transform:uppercase;letter-spacing:2px;">Item</th>
          <th style="padding:12px 16px;text-align:center;font-family:'Courier New',monospace;font-size:11px;color:#00f0ff;text-transform:uppercase;letter-spacing:2px;">Qty</th>
          <th style="padding:12px 16px;text-align:right;font-family:'Courier New',monospace;font-size:11px;color:#00f0ff;text-transform:uppercase;letter-spacing:2px;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <!-- Total -->
    <div style="text-align:right;padding:20px;background:#0a0f14;border:1px solid #1a1a2e;border-top:none;">
      <span style="font-family:'Courier New',monospace;font-size:12px;color:#888;text-transform:uppercase;margin-right:16px;">Total</span>
      <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;color:#00f0ff;">$${Number(order.total).toFixed(2)}</span>
    </div>

    <!-- Shipping -->
    ${shippingHtml}

    <!-- Footer -->
    <div style="text-align:center;padding:32px 0;margin-top:40px;border-top:1px solid #1a1a2e;">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:2px;">
        Nexo Performance // Buenos Aires
      </p>
    </div>
  </div>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: senderEmail,
      to: [order.customer_email],
      subject: `Orden confirmada #${shortId}`,
      html,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('Resend error:', res.status, errBody)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
