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
