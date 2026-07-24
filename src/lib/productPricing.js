export function formatPrice(product) {
  return product.price_on_request ? 'Consultar precio' : `$${Number(product.retail_price).toFixed(2)}`
}

export function isPurchasable(product) {
  return !product.price_on_request && product.stock > 0
}

export function hasWholesale(product) {
  return product.wholesale_price != null
}

export function formatWholesalePrice(product) {
  return `$${Number(product.wholesale_price).toFixed(2)}`
}

export function isWholesalePurchasable(product) {
  return hasWholesale(product) && product.stock > 0
}

const DOZEN_DIMENSION_META = [
  { key: 'dozen_height', label: 'Alto', unit: 'cm' },
  { key: 'dozen_width', label: 'Ancho', unit: 'cm' },
  { key: 'dozen_length', label: 'Largo', unit: 'cm' },
  { key: 'dozen_weight', label: 'Peso', unit: 'kg' },
]

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
