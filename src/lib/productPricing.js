/** Formatea un número como moneda argentina (ARS), ej: "ARS $1.234,50" */
export function formatCurrency(amount) {
  const num = Number(amount) || 0
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
  return `ARS $${formatted}`
}

export function formatPrice(product) {
  return product.price_on_request ? 'Consultar precio' : formatCurrency(product.retail_price)
}

/** Producto "Disponible sin control de stock" — se ignora el número de stock. */
export function hasUnlimitedStock(product) {
  return Boolean(product.unlimited_stock)
}

/** Disponibilidad real de cara al cliente: unlimited_stock o stock > 0. */
export function isAvailable(product) {
  return hasUnlimitedStock(product) || product.stock > 0
}

export function isPurchasable(product) {
  return !product.price_on_request && isAvailable(product)
}

export function hasWholesale(product) {
  return product.wholesale_price != null
}

export function formatWholesalePrice(product) {
  return formatCurrency(product.wholesale_price)
}

export function isWholesalePurchasable(product) {
  return hasWholesale(product) && isAvailable(product)
}

const UNIT_DIMENSION_META = [
  { key: 'unit_height', label: 'Alto', unit: 'cm' },
  { key: 'unit_width', label: 'Ancho', unit: 'cm' },
  { key: 'unit_length', label: 'Largo', unit: 'cm' },
  { key: 'unit_weight', label: 'Peso', unit: 'kg' },
]

const DOZEN_DIMENSION_META = [
  { key: 'dozen_height', label: 'Alto', unit: 'cm' },
  { key: 'dozen_width', label: 'Ancho', unit: 'cm' },
  { key: 'dozen_length', label: 'Largo', unit: 'cm' },
  { key: 'dozen_weight', label: 'Peso', unit: 'kg' },
]

// Unit dimensions (retail)
export function hasUnitDimensions(product) {
  return UNIT_DIMENSION_META.some(({ key }) => product[key] != null)
}

export function getUnitDimensionEntries(product) {
  return UNIT_DIMENSION_META
    .filter(({ key }) => product[key] != null)
    .map(({ key, label, unit }) => ({ label, value: `${Number(product[key])} ${unit}` }))
}

export function formatUnitDimensions(product) {
  return getUnitDimensionEntries(product)
    .map(({ label, value }) => `${label}: ${value}`)
    .join(' · ')
}

// Dozen dimensions (wholesale)
export function hasDozenDimensions(product) {
  return DOZEN_DIMENSION_META.some(({ key }) => product[key] != null)
}

/** Devuelve solo las medidas cargadas, cada una con su etiqueta (Alto/Ancho/Largo/Peso) y unidad. */
export function getDozenDimensionEntries(product) {
  return DOZEN_DIMENSION_META
    .filter(({ key }) => product[key] != null)
    .map(({ key, label, unit }) => ({ label, value: `${Number(product[key])} ${unit}` }))
}

export function formatDozenDimensions(product) {
  return getDozenDimensionEntries(product)
    .map(({ label, value }) => `${label}: ${value}`)
    .join(' · ')
}
