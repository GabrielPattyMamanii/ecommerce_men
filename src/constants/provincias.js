// Lista de provincias argentinas con códigos de 2 letras para envia.com
// Nota: CABA usa código "CABA" para coincidir con API de envia.com
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

export function provinciaCodigoByNombre(nombre) {
  const found = PROVINCIAS.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())
  return found?.codigo || ''
}

export function provinciaNombreByCodigo(codigo) {
  const found = PROVINCIAS.find(p => p.codigo === codigo.toUpperCase())
  return found?.nombre || ''
}
