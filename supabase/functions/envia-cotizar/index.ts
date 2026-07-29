import { createClient } from 'npm:@supabase/supabase-js@^2'
import { buildCorsHeaders } from '../_shared/cors.ts'
import { cotizarEnvio, type Origen, type Destino, type Paquete } from '../_shared/envia.ts'

interface Request_ {
  items: Array<{ productId: string; qty: number }>
  destino: { city: string; province: string; postalCode: string }
  origen: Origen
  carriers: string[]
}

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { items, destino, origen, carriers }: Request_ = await req.json()

    console.log('[ENVIA-COTIZAR] Request recibido:', { itemCount: items?.length, carriers: carriers?.length })

    // Validar request
    if (!items?.length) throw new Error('Items requeridos')
    if (!destino?.city || !destino?.province || !destino?.postalCode) throw new Error('Destino incompleto')
    if (!origen?.nombre || !origen?.calle) throw new Error('Origen incompleto')
    if (!carriers?.length) throw new Error('Sin carriers')

    // Fetch productos
    console.log('[ENVIA-COTIZAR] Leyendo productos...')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const productIds = [...new Set(items.map(i => i.productId))]
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, weight_kg, height_cm, width_cm, length_cm')
      .in('id', productIds)

    if (prodErr) throw prodErr
    console.log('[ENVIA-COTIZAR] Productos encontrados:', products?.length)

    const productMap = Object.fromEntries(products?.map(p => [p.id, p]) || [])

    // Validar dimensiones
    const missingDims: string[] = []
    for (const item of items) {
      const p = productMap[item.productId]
      if (!p) missingDims.push(`${item.productId}: no encontrado`)
      else if (!p.weight_kg || !p.height_cm || !p.width_cm || !p.length_cm) {
        missingDims.push(`${p.name}: faltan dimensiones`)
      }
    }

    if (missingDims.length) {
      throw new Error(`Dimensiones faltantes: ${missingDims.join('; ')}`)
    }

    // Calcular paquete
    console.log('[ENVIA-COTIZAR] Calculando paquete...')
    let totalWeight = 0
    let maxHeight = 0
    let maxWidth = 0
    let totalLength = 0

    for (const item of items) {
      const p = productMap[item.productId]
      totalWeight += (p.weight_kg || 0) * item.qty
      maxHeight = Math.max(maxHeight, p.height_cm || 0)
      maxWidth = Math.max(maxWidth, p.width_cm || 0)
      totalLength += (p.length_cm || 0) * item.qty
    }

    const paquete: Paquete = {
      peso: Math.max(0.1, totalWeight),
      alto: Math.max(1, maxHeight),
      ancho: Math.max(1, maxWidth),
      largo: Math.max(1, totalLength),
    }

    console.log('[ENVIA-COTIZAR] Paquete:', paquete)

    // Cotizar
    console.log('[ENVIA-COTIZAR] Cotizando con carriers:', carriers)
    const opciones = await cotizarEnvio(
      origen,
      { ciudad: destino.city, provincia: destino.province, codigoPostal: destino.postalCode },
      paquete,
      carriers
    )

    console.log('[ENVIA-COTIZAR] Opciones obtenidas:', opciones.length)

    return new Response(
      JSON.stringify({ opciones }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ENVIA-COTIZAR] Error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
