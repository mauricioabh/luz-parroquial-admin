'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getInvitationById, acceptInvitation, type InvitationWithRole } from '@/lib/supabase/invitations'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

interface ParishInfo {
  id: string
  name: string
  city: string
  diocese: string
}

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const invitationId = searchParams.get('token')
  
  const [invitation, setInvitation] = useState<InvitationWithRole | null>(null)
  const [parish, setParish] = useState<ParishInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthAndLoadInvitation = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      
      if (!session || !invitationId) {
        setLoading(false)
        return
      }

      // Load invitation details (RLS allows users to see invitations for their email)
      try {
        const inv = await getInvitationById(invitationId)
        if (!inv) {
          setError('Invitación no encontrada')
          setLoading(false)
          return
        }
        setInvitation(inv)

        // Load parish information
        const { data: parishData, error: parishError } = await supabase
          .from('parishes')
          .select('id, name, city, diocese')
          .eq('id', inv.parish_id)
          .single()

        if (!parishError && parishData) {
          setParish(parishData)
        }
      } catch (err) {
        console.error('Error loading invitation:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar la invitación')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadInvitation()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && invitationId) {
        checkAuthAndLoadInvitation()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [invitationId])

  const handleAccept = async () => {
    if (!invitation || !invitationId) return

    setAccepting(true)
    setError(null)

    try {
      const result = await acceptInvitation(invitationId)

      if (!result.success) {
        const errorMsg = result.error || 'Error al aceptar la invitación'
        
        if (errorMsg.includes('already been accepted')) {
          setError('Esta invitación ya ha sido aceptada.')
        } else if (errorMsg.includes('expired')) {
          setError('Esta invitación ha expirado.')
        } else if (errorMsg.includes('revoked')) {
          setError('Esta invitación ha sido revocada.')
        } else if (errorMsg.includes('email mismatch')) {
          setError('Esta invitación es para una dirección de correo diferente. Por favor inicia sesión con la cuenta correcta.')
        } else if (errorMsg.includes('declined')) {
          setError('Esta invitación ha sido rechazada.')
        } else {
          setError(errorMsg)
        }
        return
      }

      // Redirect based on role - parishioners go to onboarding
      if (invitation.role_name === 'parishioner') {
        router.push('/onboarding')
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(err instanceof Error ? err.message : 'Error al aceptar la invitación')
    } finally {
      setAccepting(false)
    }
  }

  const handleLogin = () => {
    router.push(`/login?redirect=/invite?token=${invitationId}`)
  }

  if (!invitationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-[var(--destructive)]">Invitación Inválida</CardTitle>
            <CardDescription>
              No se proporcionó un token de invitación. Por favor verifica tu enlace de invitación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Ir al Inicio de Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando invitación...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-[var(--primary)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl">You've Been Invited</CardTitle>
            <CardDescription className="text-base">
              Por favor inicia sesión para ver y aceptar tu invitación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} className="w-full" size="lg">
              Iniciar Sesión para Continuar
            </Button>
            <p className="text-xs text-center text-[var(--muted-foreground)] mt-4">
              Recibirás un enlace de inicio de sesión seguro por correo electrónico
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-[var(--destructive)]">Invitación No Encontrada</CardTitle>
            <CardDescription>
              La invitación que buscas no existe o no tienes permiso para verla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Ir al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date()
  const canAccept = invitation.status === 'pending' && !isExpired

  // Get status message
  const getStatusMessage = () => {
    if (isExpired && invitation.status === 'pending') {
      return { text: 'Esta invitación ha expirado.', type: 'error' as const }
    }
    switch (invitation.status) {
      case 'accepted':
        return { text: 'Esta invitación ya ha sido aceptada.', type: 'info' as const }
      case 'declined':
        return { text: 'Esta invitación ha sido rechazada.', type: 'warning' as const }
      case 'expired':
        return { text: 'Esta invitación ha expirado.', type: 'error' as const }
      case 'revoked':
        return { text: 'Esta invitación ha sido revocada.', type: 'error' as const }
      default:
        return null
    }
  }

  const statusMessage = getStatusMessage()

  // Format role name for display
  const formatRoleName = (roleName: string) => {
    return roleName.charAt(0).toUpperCase() + roleName.slice(1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[var(--primary)] rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Acepta Tu Invitación</CardTitle>
          <CardDescription className="text-base">
            Has sido invitado a unirte a una parroquia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className={`p-3 rounded-lg border text-sm ${
              statusMessage.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-700'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {statusMessage.text}
            </div>
          )}

          <div className="space-y-4 pt-2">
            {parish && (
              <div className="pb-3 border-b border-[var(--border)]">
                <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Parroquia
                </label>
                <p className="text-lg font-semibold text-[var(--foreground)] mt-1">
                  {parish.name}
                </p>
                {(parish.city || parish.diocese) && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {[parish.city, parish.diocese].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Rol
              </label>
              <p className="text-base font-medium text-[var(--foreground)] mt-1">
                {formatRoleName(invitation.role_name)}
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {invitation.role_name === 'parishioner' 
                  ? 'Acceso de solo lectura a la información parroquial'
                  : invitation.role_name === 'editor'
                  ? 'Puede editar contenido parroquial'
                  : 'Acceso administrativo'
                }
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Correo Invitado
              </label>
              <p className="text-base text-[var(--foreground)] mt-1">
                {invitation.email}
              </p>
            </div>

            {invitation.expires_at && (
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Expira
                </label>
                <p className="text-sm text-[var(--foreground)] mt-1">
                  {new Date(invitation.expires_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAccept}
              disabled={!canAccept || accepting}
              className="flex-1"
              size="lg"
            >
              {accepting ? 'Aceptando...' : 'Aceptar Invitación'}
            </Button>
            {!canAccept && (
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Cerrar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
        </div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}

