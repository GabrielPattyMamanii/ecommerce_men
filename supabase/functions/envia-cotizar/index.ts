import { createClient } from 'npm:@supabase/supabase-js@^2'
import { buildCorsHeaders } from '../_shared/cors.ts'
import { cotizarEnvio, type Origen, type Destino, type Paquete } from '../_shared/envia.ts'

interface Request_ {
  items: Array<{ productId: string; qty: number }>
  destino: { city: string; province: string; postalCode: string }
  origen?: Origen
  carriers: string[]
}

function buildOrigenFromEnv(): Origen {
  const nombre = Deno.env.get('ENVIA_ORIGEN_NOMBRE')
  const telefono = Deno.env.get('ENVIA_ORIGEN_TELEFONO')
  const email = Deno.env.get('ENVIA_ORIGEN_EMAIL')
  const calle = Deno.env.get('ENVIA_ORIGEN_CALLE')
  const numero = Deno.env.get('ENVIA_ORIGEN_NUMERO')
  const ciudad = Deno.env.get('ENVIA_ORIGEN_CIUDAD')
  const provincia = Deno.env.get('ENVIA_ORIGEN_PROVINCIA')
  const cp = Deno.env.get('ENVIA_ORIGEN_CP')

  if (!nombre) throw new Error('Missing secret: ENVIA_ORIGEN_NOMBRE')
  if (!telefono) throw new Error('Missing secret: ENVIA_ORIGEN_TELEFONO')
  if (!calle) throw new Error('Missing secret: ENVIA_ORIGEN_CALLE')
  if (!numero) throw new Error('Missing secret: ENVIA_ORIGEN_NUMERO')
  if (!ciudad) throw new Error('Missing secret: ENVIA_ORIGEN_CIUDAD')
  if (!provincia) throw new Error('Missing secret: ENVIA_ORIGEN_PROVINCIA')
  if (!cp) throw new Error('Missing secret: ENVIA_ORIGEN_CP')

  return {
    nombre,
    telefono,
    email: email || '',
    calle,
    numero,
    ciudad,
    provincia,
    cp,
  }
}

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    console.log('[ENVIA-COTIZAR] ═══════════════════════════════════════════')
    console.log('[ENVIA-COTIZAR] 🚀 INICIO DE COTIZACIÓN')
    console.log('[ENVIA-COTIZAR] ═══════════════════════════════════════════')

    const bodyRaw = await req.json()
    console.log('[ENVIA-COTIZAR] 📦 Raw body recibido:')
    console.log(JSON.stringify(bodyRaw, null, 2))

    const { items, destino, origen: origenFrontend, carriers }: Request_ = bodyRaw

    console.log('[ENVIA-COTIZAR] ✓ Items:', items?.length ?? 0)
    console.log('[ENVIA-COTIZAR] ✓ Carriers enviados:', carriers?.length ?? 0)
    console.log('[ENVIA-COTIZAR] ✓ Destino:', destino ? `${destino.city}, ${destino.province}` : 'VACÍO')
    console.log('[ENVIA-COTIZAR] ✓ Origen (frontend):', origenFrontend ? origenFrontend.nombre : 'NO ENVIADO')

    // 1️⃣ VALIDAR REQUEST
    console.log('[ENVIA-COTIZAR] 1️⃣ VALIDACIÓN DE REQUEST')
    if (!items?.length) {
      console.error('[ENVIA-COTIZAR] ❌ Items vacío')
      throw new Error('Items requeridos')
    }
    console.log('[ENVIA-COTIZAR]    ✅ Items OK')

    if (!destino?.city || !destino?.province || !destino?.postalCode) {
      console.error('[ENVIA-COTIZAR] ❌ Destino incompleto:', JSON.stringify(destino))
      throw new Error(`Destino incompleto: city=${destino?.city}, province=${destino?.province}, postalCode=${destino?.postalCode}`)
    }
    console.log('[ENVIA-COTIZAR]    ✅ Destino OK')

    if (!carriers?.length) {
      console.error('[ENVIA-COTIZAR] ❌ Carriers vacío:', carriers)
      throw new Error('Sin carriers')
    }
    console.log('[ENVIA-COTIZAR]    ✅ Carriers OK')

    // 2️⃣ PREPARAR ORIGEN (prioridad: secrets > frontend)
    console.log('[ENVIA-COTIZAR] 2️⃣ PREPARAR ORIGEN')
    let origen: Origen
    try {
      origen = buildOrigenFromEnv()
      console.log('[ENVIA-COTIZAR]    ✅ Origen desde SECRETS')
    } catch (secretErr) {
      console.warn('[ENVIA-COTIZAR]    ⚠️ Secrets no disponibles, usando frontend')
      if (origenFrontend?.nombre && origenFrontend?.calle) {
        origen = origenFrontend
        console.log('[ENVIA-COTIZAR]    ✅ Origen del frontend OK')
      } else {
        throw new Error('Origen requerido: ' + (secretErr as Error).message)
      }
    }
    console.log('[ENVIA-COTIZAR] ✅ Origen listo: ' + origen.nombre)

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
