'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, ReactNode } from 'react'
import { getCurrentUserProfile, UserProfile } from '@/lib/supabase/profile'
import { supabase } from '@/lib/supabase/client'

const PROFILE_CACHE_KEY = 'luz_profile_cache'
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hora - localStorage persiste tras recarga/restauración de pestaña

function getCachedProfile(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const { profile, ts, uid } = JSON.parse(raw)
    if (uid !== userId || Date.now() - ts > PROFILE_CACHE_TTL_MS) return null
    return profile as UserProfile
  } catch {
    return null
  }
}

/** Cache válido sin verificar usuario - para mostrar contenido al volver a la pestaña sin esperar a la red */
function getCachedProfileFast(): { profile: UserProfile; uid: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const { profile, ts, uid } = JSON.parse(raw)
    if (!uid || !profile || Date.now() - ts > PROFILE_CACHE_TTL_MS) return null
    return { profile: profile as UserProfile, uid }
  } catch {
    return null
  }
}

function setCachedProfile(userId: string, profile: UserProfile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ profile, ts: Date.now(), uid: userId }))
  } catch {}
}

function clearCachedProfile() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY)
  } catch {}
}

interface ProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  const loadProfile = async (useCache = true) => {
    // Ruta rápida: usar caché síncrono sin esperar a la red (evita colgarse si getUser() tarda)
    if (useCache) {
      const fast = getCachedProfileFast()
      if (fast) {
        setProfile(fast.profile)
        setLoading(false)
        setError(null)
        // Verificar en background que el usuario sigue siendo el mismo
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user || user.id !== fast.uid) {
            clearCachedProfile()
            setProfile(null)
            setLoading(true)
            loadProfile(false)
          } else {
            getCurrentUserProfile().then(p => {
              if (p) {
                setProfile(p)
                setCachedProfile(p.id, p)
              }
            }).catch(() => {})
          }
        }).catch(() => {})
        return
      }
      // Caché no disponible: intentar con getUser (con timeout para no colgarse)
      try {
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('auth_timeout')), 5000)
        )
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise])
        if (user) {
          const cached = getCachedProfile(user.id)
          if (cached) {
            setProfile(cached)
            setLoading(false)
            setError(null)
            getCurrentUserProfile().then(p => {
              if (p) {
                setProfile(p)
                setCachedProfile(p.id, p)
              }
            }).catch(() => {})
            return
          }
        }
      } catch {
        // getUser colgó o falló: el fast cache ya se intentó arriba, seguir con carga completa
      }
    }

    // Solo mostrar loading si no tenemos perfil todavía
    if (!profile) setLoading(true)
    setError(null)
    try {
      const LOAD_TIMEOUT_MS = 12_000 // Si la red tarda, usar caché tras 12s
      const userPromise = getCurrentUserProfile()
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)
      )

      const userProfile = await Promise.race([userPromise, timeoutPromise])
      setProfile(userProfile)
      if (userProfile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCachedProfile(user.id, userProfile)
      }
    } catch (err) {
      // Timeout o error: intentar usar caché sin esperar getUser (puede colgarse)
      const fast = getCachedProfileFast()
      if (fast) {
        setProfile(fast.profile)
        setError(null)
        getCurrentUserProfile().then(p => {
          if (p) {
            setProfile(p)
            setCachedProfile(p.id, p)
          }
        }).catch(() => {})
      } else {
        try {
          const { data: { user } } = await Promise.race([
            supabase.auth.getUser(),
            new Promise<{ data: { user: null } }>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 3000)
            ),
          ])
          if (user) {
            const cached = getCachedProfile(user.id)
            if (cached) {
              setProfile(cached)
              setError(null)
              getCurrentUserProfile().then(p => {
                if (p) {
                  setProfile(p)
                  setCachedProfile(p.id, p)
                }
              }).catch(() => {})
            } else {
              setError(err instanceof Error ? err : new Error('Failed to load profile'))
              setProfile(null)
            }
          } else {
            setError(err instanceof Error ? err : new Error('Failed to load profile'))
            setProfile(null)
          }
        } catch {
          setError(err instanceof Error ? err : new Error('Failed to load profile'))
          setProfile(null)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // useLayoutEffect: revisar caché antes del primer paint para evitar flash de loading
  useLayoutEffect(() => {
    const fast = getCachedProfileFast()
    if (fast) {
      setProfile(fast.profile)
      setLoading(false)
      setError(null)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user || user.id !== fast.uid) {
          clearCachedProfile()
          setProfile(null)
          setLoading(true)
          loadProfile(false)
        } else {
          getCurrentUserProfile().then(p => {
            if (p) {
              setProfile(p)
              setCachedProfile(p.id, p)
            }
          }).catch(() => {})
        }
      }).catch(() => loadProfile(false))
      return
    }
    loadProfile(true)
  }, [])

  useEffect(() => {
    // Al volver a la pestaña, si seguimos en loading, revalidar caché por si la red colgó
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && loadingRef.current) {
        loadProfile(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Listen for auth state changes to reload profile
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Background refresh: no poner loading=true si ya tenemos perfil
        getCurrentUserProfile().then(p => {
          if (p) {
            setProfile(p)
            setCachedProfile(p.id, p)
            setLoading(false)
          }
        }).catch(() => {})
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refrescado: actualizar caché en background silenciosamente
        getCurrentUserProfile().then(p => {
          if (p) {
            setProfile(p)
            setCachedProfile(p.id, p)
          }
        }).catch(() => {})
      } else if (event === 'SIGNED_OUT') {
        clearCachedProfile()
        setProfile(null)
        setLoading(false)
        setError(null)
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      subscription.unsubscribe()
    }
  }, [])

  const refresh = () => loadProfile(false)

  return (
    <ProfileContext.Provider value={{ profile, loading, error, refresh }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

