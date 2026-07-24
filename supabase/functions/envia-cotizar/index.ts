// Supabase Edge Function — cotización de envíos
// POST /functions/v1/envia-cotizar
// Body: { items: [{productId, qty, type: 'retail'|'wholesale'}], destino: {city, province, postalCode} }

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'
import { carriersActivosAR, cotizarEnvio, sucursalesDisponibles } from '../_shared/envia.ts'

interface CartItem {
  productId: string
  qty: number
  type: 'retail' | 'wholesale'
}

interface Destino {
  city: string
  province: string
  postalCode: string
}

interface CotizacionRequest {
  items: CartItem[]
  destino: Destino
}

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { items, destino }: CotizacionRequest = await req.json()

    if (!items?.length) {
      return new Response(
        JSON.stringify({ error: 'Carrito vacío' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (!destino?.city || !destino?.province || !destino?.postalCode) {
      return new Response(
        JSON.stringify({ error: 'Destino incompleto' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Fetch producto data + validar peso/dimensiones ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const productIds = [...new Set(items.map(i => i.productId))]
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, unit_weight, unit_height, unit_width, unit_length, dozen_weight, dozen_height, dozen_width, dozen_length')
      .in('id', productIds)

    if (prodErr) throw prodErr

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))

    // ── Validar que todos los items tengan peso/dimensiones ──
    const missingDimensions: string[] = []

    for (const item of items) {
      const product = productMap[item.productId]
      if (!product) {
        missingDimensions.push(`Producto no encontrado: ${item.productId}`)
        continue
      }

      if (item.type === 'retail') {
        // Retail requiere unit_*
        if (!product.unit_weight || !product.unit_height || !product.unit_width || !product.unit_length) {
          missingDimensions.push(`${product.name} (retail): faltan peso/dimensiones`)
        }
      } else {
        // Wholesale requiere dozen_*
        if (!product.dozen_weight || !product.dozen_height || !product.dozen_width || !product.dozen_length) {
          missingDimensions.push(`${product.name} (docena): faltan peso/dimensiones`)
        }
      }
    }

    if (missingDimensions.length > 0) {
      return new Response(
        JSON.stringify({ error: missingDimensions.join('; ') }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Calcular paquete combinado ──
    // Suma de pesos, bounding box de dimensiones
    let totalWeight = 0
    let maxHeight = 0
    let maxWidth = 0
    let totalLength = 0

    for (const item of items) {
      const product = productMap[item.productId]
      const dims = item.type === 'retail'
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

      totalWeight += dims.weight * item.qty
      maxHeight = Math.max(maxHeight, dims.height)
      maxWidth = Math.max(maxWidth, dims.width)
      totalLength += dims.length * item.qty
    }

    // ── Cotizar ──
    const carriers = await carriersActivosAR()
    if (!carriers.length) {
      return new Response(
        JSON.stringify({ error: 'Sin carriers activos' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const opciones = await cotizarEnvio(
      { peso: totalWeight, alto: maxHeight, ancho: maxWidth, largo: totalLength },
      { ciudad: destino.city, provincia: destino.province, codigoPostal: destino.postalCode },
      carriers
    )

    // ── Enriquecer con sucursales si aplica ──
    const opcionesEnriquecidas = await Promise.all(
      opciones.map(async op => {
        if (op.isBranch) {
          const sucursales = await sucursalesDisponibles(op.carrier, destino.postalCode, destino.province)
          return { ...op, sucursales }
        }
        return { ...op, sucursales: [] }
      })
    )

    return new Response(
      JSON.stringify({ opciones: opcionesEnriquecidas }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('envia-cotizar error:', err)
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
