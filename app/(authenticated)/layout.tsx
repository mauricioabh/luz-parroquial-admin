'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { DemoModeProvider } from '@/contexts/DemoModeContext'
import { bootstrapSession, getRedirectPath } from '@/lib/supabase/session'
import { ADMIN_ROLES } from '@/lib/supabase/roles'
import { checkParishEnabled } from '@/lib/supabase/admin-controls'
import { Topbar } from '@/components/layout/Topbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ParishionerNav } from '@/components/layout/ParishionerNav'
import { OfflineIndicator } from '@/components/layout/OfflineIndicator'
import { DemoModeBanner } from '@/components/demo/DemoModeBanner'

const AUTH_CACHE_KEY = 'luz_auth_checked'
const AUTH_CACHE_TTL_MS = 30 * 60 * 1000

function getCachedAuth(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return false
    const { ts } = JSON.parse(raw)
    return Date.now() - ts < AUTH_CACHE_TTL_MS
  } catch {
    return false
  }
}

function setCachedAuth() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ ts: Date.now() }))
  } catch {}
}

function clearCachedAuth() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AUTH_CACHE_KEY)
  } catch {}
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const isAuthenticatedRef = useRef(false)
  isAuthenticatedRef.current = isAuthenticated

  // Leer caché de auth antes del primer paint
  useLayoutEffect(() => {
    if (getCachedAuth()) {
      setLoading(false)
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    // Verificar sesión una sola vez al montar (sin depender de pathname)
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          clearCachedAuth()
          setLoading(false)
          router.push('/login')
          return
        }

        const parishCheck = await checkParishEnabled()
        if (!parishCheck.enabled) {
          clearCachedAuth()
          setLoading(false)
          router.push('/access-restricted')
          return
        }

        try {
          const bootstrap = await bootstrapSession()
          const currentPath = pathnameRef.current

          const parishionerRoutes = ['/dashboard', '/onboarding', '/prayer', '/announcements', '/calendar']
          const isParishionerRoute = parishionerRoutes.some(
            route => currentPath === route || currentPath?.startsWith(route + '/')
          )
          const isDioceseRoute = currentPath === '/diocese' || currentPath?.startsWith('/diocese/')

          if (!isParishionerRoute && !isDioceseRoute && bootstrap.role === 'parishioner') {
            setLoading(false)
            router.push('/dashboard')
            return
          }
          if (isParishionerRoute && ADMIN_ROLES.includes(bootstrap.role as any)) {
            setLoading(false)
            router.push('/')
            return
          }
          if (isDioceseRoute && bootstrap.role !== 'diocese_admin') {
            setLoading(false)
            router.push('/')
            return
          }
          if (!isDioceseRoute && !isParishionerRoute && bootstrap.role === 'diocese_admin') {
            setLoading(false)
            router.push('/diocese')
            return
          }
        } catch (error: any) {
          const errorMessage = error?.message || error?.error?.message || ''
          if (errorMessage.includes('recursion') || errorMessage.includes('Profile not found')) {
            setLoading(false)
            router.push('/login')
            return
          }
          console.error('Bootstrap error:', errorMessage)
        }

        setIsAuthenticated(true)
        isAuthenticatedRef.current = true
        setCachedAuth()
        setLoading(false)
      } catch {
        clearCachedAuth()
        setLoading(false)
        router.push('/login')
      }
    }

    checkSession()

    // Auth state listener: solo se monta una vez, no depende de pathname
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED')) {
        clearCachedAuth()
        setIsAuthenticated(false)
        isAuthenticatedRef.current = false
        setLoading(false)
        router.push('/login')
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refrescado silenciosamente, no hacer nada que interrumpa la UI
        setCachedAuth()
        setIsAuthenticated(true)
        isAuthenticatedRef.current = true
        setLoading(false)
      }
      // SIGNED_IN es ignorado aquí: checkSession ya maneja el estado inicial.
      // Si se dispara SIGNED_IN después de cargar (p.ej. al volver a la pestaña),
      // no queremos redirigir al usuario.
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Sin dependencias: solo se monta/desmonta con el layout

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <ProfileProvider>
      <DemoModeProvider>
        <Topbar />
        <DemoModeBanner />
        <OfflineIndicator />
        <Sidebar />
        <ParishionerNav />
        <main className="lg:ml-64 mt-16 min-h-[calc(100vh-4rem)] bg-background pb-16 lg:pb-0">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </DemoModeProvider>
    </ProfileProvider>
  )
}
