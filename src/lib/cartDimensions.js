/**
 * Utilidades para verificar y trabajar con dimensiones en el carrito
 */

/**
 * Obtiene las dimensiones de un ítem del carrito
 * @param {Object} cartItem - Ítem del carrito con campo dimensions
 * @returns {Object|null} Objeto de dimensiones o null si no existen
 */
export function getItemDimensions(cartItem) {
  return cartItem.dimensions || null
}

/**
 * Verifica si un ítem del carrito tiene dimensiones cargadas
 * @param {Object} cartItem - Ítem del carrito
 * @returns {boolean}
 */
export function hasItemDimensions(cartItem) {
  if (!cartItem.dimensions) return false

  if (cartItem.type === 'retail') {
    return !!(
      cartItem.dimensions.weight_kg ||
      cartItem.dimensions.height_cm ||
      cartItem.dimensions.width_cm ||
      cartItem.dimensions.length_cm
    )
  }

  if (cartItem.type === 'wholesale') {
    return !!(
      cartItem.dimensions.dozen_height ||
      cartItem.dimensions.dozen_width ||
      cartItem.dimensions.dozen_length ||
      cartItem.dimensions.dozen_weight
    )
  }

  return false
}

/**
 * Formatea las dimensiones para mostrar
 * @param {Object} dimensions - Objeto de dimensiones
 * @param {string} type - 'retail' o 'wholesale'
 * @returns {string} Texto formateado
 */
export function formatDimensions(dimensions, type) {
  if (!dimensions) return '—'

  if (type === 'retail') {
    const parts = []
    if (dimensions.weight_kg) parts.push(`${dimensions.weight_kg} kg`)
    if (dimensions.height_cm) parts.push(`${dimensions.height_cm} cm alto`)
    if (dimensions.width_cm) parts.push(`${dimensions.width_cm} cm ancho`)
    if (dimensions.length_cm) parts.push(`${dimensions.length_cm} cm largo`)
    return parts.length > 0 ? parts.join(' • ') : '—'
  }

  if (type === 'wholesale') {
    const parts = []
    if (dimensions.dozen_weight) parts.push(`${dimensions.dozen_weight} kg`)
    if (dimensions.dozen_height) parts.push(`${dimensions.dozen_height} cm alto`)
    if (dimensions.dozen_width) parts.push(`${dimensions.dozen_width} cm ancho`)
    if (dimensions.dozen_length) parts.push(`${dimensions.dozen_length} cm largo`)
    return parts.length > 0 ? parts.join(' • ') : '—'
  }

  return '—'
}

/**
 * Log para debugging: imprime las dimensiones del carrito en la consola
 * Útil durante desarrollo para verificar que las dimensiones se guardan
 */
export function logCartDimensions(items) {
  console.group('📦 Cart Dimensions Debug')
  items.forEach((item, idx) => {
    console.log(`[${idx}] ${item.name} (${item.type})`, {
      id: item.id,
      dimensions: item.dimensions || null,
      hasDimensions: hasItemDimensions(item),
      formatted: formatDimensions(item.dimensions, item.type),
    })
  })
  console.groupEnd()
}
