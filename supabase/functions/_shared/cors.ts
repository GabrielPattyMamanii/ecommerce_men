// CORS para Edge Functions
export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')

  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}
