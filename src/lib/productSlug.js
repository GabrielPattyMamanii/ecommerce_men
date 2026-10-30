// URLs de producto legibles: /producto/jean-super-baggy-camo-beige
// El slug vive en products.slug (único, generado por trigger en la DB; ver supabase/migration-product-slug.sql).
// Se mantiene soporte para links viejos: UUID completo o "nombre-<8 hex del id>".

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function productPath(product) {
    return `/producto/${product.slug || product.id}`
}

// Devuelve { fullId } si el parámetro es un UUID completo (links viejos), o { slug }.
export function parseProductParam(param = '') {
    if (!param) return null
    return UUID_RE.test(param) ? { fullId: param } : { slug: param.toLowerCase() }
}
