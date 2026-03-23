import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/*
  Guard: si las env vars no están configuradas (desarrollo sin .env.local),
  exportamos un cliente no-op en lugar de lanzar un error fatal que
  impide que la app monte.
*/
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        '[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están configuradas.\n' +
        'Crea un archivo .env.local con tus credenciales de Supabase.'
    )
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : /** @type {import('@supabase/supabase-js').SupabaseClient} */ ({
        from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }) },
        functions: {
            invoke: () => Promise.resolve({
                data: null,
                error: { message: 'Supabase no configurado — agrega .env.local' },
            }),
        },
    })
