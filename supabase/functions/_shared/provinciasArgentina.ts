<<<<<<< HEAD
// Mapeo de provincias argentinas a códigos de 2 letras (envia.com state codes)
// Distinto del código CPA postal (ej: "B1772" = Buenos Aires, pero state = "BA")
// Ref: gotcha #4 de ENVIOS.md

export const PROVINCIAS = [
  { nombre: 'Buenos Aires', codigo: 'BA' },
  { nombre: 'CABA', codigo: 'CABA' },
  { nombre: 'Catamarca', codigo: 'CT' },
  { nombre: 'Chaco', codigo: 'CC' },
  { nombre: 'Chubut', codigo: 'CH' },
  { nombre: 'Córdoba', codigo: 'CB' },
  { nombre: 'Corrientes', codigo: 'CR' },
  { nombre: 'Entre Ríos', codigo: 'ER' },
  { nombre: 'Formosa', codigo: 'FM' },
  { nombre: 'Jujuy', codigo: 'JY' },
  { nombre: 'La Pampa', codigo: 'LP' },
  { nombre: 'La Rioja', codigo: 'LR' },
  { nombre: 'Mendoza', codigo: 'MZ' },
  { nombre: 'Misiones', codigo: 'MS' },
  { nombre: 'Neuquén', codigo: 'NQ' },
  { nombre: 'Río Negro', codigo: 'RN' },
  { nombre: 'Salta', codigo: 'SA' },
  { nombre: 'San Juan', codigo: 'SJ' },
  { nombre: 'San Luis', codigo: 'SL' },
  { nombre: 'Santa Cruz', codigo: 'SC' },
  { nombre: 'Santa Fe', codigo: 'SF' },
  { nombre: 'Santiago del Estero', codigo: 'SE' },
  { nombre: 'Tierra del Fuego', codigo: 'TF' },
  { nombre: 'Tucumán', codigo: 'TM' },
]

export function provinciaCodigoByNombre(nombre: string): string {
  const found = PROVINCIAS.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())
  return found?.codigo || ''
}

export function provinciaNombreByCodigo(codigo: string): string {
  const found = PROVINCIAS.find(p => p.codigo === codigo.toUpperCase())
  return found?.nombre || ''
=======
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
>>>>>>> 2cc3d23ee0a8a80c9b3d3a6cd2fb909978d48e70
}
