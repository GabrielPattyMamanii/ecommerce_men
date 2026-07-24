// Mapeo de provincias argentinas: nombre completo ↔ códigos de 2 letras
// Para el campo `state` de origin/destination en envia.com (gotcha #4 de GUIA-ENVIOS.md)

export const PROVINCIAS_ARGENTINA = [
  { nombre: 'Buenos Aires', code: 'BA', cpaLetter: 'B' },
  { nombre: 'Catamarca', code: 'CA', cpaLetter: 'K' },
  { nombre: 'Chaco', code: 'CC', cpaLetter: 'H' },
  { nombre: 'Chubut', code: 'CH', cpaLetter: 'U' },
  { nombre: 'Ciudad Autónoma de Buenos Aires', code: 'CABA', cpaLetter: 'C' },
  { nombre: 'Corrientes', code: 'CR', cpaLetter: 'W' },
  { nombre: 'Entre Ríos', code: 'ER', cpaLetter: 'E' },
  { nombre: 'Formosa', code: 'FM', cpaLetter: 'F' },
  { nombre: 'Jujuy', code: 'JY', cpaLetter: 'Y' },
  { nombre: 'La Pampa', code: 'LP', cpaLetter: 'L' },
  { nombre: 'La Rioja', code: 'LR', cpaLetter: 'F' },
  { nombre: 'Mendoza', code: 'MZ', cpaLetter: 'M' },
  { nombre: 'Misiones', code: 'MI', cpaLetter: 'N' },
  { nombre: 'Neuquén', code: 'NQ', cpaLetter: 'Q' },
  { nombre: 'Río Negro', code: 'RN', cpaLetter: 'R' },
  { nombre: 'Salta', code: 'SA', cpaLetter: 'A' },
  { nombre: 'San Juan', code: 'SJ', cpaLetter: 'J' },
  { nombre: 'San Luis', code: 'SL', cpaLetter: 'D' },
  { nombre: 'Santa Cruz', code: 'SC', cpaLetter: 'Z' },
  { nombre: 'Santa Fe', code: 'SF', cpaLetter: 'S' },
  { nombre: 'Santiago del Estero', code: 'SE', cpaLetter: 'G' },
  { nombre: 'Tierra del Fuego', code: 'TF', cpaLetter: 'V' },
  { nombre: 'Tucumán', code: 'TM', cpaLetter: 'T' },
]

export function getProvinceByNombre(nombre: string) {
  return PROVINCIAS_ARGENTINA.find(
    p => p.nombre.toLowerCase() === nombre.toLowerCase()
  )
}

export function getProvinceByCode(code: string) {
  return PROVINCIAS_ARGENTINA.find(
    p => p.code.toUpperCase() === code.toUpperCase()
  )
}

// Genera código postal CPA (letra + 4 dígitos) a partir de número sin letra
// Ejemplo: `1772` + `B` → `B1772`
export function buildCPACode(postalCode: string, provincia: string): string {
  const p = getProvinceByNombre(provincia)
  if (!p) throw new Error(`Provincia no reconocida: ${provincia}`)
  return `${p.cpaLetter}${postalCode}`
}
