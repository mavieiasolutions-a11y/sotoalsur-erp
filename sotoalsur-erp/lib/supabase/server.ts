import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Datos mock estáticos para el servidor (SSR)
const STATIC_PERFILES = [
  { id: 'mock-propietario-id', nombre_completo: 'MatIAs (Server Demo)', email: 'admin@sotoalsur.com', rol: 'PROPIETARIO', costo_hora_base: 50, activo: true }
]

class MockServerSupabaseClient {
  auth = {
    getUser: async () => {
      // Retornamos una sesión demo de propietario por defecto para el SSR en modo offline
      return { data: { user: { id: 'mock-propietario-id', email: 'admin@sotoalsur.com' } }, error: null }
    },
    signInWithPassword: async () => {
      return { data: { user: { id: 'mock-propietario-id', email: 'admin@sotoalsur.com' } }, error: null }
    },
    signOut: async () => {
      return { error: null }
    }
  }

  from(table: string) {
    const queryBuilder = {
      select: () => queryBuilder,
      eq: () => queryBuilder,
      neq: () => queryBuilder,
      is: () => queryBuilder,
      order: () => queryBuilder,
      limit: () => queryBuilder,
      gte: () => queryBuilder,
      lte: () => queryBuilder,
      single: () => {
        if (table === 'perfiles_empleados') {
          return { data: STATIC_PERFILES[0], error: null }
        }
        return { data: null, error: null }
      },
      then: (resolve: any) => {
        resolve({ data: [], error: null })
      }
    }
    return queryBuilder
  }
}

export async function createClient() {
  const isDummyUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') ||
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('TU_PROYECTO')

  if (isDummyUrl) {
    return new MockServerSupabaseClient() as any
  }

  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient(
    url!,
    anonKey!,
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
            // Ignorado en Server Components
          }
        },
      },
    }
  )
}
