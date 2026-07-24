// CORS compartido por todas las Edge Functions del proyecto.
// SECURITY_GUIDELINES.md prohíbe 'Access-Control-Allow-Origin: *' — el origen
// permitido siempre debe ser uno explícito y conocido, nunca cualquiera.
// Para poder desarrollar en npm run dev (localhost:<puerto>) sin romper CORS
// en producción, se compara el Origin real de la petición contra una
// whitelist (SITE_URL + localhost) en vez de fijar un único valor estático.

// El header Origin del navegador NUNCA lleva barra final (es solo
// scheme://host:port) — si SITE_URL se configuró con una barra final en el
// secret, la comparación exacta fallaría siempre, incluso en producción.
export const SITE_URL = Deno.env.get('SITE_URL')?.replace(/\/+$/, '')

// Vite prueba puertos secuenciales si 5173 está ocupado (5174, 5175, ...),
// así que se acepta cualquier puerto de localhost en vez de uno fijo.
const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/

/**
 * Construye los headers CORS para una petición concreta.
 * Si el Origin de la petición está en la whitelist, se refleja tal cual
 * (nunca se refleja un origen arbitrario no reconocido); si no coincide con
 * nada, cae a SITE_URL (comportamiento anterior, fail-closed a producción).
 */
export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const allowedOrigin = origin && (origin === SITE_URL || LOCALHOST_ORIGIN.test(origin))
    ? origin
    : (SITE_URL ?? '')

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // El valor de Access-Control-Allow-Origin varía según el Origin de cada
    // petición — sin esto, un CDN/proxy podría cachear la respuesta de un
    // origen y servirla incorrectamente a otro.
    'Vary': 'Origin',
  }
}
