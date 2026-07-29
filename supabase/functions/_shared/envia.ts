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
// 1. Carriers configurados por el usuario (env var)
// ──────────────────────────────────────────────────────────────

export function carriersActivosAR(): string[] {
  const carriersEnv = Deno.env.get('ENVIA_CARRIERS_ACTIVOS')
  if (!carriersEnv) {
    throw new Error(
      'ENVIA_CARRIERS_ACTIVOS environment variable not configured. ' +
      'Set it to a comma-separated list: "correo_argentino,oca,andreani"'
    )
  }

  const carriers = carriersEnv
    .split(',')
    .map(c => c.trim().toLowerCase())
    .filter(c => c.length > 0)

  console.log('[CARRIERS-ACTIVOS] Loaded from env:', carriers)

  if (carriers.length === 0) {
    throw new Error('ENVIA_CARRIERS_ACTIVOS is empty or invalid format')
  }

  return carriers
}

// ──────────────────────────────────────────────────────────────
// 2. Cotizar envío contra cada carrier
// Docs: https://docs.envia.com/docs/getting-started
// Endpoint: POST /ship/rate/
// ──────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = Deno.env.get(key)
  if (!value) throw new Error(`Missing required env: ${key}`)
  return value
}

export async function cotizarEnvio(
  paquete: Paquete,
  destino: Destino,
  carriers: string[]
): Promise<OpcionEnvio[]> {
  console.log('[COTIZAR-ENVIO] ========== INICIANDO COTIZACIÓN ==========')
  console.log('[COTIZAR-ENVIO] API_URL:', API_URL)
  console.log('[COTIZAR-ENVIO] API_TOKEN loaded:', !!API_TOKEN)
  console.log('[COTIZAR-ENVIO] Carriers a cotizar:', carriers)
  console.log('[COTIZAR-ENVIO] Paquete:', paquete)
  console.log('[COTIZAR-ENVIO] Destino:', destino)

  // Validar provincia destino
  const provincia = getProvinceByNombre(destino.provincia)
  if (!provincia) {
    console.error('[COTIZAR-ENVIO] Provincia no reconocida:', destino.provincia)
    throw new Error(`Provincia no reconocida: ${destino.provincia}`)
  }
  console.log('[COTIZAR-ENVIO] Código provincia destino:', provincia.code)

  // Leer datos del origen desde env vars
  console.log('[COTIZAR-ENVIO] Leyendo datos del origen desde env vars...')
  const origenNombre = requireEnv('ENVIA_ORIGEN_NOMBRE')
  const origenTelefono = requireEnv('ENVIA_ORIGEN_TELEFONO')
  const origenCalle = requireEnv('ENVIA_ORIGEN_CALLE')
  const origenNumero = requireEnv('ENVIA_ORIGEN_NUMERO')
  const origenCiudad = requireEnv('ENVIA_ORIGEN_CIUDAD')
  const origenCP = requireEnv('ENVIA_ORIGEN_CP')
  const origenProvincia = requireEnv('ENVIA_ORIGEN_PROVINCIA')
  const origenEmail = Deno.env.get('ENVIA_ORIGEN_EMAIL') || ''

  const origenProvCode = getProvinceByNombre(origenProvincia)
  if (!origenProvCode) {
    console.error('[COTIZAR-ENVIO] Provincia origen no válida:', origenProvincia)
    throw new Error(`Invalid origin province: ${origenProvincia}`)
  }

  console.log('[COTIZAR-ENVIO] Origen cargado:', {
    nombre: origenNombre,
    ciudad: origenCiudad,
    provincia: origenProvCode.code,
    cp: origenCP,
  })

  const endpoint = `${API_URL}/ship/rate/`
  console.log('[COTIZAR-ENVIO] Endpoint:', endpoint)

  const opciones: OpcionEnvio[] = []

  for (const carrier of carriers) {
    console.log(`\n[COTIZAR-ENVIO:${carrier}] Cotizando con ${carrier}...`)

    try {
      // Estructura según docs: https://docs.envia.com/docs/getting-started
      const body = {
        origin: {
          name: origenNombre,
          phone: origenTelefono,
          email: origenEmail,
          street: origenCalle,
          number: origenNumero,
          city: origenCiudad,
          state: origenProvCode.code,
          postalCode: origenCP,
          country: 'AR',
        },
        destination: {
          name: 'Destino', // placeholder
          phone: '',
          street: destino.ciudad, // placeholder - solo usamos city
          number: '1',
          city: destino.ciudad,
          state: provincia.code,
          postalCode: destino.codigoPostal,
          country: 'AR',
        },
        packages: [
          {
            type: 'box',
            weight: paquete.peso,
            dimensions: {
              height: paquete.alto,
              width: paquete.ancho,
              length: paquete.largo,
            },
          },
        ],
        shipment: {
          type: 1, // 1 = domiciliary
          carrier: carrier.toLowerCase(),
        },
      }

      console.log(`[COTIZAR-ENVIO:${carrier}] Request body:`, JSON.stringify(body, null, 2))

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(body),
      })

      console.log(`[COTIZAR-ENVIO:${carrier}] Response status: ${res.status}`)

      if (!res.ok) {
        const errText = await res.text()
        console.error(`[COTIZAR-ENVIO:${carrier}] Error (${res.status}):`, errText.substring(0, 500))
        continue // Skip this carrier, try next one
      }

      const responseBody = await res.json()
      console.log(`[COTIZAR-ENVIO:${carrier}] Response:`, JSON.stringify(responseBody, null, 2))

      const data = responseBody.data || []
      console.log(`[COTIZAR-ENVIO:${carrier}] Opciones recibidas: ${data.length}`)

      for (const option of data) {
        const opcion: OpcionEnvio = {
          carrier,
          service: option.service || 'standard',
          precio: parseFloat(option.totalPrice || option.price || '0'),
          dias: option.deliveryEstimate ? parseInt(option.deliveryEstimate) : undefined,
          dropOffDescription: option.serviceDescription,
          isBranch: option.serviceDescription?.toLowerCase().includes('branch') ?? false,
        }
        console.log(`[COTIZAR-ENVIO:${carrier}] Agregando opción:`, opcion)
        opciones.push(opcion)
      }
    } catch (err) {
      console.error(`[COTIZAR-ENVIO:${carrier}] Exception:`, {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  console.log('[COTIZAR-ENVIO] ========== RESULTADOS FINALES ==========')
  console.log('[COTIZAR-ENVIO] Total opciones encontradas:', opciones.length)
  console.log('[COTIZAR-ENVIO] Opciones:', opciones)

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
  nombre: string
  empresa?: string
  telefono: string
  email?: string
  calle: string
  numero: string
  ciudad: string
  provincia: string
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
    shipment: {
      carrier,
      service,
      origin: {
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
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`generarEnvio HTTP ${res.status}: ${err}`)
  }

  const response = (await res.json()) as Record<string, unknown>

  // Gotcha #9: HTTP 200 pero error adentro del body
  if (!response.shipmentId || !response.trackingNumber) {
    console.error('generarEnvio response:', response)
    throw new Error(
      `generarEnvio failed: no shipmentId/trackingNumber in response`
    )
  }

  return {
    shipmentId: String(response.shipmentId),
    trackingNumber: String(response.trackingNumber),
    labelUrl: String(response.labelUrl ?? ''),
    trackingUrl: String(response.trackingUrl ?? ''),
  }
}
