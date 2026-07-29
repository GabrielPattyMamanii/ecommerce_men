import { getProvinceByNombre } from './provinciasArgentina.ts'

interface OpcionEnvio {
  carrier: string
  service: string
  precio: number
  dias?: number
  dropOffDescription?: string
  isBranch?: boolean
}

const API_TOKEN = Deno.env.get('ENVIA_API_TOKEN')
const API_URL = 'https://api.envia.com'

if (!API_TOKEN) {
  throw new Error('[COTIZAR] ENVIA_API_TOKEN not configured in Supabase Secrets')
}

export interface Origen {
  nombre: string
  telefono: string
  email?: string
  calle: string
  numero: string
  ciudad: string
  provincia: string
  cp: string
}

export interface Destino {
  calle?: string
  numero?: string
  ciudad: string
  provincia: string
  codigoPostal: string
}

export interface Paquete {
  peso: number
  alto: number
  ancho: number
  largo: number
}

export async function cotizarEnvio(
  origen: Origen,
  destino: Destino,
  paquete: Paquete,
  carriers: string[]
): Promise<OpcionEnvio[]> {
  console.log('[COTIZAR] Iniciando cotización')
  console.log('[COTIZAR] Origen:', origen.ciudad, origen.provincia)
  console.log('[COTIZAR] Destino:', destino.ciudad, destino.provincia)
  console.log('[COTIZAR] Carriers:', carriers)

  const origenProv = getProvinceByNombre(origen.provincia)
  const destinoProv = getProvinceByNombre(destino.provincia)

  if (!origenProv || !destinoProv) {
    throw new Error('Provincia inválida en origen o destino')
  }

  console.log(`[COTIZAR] Origen province code: ${origenProv.code}`)
  console.log(`[COTIZAR] Destino province code: ${destinoProv.code}`)

  const opciones: OpcionEnvio[] = []
  const endpoint = `${API_URL}/ship/rate/`

  for (const carrier of carriers) {
    console.log(`[COTIZAR:${carrier}] Cotizando...`)

    try {
      const body = {
        origin: {
          name: origen.nombre,
          phone: origen.telefono,
          email: origen.email || '',
          street: origen.calle,
          number: origen.numero,
          city: origen.ciudad,
          state: origenProv.code,
          postalCode: origen.cp,
          country: 'AR',
        },
        destination: {
          name: 'Destinatario',
          phone: '0000000000',
          street: destino.calle || destino.ciudad,
          number: destino.numero || '1',
          city: destino.ciudad,
          state: destinoProv.code,
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
          type: 1,
          carrier: carrier.toLowerCase(),
        },
      }

      console.log(`[COTIZAR:${carrier}] Body a enviar:`, JSON.stringify(body, null, 2))

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(body),
      })

      console.log(`[COTIZAR:${carrier}] Status: ${res.status}`)

      if (!res.ok) {
        const err = await res.text()
        console.error(`[COTIZAR:${carrier}] HTTP Error ${res.status}: ${err.substring(0, 300)}`)
        continue
      }

      const jsonResp = await res.json()
      console.log(`[COTIZAR:${carrier}] Response completo:`, JSON.stringify(jsonResp, null, 2))
      const { data } = jsonResp

      for (const opt of data || []) {
        opciones.push({
          carrier,
          service: opt.service || 'standard',
          precio: parseFloat(opt.totalPrice || 0),
          dias: opt.deliveryEstimate,
          dropOffDescription: opt.serviceDescription,
          isBranch: opt.serviceDescription?.includes('Branch') ?? false,
        })
      }

      console.log(`[COTIZAR:${carrier}] OK: ${(data || []).length} opciones`)
    } catch (err) {
      console.error(`[COTIZAR:${carrier}] Exception:`, err)
    }
  }

  console.log('[COTIZAR] Total opciones:', opciones.length)
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
