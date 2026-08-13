// Arma el link de WhatsApp para el botón "Consultar precio" de productos con
// price_on_request = true. Reusa el whatsapp_url configurado en
// /admin/configuracion (tabla contact_settings) + el mensaje de bienvenida
// editable en /admin/configuracion/whatsapp, al que se le agrega
// automáticamente el nombre del producto.

export const DEFAULT_CONSULT_MESSAGE = 'Hola, quiero consultar el precio de este producto:'

/**
 * @param {{ whatsapp_url?: string, consult_message?: string } | null} contactSettings
 * @param {string} [productName]
 * @returns {string|null} URL lista para window.open, o null si no hay whatsapp_url configurado
 */
export function buildConsultWhatsappUrl(contactSettings, productName) {
  const baseUrl = contactSettings?.whatsapp_url?.trim()
  if (!baseUrl) return null

  const intro = contactSettings?.consult_message?.trim() || DEFAULT_CONSULT_MESSAGE
  const message = productName ? `${intro}\n\n${productName}` : intro
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}text=${encodeURIComponent(message)}`
}
