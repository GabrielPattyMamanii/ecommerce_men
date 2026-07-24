import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser]           = useState(null)
    const [session, setSession]     = useState(null)
    const [role, setRole]           = useState(null)
    // permissions: null = acceso total (admin), array = secciones permitidas (staff/user)
    const [permissions, setPermissions] = useState(null)
    // authReady: onAuthStateChange ya disparó al menos una vez
    // roleReady: el fetch de role (+ permissions) terminó (o no hay usuario, no hace falta)
    const [authReady, setAuthReady] = useState(false)
    const [roleReady, setRoleReady] = useState(false)

    // Paso 1 — seguir cambios de sesión (no hacer async aquí: Supabase no lo recomienda)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                setSession(newSession)
                setUser(newSession?.user ?? null)
                setAuthReady(true)
                // Sin usuario → no hay role que buscar, marcamos listo ya
                if (!newSession?.user) {
                    setRole(null)
                    setPermissions(null)
                    setRoleReady(true)
                }
            }
        )
        return () => subscription.unsubscribe()
    }, [])

    // Paso 2 — cuando el usuario cambia, leer su role (y permisos si es staff) de profiles
    useEffect(() => {
        if (!user) return
        setRoleReady(false)
        supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
            .then(async ({ data }) => {
                const userRole = data?.role ?? 'user'
                setRole(userRole)

                if (userRole === 'staff') {
                    const { data: perms } = await supabase
                        .from('admin_permissions')
                        .select('section')
                        .eq('user_id', user.id)
                    setPermissions((perms ?? []).map((p) => p.section))
                } else {
                    // admin: null = acceso total. user: sin secciones de admin.
                    setPermissions(userRole === 'admin' ? null : [])
                }

                setRoleReady(true)
            })
    }, [user?.id]) // solo re-ejecutar cuando cambia el uid

    // loading = true hasta que Auth Y role estén resueltos
    const loading = !authReady || !roleReady

    /* ── Funciones de autenticación ── */

    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
    }

    async function register(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata },
        })
        if (error) throw error
        return data
    }

    async function logout() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    return (
        <AuthCtx.Provider value={{ user, session, role, permissions, loading, login, register, logout }}>
            {children}
        </AuthCtx.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthCtx)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}
