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
    console.log('[ENVIA-COTIZAR] ========== INICIO ==========')

    const bodyRaw = await req.json()
    console.log('[ENVIA-COTIZAR] Raw body recibido:', JSON.stringify(bodyRaw))

    const { items, destino, origen, carriers }: Request_ = bodyRaw
    console.log('[ENVIA-COTIZAR] Parsed - items:', items?.length, 'carriers:', carriers?.length)
    console.log('[ENVIA-COTIZAR] origen:', origen)
    console.log('[ENVIA-COTIZAR] destino:', destino)
    console.log('[ENVIA-COTIZAR] carriers:', carriers)

    // Validar request
    console.log('[ENVIA-COTIZAR] Validando...')
    if (!items?.length) {
      console.error('[ENVIA-COTIZAR] ❌ Items vacío')
      throw new Error('Items requeridos')
    }
    if (!destino?.city || !destino?.province || !destino?.postalCode) {
      console.error('[ENVIA-COTIZAR] ❌ Destino incompleto:', destino)
      throw new Error('Destino incompleto')
    }
    if (!origen?.nombre || !origen?.calle) {
      console.error('[ENVIA-COTIZAR] ❌ Origen incompleto:', origen)
      throw new Error('Origen incompleto')
    }
    if (!carriers?.length) {
      console.error('[ENVIA-COTIZAR] ❌ Carriers vacío')
      throw new Error('Sin carriers')
    }
    console.log('[ENVIA-COTIZAR] ✅ Validación OK')

    // Fetch productos
    console.log('[ENVIA-COTIZAR] 1️⃣ Leyendo productos...')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const productIds = [...new Set(items.map(i => i.productId))]
    console.log('[ENVIA-COTIZAR] IDs a buscar:', productIds)

    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, weight_kg, height_cm, width_cm, length_cm')
      .in('id', productIds)

    if (prodErr) {
      console.error('[ENVIA-COTIZAR] ❌ Error Supabase:', prodErr)
      throw prodErr
    }

    console.log('[ENVIA-COTIZAR] ✅ Productos encontrados:', products?.length)
    console.log('[ENVIA-COTIZAR] Datos:', JSON.stringify(products))

    const productMap = Object.fromEntries(products?.map(p => [p.id, p]) || [])

    // Validar dimensiones
    console.log('[ENVIA-COTIZAR] 2️⃣ Validando dimensiones...')
    const missingDims: string[] = []
    for (const item of items) {
      const p = productMap[item.productId]
      console.log(`[ENVIA-COTIZAR] Item ${item.productId}: qty=${item.qty}, found=${!!p}`)
      if (!p) {
        missingDims.push(`${item.productId}: no encontrado`)
      } else {
        console.log(`[ENVIA-COTIZAR]   - weight_kg=${p.weight_kg}, height=${p.height_cm}, width=${p.width_cm}, length=${p.length_cm}`)
        if (!p.weight_kg || !p.height_cm || !p.width_cm || !p.length_cm) {
          missingDims.push(`${p.name}: faltan dimensiones`)
        }
      }
    }

    if (missingDims.length) {
      console.error('[ENVIA-COTIZAR] ❌ Faltan dimensiones:', missingDims)
      throw new Error(`Dimensiones faltantes: ${missingDims.join('; ')}`)
    }
    console.log('[ENVIA-COTIZAR] ✅ Dimensiones OK')

    // Calcular paquete
    console.log('[ENVIA-COTIZAR] 3️⃣ Calculando paquete...')
    let totalWeight = 0
    let maxHeight = 0
    let maxWidth = 0
    let totalLength = 0

    for (const item of items) {
      const p = productMap[item.productId]
      const weight = (p.weight_kg || 0) * item.qty
      totalWeight += weight
      maxHeight = Math.max(maxHeight, p.height_cm || 0)
      maxWidth = Math.max(maxWidth, p.width_cm || 0)
      totalLength += (p.length_cm || 0) * item.qty
      console.log(`[ENVIA-COTIZAR]   Item: weight=${weight}kg, height=${p.height_cm}, width=${p.width_cm}, length=${p.length_cm * item.qty}`)
    }

    const paquete: Paquete = {
      peso: Math.max(0.1, totalWeight),
      alto: Math.max(1, maxHeight),
      ancho: Math.max(1, maxWidth),
      largo: Math.max(1, totalLength),
    }

    console.log('[ENVIA-COTIZAR] ✅ Paquete final:', JSON.stringify(paquete))

    // Cotizar
    console.log('[ENVIA-COTIZAR] 4️⃣ Enviando a cotizarEnvio()...')
    console.log('[ENVIA-COTIZAR]   origen:', JSON.stringify(origen))
    console.log('[ENVIA-COTIZAR]   destino:', JSON.stringify({ ciudad: destino.city, provincia: destino.province, codigoPostal: destino.postalCode }))
    console.log('[ENVIA-COTIZAR]   paquete:', JSON.stringify(paquete))
    console.log('[ENVIA-COTIZAR]   carriers:', carriers)

    let opciones = []
    try {
      opciones = await cotizarEnvio(
        origen,
        { ciudad: destino.city, provincia: destino.province, codigoPostal: destino.postalCode },
        paquete,
        carriers
      )
    } catch (cotizarErr) {
      console.error('[ENVIA-COTIZAR] ❌ Error en cotizarEnvio():', cotizarErr)
      throw cotizarErr
    }

    console.log('[ENVIA-COTIZAR] ✅ Opciones obtenidas:', opciones.length)
    if (opciones.length === 0) {
      console.warn('[ENVIA-COTIZAR] ⚠️ SIN OPCIONES devueltas')
    } else {
      console.log('[ENVIA-COTIZAR] Opciones:', JSON.stringify(opciones))
    }

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
