'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

interface ParishInfo {
  id: string
  name: string
  city: string
  diocese: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [parish, setParish] = useState<ParishInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadParishInfo = async () => {
      if (!profile) return

      try {
        const { data: parishData, error: parishError } = await supabase
          .from('parishes')
          .select('id, name, city, diocese')
          .eq('id', profile.parish_id)
          .single()

        if (!parishError && parishData) {
          setParish(parishData)
        }
      } catch (err) {
        console.error('Error loading parish:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!profileLoading && profile) {
      loadParishInfo()
    } else if (!profileLoading && !profile) {
      setLoading(false)
    }
  }, [profile, profileLoading])

  // Redirect non-parishioners
  useEffect(() => {
    if (!profileLoading && profile && profile.role_name !== 'parishioner') {
      router.push('/')
    }
  }, [profile, profileLoading, router])

  const handleContinue = () => {
    router.push('/dashboard')
  }

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Perfil No Encontrado</CardTitle>
            <CardDescription>
              No se pudo cargar tu perfil. Por favor contacta a tu administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (profile.role_name !== 'parishioner') {
    return null // Will redirect
  }

  // Get role description
  const getRoleDescription = () => {
    return "Tienes acceso de solo lectura a la información parroquial. Puedes ver anuncios, eventos y otro contenido parroquial, pero no puedes realizar cambios."
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-20 h-20 bg-[var(--primary)] rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-3xl">Bienvenido a Tu Parroquia</CardTitle>
            <CardDescription className="text-base mt-2">
              Tu cuenta ha sido vinculada exitosamente
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parish Information */}
          {parish && (
            <div className="bg-[var(--secondary)] rounded-lg p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                    Tu Parroquia
                  </h3>
                  <p className="text-xl font-semibold text-[var(--foreground)]">
                    {parish.name}
                  </p>
                  {(parish.city || parish.diocese) && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      {[parish.city, parish.diocese].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="space-y-4">
            <div className="border-t border-[var(--border)] pt-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Tu Nivel de Acceso
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--foreground)] mb-1">
                      Acceso de Solo Lectura
                    </h4>
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                      {getRoleDescription()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--foreground)] mb-1">
                      Confirmación de Cuenta
                    </h4>
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                      Tu cuenta ahora está vinculada a {parish?.name || 'tu parroquia'}. Puedes acceder a la información de la parroquia y mantenerte conectado con tu comunidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-6 border-t border-[var(--border)]">
            <Button
              onClick={handleContinue}
              className="w-full"
              size="lg"
            >
              Continuar al Panel
            </Button>
            <p className="text-xs text-center text-[var(--muted-foreground)] mt-3">
              Siempre puedes volver a esta información desde tu perfil
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

