export function formatPrice(product) {
  return product.price_on_request ? 'Consultar precio' : `$${Number(product.retail_price).toFixed(2)}`
}

export function isPurchasable(product) {
  return !product.price_on_request && product.stock > 0
}
