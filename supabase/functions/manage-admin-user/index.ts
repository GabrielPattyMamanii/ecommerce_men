// Supabase Edge Function — gestión de usuarios de staff del panel admin
// Deploy: supabase functions deploy manage-admin-user
// Env vars needed in Supabase Dashboard → Settings → Edge Functions:
//   SITE_URL — URL del frontend (ej. https://tudominio.com)
// Auto-available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@^2'
import { SITE_URL, buildCorsHeaders } from '../_shared/cors.ts'

// Debe coincidir exactamente con el CHECK constraint de admin_permissions.section
// en migration-admin-users.sql. 'usuarios' queda deliberadamente afuera: la
// gestión de staff nunca es delegable.
const VALID_SECTIONS = [
  'productos', 'inventario', 'categorias', 'cupones', 'ordenes',
  'clientes', 'compras', 'configuracion',
]

const MIN_PASSWORD_LENGTH = 12

interface CreatePayload {
  action: 'create'
  username: string
  email: string
  password: string
  permissions: string[]
}

interface DeletePayload {
  action: 'delete'
  userId: string
}

interface ResetPasswordPayload {
  action: 'reset_password'
  userId: string
  password: string
}

type RequestPayload = CreatePayload | DeletePayload | ResetPasswordPayload

Deno.serve(async (req: Request) => {
  const CORS = buildCorsHeaders(req)

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!SITE_URL) {
    return jsonResponse({ error: 'SITE_URL environment variable not set' }, 500)
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Verificar que quien llama es un admin autenticado ──
    // El service_role bypassa RLS por completo: esta es la única barrera real.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (!caller) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return jsonResponse({ error: 'Solo un administrador puede gestionar usuarios' }, 403)
    }

    const payload: RequestPayload = await req.json()

    if (payload.action === 'create') {
      const { username, email, password, permissions } = payload

      if (!username?.trim() || !email?.trim()) {
        return jsonResponse({ error: 'El nombre de usuario y el correo son obligatorios' }, 400)
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return jsonResponse(
          { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
          400,
        )
      }
      const sections = Array.isArray(permissions) ? permissions : []
      const invalidSection = sections.find((s) => !VALID_SECTIONS.includes(s))
      if (invalidSection) {
        return jsonResponse({ error: `Sección de permiso inválida: ${invalidSection}` }, 400)
      }

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: username },
      })
      if (createErr) throw createErr

      const newUserId = created.user.id

      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ username, role: 'staff' })
        .eq('id', newUserId)

      if (profileErr) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        throw profileErr
      }

      if (sections.length > 0) {
        const { error: permErr } = await supabaseAdmin
          .from('admin_permissions')
          .insert(sections.map((section) => ({ user_id: newUserId, section })))

        if (permErr) {
          await supabaseAdmin.auth.admin.deleteUser(newUserId)
          throw permErr
        }
      }

      return jsonResponse({ id: newUserId, username, email })
    }

    if (payload.action === 'reset_password') {
      const { userId, password } = payload
      if (!userId) {
        return jsonResponse({ error: 'userId es obligatorio' }, 400)
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return jsonResponse(
          { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
          400,
        )
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      if (error) throw error

      return jsonResponse({ ok: true })
    }

    if (payload.action === 'delete') {
      const { userId } = payload
      if (!userId) {
        return jsonResponse({ error: 'userId es obligatorio' }, 400)
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error

      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Acción no reconocida' }, 400)
  } catch (err) {
    console.error('manage-admin-user Error:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return jsonResponse({ error: message }, 500)
  }
})
