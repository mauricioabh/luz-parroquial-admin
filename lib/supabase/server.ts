import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Construye el cliente admin con service-role solo cuando se necesita.
 * Hacerlo perezoso evita que el `throw` por env faltante reviente el build
 * cuando Next.js evalúa los módulos al hacer "Collecting page data".
 */
let cachedAdmin: SupabaseClient | null = null
function buildSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!supabaseServiceKey) {
    throw new Error('Missing env.SUPABASE_SECRET_KEY')
  }

  cachedAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cachedAdmin
}

/**
 * Proxy con la misma forma que `SupabaseClient` que delega a una instancia
 * inicializada perezosamente. Mantiene la API pública sin tocar a los
 * importadores existentes (`supabaseAdmin.from(...)`, `supabaseAdmin.auth.admin...`).
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = buildSupabaseAdmin()
    return Reflect.get(client, prop, receiver)
  },
  has(_target, prop) {
    return prop in buildSupabaseAdmin()
  },
})

// Server-side client with user session (cookies) - for Route Handlers, Server Components
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - Proxy handles cookie refresh for Server Components
          }
        },
      },
    }
  )
}

