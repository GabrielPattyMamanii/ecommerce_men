<<<<<<< HEAD
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

// ── 1. Fetch active carriers from envia.com account
export async function carriersActivosAR(): Promise<string[]> {
  console.log('[CARRIERS-ACTIVOS] Fetching active carriers from envia.com...')
  console.log('[CARRIERS-ACTIVOS] DEBUG: ENVIA_API_URL:', ENVIA_URL)
  console.log('[CARRIERS-ACTIVOS] DEBUG: ENVIA_API_TOKEN loaded:', !!ENVIA_TOKEN)
  console.log('[CARRIERS-ACTIVOS] DEBUG: ENVIA_API_TOKEN preview:', ENVIA_TOKEN?.substring(0, 30) + '...')

  try {
    // Attempt to get carriers from account endpoint
    const url1 = `${ENVIA_URL}/v2/me/carriers`
    console.log('[CARRIERS-ACTIVOS] Attempting GET:', url1)
    const res = await fetch(url1, {
      method: 'GET',
      headers: buildAuthHeader(),
    })

    console.log(`[CARRIERS-ACTIVOS] /v2/me/carriers response status: ${res.status}`)

    if (res.ok) {
      const data = await res.json()
      console.log('[CARRIERS-ACTIVOS] Response data:', JSON.stringify(data))

      const carriers = data.data?.map((c: any) => c.id || c.name || c.code)?.filter(Boolean) || []
      console.log(`[CARRIERS-ACTIVOS] Parsed carriers: ${carriers.join(', ')}`)

      if (carriers.length === 0) {
        console.warn('[CARRIERS-ACTIVOS] API returned empty carrier list')
      }
      return carriers
    }

    // If /v2/me/carriers fails, try /v2/carriers
    const url2 = `${ENVIA_URL}/v2/carriers`
    console.log('[CARRIERS-ACTIVOS] /v2/me/carriers failed, trying:', url2)
    const altRes = await fetch(url2, {
      method: 'GET',
      headers: buildAuthHeader(),
    })

    console.log(`[CARRIERS-ACTIVOS] /v2/carriers response status: ${altRes.status}`)

    if (altRes.ok) {
      const altData = await altRes.json()
      console.log('[CARRIERS-ACTIVOS] /v2/carriers response:', JSON.stringify(altData))

      const carriers = altData.data?.map((c: any) => c.id || c.name || c.code)?.filter(Boolean) || []
      console.log(`[CARRIERS-ACTIVOS] Parsed carriers from /v2/carriers: ${carriers.join(', ')}`)

      if (carriers.length === 0) {
        console.warn('[CARRIERS-ACTIVOS] /v2/carriers returned empty list')
      }
      return carriers
    }

    // Try /v2/account/carriers as third attempt
    const url3 = `${ENVIA_URL}/v2/account/carriers`
    console.log('[CARRIERS-ACTIVOS] Both previous endpoints failed, trying:', url3)
    const url3Res = await fetch(url3, {
      method: 'GET',
      headers: buildAuthHeader(),
    })

    console.log(`[CARRIERS-ACTIVOS] /v2/account/carriers response status: ${url3Res.status}`)

    if (url3Res.ok) {
      const url3Data = await url3Res.json()
      console.log('[CARRIERS-ACTIVOS] /v2/account/carriers response:', JSON.stringify(url3Data))

      const carriers = url3Data.data?.map((c: any) => c.id || c.name || c.code)?.filter(Boolean) || []
      console.log(`[CARRIERS-ACTIVOS] Parsed carriers from /v2/account/carriers: ${carriers.join(', ')}`)

      if (carriers.length === 0) {
        console.warn('[CARRIERS-ACTIVOS] /v2/account/carriers returned empty list')
      }
      return carriers
    }

    // All endpoints failed
    const errText1 = await res.text()
    const errText2 = await altRes.text()
    const errText3 = await url3Res.text()
    console.error('[CARRIERS-ACTIVOS] All three endpoints failed')
    console.error(`[CARRIERS-ACTIVOS] /v2/me/carriers: ${res.status} - ${errText1}`)
    console.error(`[CARRIERS-ACTIVOS] /v2/carriers: ${altRes.status} - ${errText2}`)
    console.error(`[CARRIERS-ACTIVOS] /v2/account/carriers: ${url3Res.status} - ${errText3}`)

    throw new Error(
      `Cannot fetch active carriers. /v2/me/carriers (${res.status}), /v2/carriers (${altRes.status}). ` +
      `Verify ENVIA_API_TOKEN is valid and carriers are configured in envia.com dashboard.`
    )
  } catch (err) {
    console.error('[CARRIERS-ACTIVOS] Error fetching carriers:', {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
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
=======
// envia.ts — Lógica de integración con envia.com
// Cotización, generación de guías, sucursales
// Porto de api/_lib/envia.js de GUIA-ENVIOS.md, adaptado a Deno

import { getProvinceByNombre, buildCPACode } from './provinciasArgentina.ts'

interface Paquete {
  peso: number // kg
  alto: number // cm
  ancho: number // cm
  largo: number // cm
}

interface Destino {
  ciudad: string
  provincia: string // nombre completo
  codigoPostal: string // numérico, sin letra
}

interface OpcionEnvio {
  carrier: string
  service: string
  precio: number
  dias?: number
  dropOffDescription?: string // "Door", "Branch", etc
  isBranch?: boolean
}

interface Sucursal {
  codigo: string
  nombre: string
  address: {
    address: string
    city: string
    state: string
    postalCode: number
  }
}

const API_TOKEN = Deno.env.get('ENVIA_API_TOKEN')
const API_URL = Deno.env.get('ENVIA_API_URL') ?? 'https://api.envia.com'

if (!API_TOKEN) {
  throw new Error('ENVIA_API_TOKEN env var not set')
}

// ──────────────────────────────────────────────────────────────
// 1. Consultar carriers activos
// ──────────────────────────────────────────────────────────────

export async function carriersActivosAR(): Promise<string[]> {
  const res = await fetch(`${API_URL}/v3/carriers/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`carriersActivosAR failed: ${res.status} ${err}`)
  }

  const { data } = (await res.json()) as { data: { name: string }[] }
  return data.map(c => c.name)
}

// ──────────────────────────────────────────────────────────────
// 2. Cotizar envío contra cada carrier
// ──────────────────────────────────────────────────────────────

export async function cotizarEnvio(
  paquete: Paquete,
  destino: Destino,
  carriers: string[]
): Promise<OpcionEnvio[]> {
  const provincia = getProvinceByNombre(destino.provincia)
  if (!provincia) throw new Error(`Provincia no reconocida: ${destino.provincia}`)

  // Gotcha #4: state = 2-letter code (BA, FM, etc)
  // Gotcha #1: URLs with trailing slash
  const baseUrl = `${API_URL}/v3/ship/rate/`.replace(/\/$/, '') + '/'

  const opciones: OpcionEnvio[] = []

  for (const carrier of carriers) {
    try {
      const body = {
        shipment: {
          carrier,
          origin: {
            // Origin is configured via env vars (ver envia-generar-guia)
            state: 'BA', // default Buenos Aires (el user va a completar su provincia)
          },
          destination: {
            // Gotcha #3: number separado de street
            street: destino.ciudad,
            number: '1', // placeholder, se reemplaza en generar-guia
            state: provincia.code,
            postalCode: destino.codigoPostal, // sin letra CPA
            country: 'AR',
          },
          shipment: {
            weight: paquete.peso,
            dimensions: {
              height: paquete.alto,
              width: paquete.ancho,
              length: paquete.largo,
            },
          },
        },
        // Gotcha #5: settings siempre obligatorio
        settings: {
          currency: 'ARS',
        },
      }

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        console.warn(`Carrier ${carrier} failed: ${res.status}`)
        continue
      }

      const { data } = (await res.json()) as {
        data: Array<{
          service: string
          price: number
          deliveryEstimate?: number
          dropOffDescription?: string
        }>
      }

      // Agregar las opciones de este carrier a la lista
      for (const option of data) {
        opciones.push({
          carrier,
          service: option.service,
          precio: option.price,
          dias: option.deliveryEstimate,
          dropOffDescription: option.dropOffDescription,
          isBranch: option.dropOffDescription?.includes('Branch') ?? false,
        })
      }
    } catch (err) {
      console.error(`Error cotizando con ${carrier}:`, err)
    }
  }

  // Ordenar por precio (más barato primero)
  opciones.sort((a, b) => a.precio - b.precio)
  return opciones
}

// ──────────────────────────────────────────────────────────────
// 3. Buscar sucursales disponibles
// ──────────────────────────────────────────────────────────────

export async function sucursalesDisponibles(
  carrier: string,
  codigoPostal: string,
  provincia: string
): Promise<Sucursal[]> {
  const prov = getProvinceByNombre(provincia)
  if (!prov) throw new Error(`Provincia no reconocida: ${provincia}`)

  // Gotcha #6: endpoint devuelve array directo, no wrapped en { data: [...] }
  // Gotcha #6b: el filtro zipcode server-side no es confiable, filtrar client-side
  const url = `${API_URL}/v3/branches/?carrier=${encodeURIComponent(carrier)}&zipcode=${codigoPostal}`.replace(
    /\/$/, ''
  )

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  })

  if (!res.ok) {
    throw new Error(`sucursalesDisponibles failed: ${res.status}`)
  }

  const branches = (await res.json()) as Sucursal[]

  // Filtrar client-side: solo las del código postal (sin letra CPA)
  // address.postalCode viene como número plano
  const numCodigoPostal = parseInt(codigoPostal, 10)
  return branches.filter(b => b.address.postalCode === numCodigoPostal)
}

// ──────────────────────────────────────────────────────────────
// 4. Generar envío (guía real)
// ──────────────────────────────────────────────────────────────

interface OrigenData {
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
  nombre: string
  empresa?: string
  telefono: string
  email?: string
  calle: string
  numero: string
  ciudad: string
  provincia: string
<<<<<<< HEAD
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
=======
  cp: string // numérico
}

interface DestinatarioData {
  nombre: string
  email?: string
  telefono: string
  calle: string
  numero: string
  ciudad: string
  provincia: string
  cp: string // numérico
  branchCode?: string // si es "a Sucursal"
}

export async function generarEnvio(
  paquete: Paquete,
  carrier: string,
  service: string,
  origen: OrigenData,
  destinatario: DestinatarioData
): Promise<{
  shipmentId: string
  trackingNumber: string
  labelUrl: string
  trackingUrl: string
}> {
  const oriProv = getProvinceByNombre(origen.provincia)
  const destProv = getProvinceByNombre(destinatario.provincia)

  if (!oriProv || !destProv) {
    throw new Error('Provincia no válida en origen o destino')
  }

  const url = `${API_URL}/v3/ship/generate/`.replace(/\/$/, '') + '/'

  const body: Record<string, unknown> = {
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
    shipment: {
      carrier,
      service,
      origin: {
<<<<<<< HEAD
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
=======
        name: origen.nombre,
        company: origen.empresa || origen.nombre,
        phone: origen.telefono,
        email: origen.email || '',
        street: origen.calle,
        number: origen.numero,
        city: origen.ciudad,
        state: oriProv.code,
        postalCode: origen.cp,
        country: 'AR',
      },
      destination: {
        name: destinatario.nombre,
        phone: destinatario.telefono,
        email: destinatario.email || '',
        street: destinatario.calle,
        number: destinatario.numero,
        city: destinatario.ciudad,
        state: destProv.code,
        postalCode: destinatario.cp,
        country: 'AR',
        // Gotcha #7: si es "a Sucursal", requerido código de sucursal
        ...(destinatario.branchCode && { branchCode: destinatario.branchCode }),
      },
      shipment: {
        weight: paquete.peso,
        dimensions: {
          height: paquete.alto,
          width: paquete.ancho,
          length: paquete.largo,
        },
      },
    },
    // Gotcha #5: settings obligatorio; Gotcha #9: printFormat/printSize para generar etiqueta
    settings: {
      currency: 'ARS',
      printFormat: 'PDF',
      printSize: 'PAPER_4X6', // impresora térmica estándar
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
    body: JSON.stringify(body),
  })

  if (!res.ok) {
<<<<<<< HEAD
    throw new Error(`Generate failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()

  // Gotcha #9: /ship/generate can return 200 with error inside body
  if (!data.data?.trackingNumber) {
    throw new Error(
      `No tracking number in response: ${JSON.stringify(data)}`,
=======
    const err = await res.text()
    throw new Error(`generarEnvio HTTP ${res.status}: ${err}`)
  }

  const response = (await res.json()) as Record<string, unknown>

  // Gotcha #9: HTTP 200 pero error adentro del body
  if (!response.shipmentId || !response.trackingNumber) {
    console.error('generarEnvio response:', response)
    throw new Error(
      `generarEnvio failed: no shipmentId/trackingNumber in response`
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
    )
  }

  return {
<<<<<<< HEAD
    trackingNumber: data.data.trackingNumber,
    trackingUrl: data.data.trackingUrl || '',
    labelUrl: data.data.labelUrl || '',
=======
    shipmentId: String(response.shipmentId),
    trackingNumber: String(response.trackingNumber),
    labelUrl: String(response.labelUrl ?? ''),
    trackingUrl: String(response.trackingUrl ?? ''),
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
  }
}
