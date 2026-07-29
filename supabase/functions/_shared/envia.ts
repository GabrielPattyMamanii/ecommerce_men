// Envia.com shipping integration library
// Handles: checking active carriers, building packages, quoting, generating guides
// Ref: ENVIOS.md gotchas #1-9

import { SupabaseClient } from 'npm:@supabase/supabase-js@^2'
import { provinciaCodigoByNombre } from './provinciasArgentina.ts'

const ENVIA_TOKEN = Deno.env.get('ENVIA_API_TOKEN')!
const ENVIA_URL = (Deno.env.get('ENVIA_API_URL') || 'https://api.envia.com').replace(/\/$/, '')

function buildAuthHeader() {
  return { Authorization: `Bearer ${ENVIA_TOKEN}` }
}

// ── 1. Carriers conocidos en Argentina
// En lugar de hacer un endpoint que da 404, cotizamos contra carriers conocidos
// y dejamos que envia.com rechace los que no estén activos
const KNOWN_CARRIERS_AR = [
  'correo_argentino',
  'oca',
  'andreani',
  'bg_logistics',
  'tamse',
]

export async function carriersActivosAR(): Promise<string[]> {
  console.log('[CARRIERS-ACTIVOS] Using hardcoded carriers list (endpoint API era 404)')
  console.log(`[CARRIERS-ACTIVOS] Will attempt to quote with: ${KNOWN_CARRIERS_AR.join(', ')}`)
  return KNOWN_CARRIERS_AR
}

// ── 2. Package builder: sum weights, get max dimensions
interface PackageItem {
  productId: string
  qty: number
  weight_kg?: number
  height_cm?: number
  width_cm?: number
  length_cm?: number
}

export interface Package {
  weight: number
  height: number
  width: number
  length: number
}

export async function armarPaquete(
  items: Array<{ productId: string; qty: number }>,
  supabaseAdmin: SupabaseClient,
): Promise<Package | { error: string; productId?: string }> {
  console.log('[ARMAR-PAQUETE] Building package from items:', JSON.stringify(items))
  const productIds = [...new Set(items.map(i => i.productId))]
  console.log('[ARMAR-PAQUETE] Unique product IDs:', productIds)

  console.log('[ARMAR-PAQUETE] Querying products from Supabase...')
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, weight_kg, height_cm, width_cm, length_cm')
    .in('id', productIds)

  if (error) {
    console.error('[ARMAR-PAQUETE] Supabase query error:', error)
    throw error
  }

  console.log('[ARMAR-PAQUETE] Products returned:', JSON.stringify(products))
  const productMap = Object.fromEntries(products.map((p: any) => [p.id, p]))

  let totalWeight = 0
  let maxHeight = 0
  let maxWidth = 0
  let totalLength = 0

  for (const item of items) {
    const product = productMap[item.productId]
    console.log(`[ARMAR-PAQUETE] Checking product ${item.productId}:`, product)

    if (!product) {
      console.error(`[ARMAR-PAQUETE] Product ${item.productId} not found in database`)
      return { error: 'FALTA_PESO', productId: item.productId }
    }

    if (!product.weight_kg) {
      console.error(`[ARMAR-PAQUETE] Product ${item.productId} has no weight_kg`)
      return { error: 'FALTA_PESO', productId: item.productId }
    }

    totalWeight += (product.weight_kg || 0) * item.qty
    maxHeight = Math.max(maxHeight, product.height_cm || 0)
    maxWidth = Math.max(maxWidth, product.width_cm || 0)
    totalLength += (product.length_cm || 0) * item.qty
  }

  const finalPackage = {
    weight: Math.max(0.1, totalWeight),
    height: Math.max(1, maxHeight),
    width: Math.max(1, maxWidth),
    length: Math.max(1, totalLength),
  }
  console.log('[ARMAR-PAQUETE] Final package:', finalPackage)

  return finalPackage
}

// ── 3. Quote against each active carrier
interface Destination {
  street: string
  number: string
  city: string
  province: string // provincia completa (ej. "Buenos Aires")
  postalCode: string
}

export interface QuoteOption {
  carrier: string
  service: string
  serviceDescription: string
  price: number
  currency: string
  estimatedDays: number
  dropOffType: 'Delivery' | 'Branch'
}

export async function cotizarEnvio(
  paquete: Package,
  destino: Destination,
): Promise<QuoteOption[]> {
  console.log('[COTIZAR-ENVIO] Starting quote process...')
  console.log('[COTIZAR-ENVIO] Paquete:', paquete)
  console.log('[COTIZAR-ENVIO] Destino:', destino)

  console.log('[COTIZAR-ENVIO] Building origin from environment secrets...')
  const origen = buildOrigenFromEnv()
  console.log('[COTIZAR-ENVIO] Origin loaded:', {
    ciudad: origen.ciudad,
    provincia: origen.provincia,
    cp: origen.cp,
    calle: origen.calle,
    numero: origen.numero,
  })

  const origenProvinceCode = provinciaCodigoByNombre(origen.provincia)
  if (!origenProvinceCode) {
    console.error(`[COTIZAR-ENVIO] Invalid origin province: ${origen.provincia}`)
    throw new Error(`Invalid origin province in secrets: ${origen.provincia}`)
  }

  console.log('[COTIZAR-ENVIO] Fetching active carriers...')
  const carriers = await carriersActivosAR()
  console.log(`[COTIZAR-ENVIO] Active carriers: ${carriers.join(', ')}`)

  if (!carriers.length) {
    console.error('[COTIZAR-ENVIO] No carriers active in account!')
    throw new Error('No carriers active in account')
  }

  console.log(`[COTIZAR-ENVIO] Converting destination province "${destino.province}" to code...`)
  const destinoProvinceCode = provinciaCodigoByNombre(destino.province)
  if (!destinoProvinceCode) {
    console.error(`[COTIZAR-ENVIO] Unknown destination province: ${destino.province}`)
    throw new Error(`Unknown destination province: ${destino.province}`)
  }
  console.log(`[COTIZAR-ENVIO] Destination province code: ${destinoProvinceCode}`)

  const quotes: QuoteOption[] = []

  for (const carrier of carriers) {
    console.log(`[COTIZAR-ENVIO] Quoting carrier: ${carrier}`)

    const body = {
      shipment: {
        carrier,
        origin: {
          country: 'AR',
          state: origenProvinceCode,
          city: origen.ciudad,
          postalCode: origen.cp,
          street: origen.calle,
          number: origen.numero,
        },
        destination: {
          country: 'AR',
          state: destinoProvinceCode,
          city: destino.city,
          postalCode: destino.postalCode,
          street: destino.street,
          number: destino.number,
        },
        package: {
          weight: paquete.weight,
          height: paquete.height,
          width: paquete.width,
          length: paquete.length,
        },
      },
      settings: { currency: 'ARS' },
    }

    console.log(`[COTIZAR-ENVIO] Request body for ${carrier}:`, JSON.stringify(body))

    try {
      console.log(`[COTIZAR-ENVIO] Sending POST to ${ENVIA_URL}/v2/ship/rate/`)
      const res = await fetch(`${ENVIA_URL}/v2/ship/rate/`, {
        method: 'POST',
        headers: { ...buildAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      console.log(`[COTIZAR-ENVIO] Response status for ${carrier}: ${res.status}`)

      if (!res.ok) {
        const errText = await res.text()
        console.warn(`[COTIZAR-ENVIO] Quote failed for ${carrier}: ${res.status} - ${errText}`)
        continue
      }

      const data = await res.json()
      console.log(`[COTIZAR-ENVIO] Response data for ${carrier}:`, JSON.stringify(data))

      const rates = data.data || []
      console.log(`[COTIZAR-ENVIO] Got ${rates.length} rates for ${carrier}`)

      for (const rate of rates) {
        const dropOffParts = (rate.dropOffDescription || '').split(' - ')
        const dropOffType = dropOffParts[1] === 'Branch' ? 'Branch' : 'Delivery'

        const quote = {
          carrier,
          service: rate.service,
          serviceDescription: rate.dropOffDescription,
          price: parseFloat(rate.rate),
          currency: 'ARS',
          estimatedDays: rate.deliveryEstimate,
          dropOffType: dropOffType as 'Delivery' | 'Branch',
        }
        console.log(`[COTIZAR-ENVIO] Adding quote:`, quote)
        quotes.push(quote)
      }
    } catch (err) {
      console.error(`[COTIZAR-ENVIO] Error quoting ${carrier}:`, {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  console.log(`[COTIZAR-ENVIO] Final quotes: ${quotes.length} options`)
  return quotes.sort((a, b) => a.price - b.price)
}

// ── 4. Get available branches for a specific carrier/zip (Branch services)
export interface Sucursal {
  codigo: string
  nombre: string
  direccion: string
}

export async function sucursalesDisponibles(
  carrier: string,
  postalCode: string,
  province: string,
): Promise<Sucursal[]> {
  const provinceCode = provinciaCodigoByNombre(province)
  if (!provinceCode) throw new Error(`Unknown province: ${province}`)

  const res = await fetch(
    `${ENVIA_URL}/v2/branches/?carrier=${carrier}&state=${provinceCode}&zipcode=${postalCode}`,
    { headers: buildAuthHeader() },
  )

  if (!res.ok) {
    console.warn(`Branches fetch failed: ${res.status}`)
    return []
  }

  const data = await res.json()
  const branches = (data.data || [])
    .filter((b: any) => {
      // Filter by postal code client-side (envia zipcode filter is unreliable — gotcha #6)
      const branchZip = b.address?.postalCode?.replace(/\D/g, '') // strip non-digits
      const queryZip = postalCode.replace(/\D/g, '')
      return branchZip === queryZip || !queryZip
    })
    .map((b: any) => ({
      codigo: b.id,
      nombre: b.name,
      direccion: `${b.address?.street || ''} ${b.address?.number || ''}, ${b.address?.city || ''}`,
    }))

  return branches
}

// ── 5. Generate actual shipping guide (spends balance)
export interface OrigenEnvio {
  nombre: string
  empresa?: string
  telefono: string
  email?: string
  calle: string
  numero: string
  ciudad: string
  provincia: string
  cp: string
}

function buildOrigenFromEnv(): OrigenEnvio {
  const requireEnv = (key: string): string => {
    const value = Deno.env.get(key)
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value
  }

  return {
    nombre: requireEnv('ENVIA_ORIGEN_NOMBRE'),
    empresa: Deno.env.get('ENVIA_ORIGEN_EMPRESA'),
    telefono: requireEnv('ENVIA_ORIGEN_TELEFONO'),
    email: Deno.env.get('ENVIA_ORIGEN_EMAIL'),
    calle: requireEnv('ENVIA_ORIGEN_CALLE'),
    numero: requireEnv('ENVIA_ORIGEN_NUMERO'),
    ciudad: requireEnv('ENVIA_ORIGEN_CIUDAD'),
    provincia: requireEnv('ENVIA_ORIGEN_PROVINCIA'),
    cp: requireEnv('ENVIA_ORIGEN_CP'),
  }
}

export async function generarEnvio(
  carrier: string,
  service: string,
  paquete: Package,
  destino: Destination,
  destinatarioEmail: string,
  sucursalCodigo?: string,
): Promise<{
  trackingNumber: string
  trackingUrl: string
  labelUrl: string
}> {
  const origen = buildOrigenFromEnv()

  const origenProvinceCode = provinciaCodigoByNombre(origen.provincia)
  if (!origenProvinceCode) throw new Error(`Invalid origin province: ${origen.provincia}`)

  const destinoProvinceCode = provinciaCodigoByNombre(destino.province)
  if (!destinoProvinceCode) throw new Error(`Unknown destination province: ${destino.province}`)

  const body = {
    shipment: {
      carrier,
      service,
      origin: {
        country: 'AR',
        state: origenProvinceCode,
        city: origen.ciudad,
        postalCode: origen.cp,
        street: origen.calle,
        number: origen.numero,
        name: origen.nombre,
        phone: origen.telefono,
        email: origen.email,
      },
      destination: {
        country: 'AR',
        state: destinoProvinceCode,
        city: destino.city,
        postalCode: destino.postalCode,
        street: destino.street,
        number: destino.number,
        email: destinatarioEmail,
      },
      package: {
        weight: paquete.weight,
        height: paquete.height,
        width: paquete.width,
        length: paquete.length,
      },
      ...(sucursalCodigo && { branchCode: sucursalCodigo }),
    },
    settings: {
      currency: 'ARS',
      printFormat: 'PDF',
      printSize: 'PAPER_4X6',
    },
  }

  const res = await fetch(`${ENVIA_URL}/v2/ship/generate/`, {
    method: 'POST',
    headers: { ...buildAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Generate failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()

  // Gotcha #9: /ship/generate can return 200 with error inside body
  if (!data.data?.trackingNumber) {
    throw new Error(
      `No tracking number in response: ${JSON.stringify(data)}`,
    )
  }

  return {
    trackingNumber: data.data.trackingNumber,
    trackingUrl: data.data.trackingUrl || '',
    labelUrl: data.data.labelUrl || '',
  }
}
