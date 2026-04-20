'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  getInvitationById,
  acceptInvitation,
  type InvitationWithRole
} from '@/lib/supabase/invitations'

interface InvitationAcceptanceProps {
  invitationId: string
}

export default function InvitationAcceptance({ invitationId }: InvitationAcceptanceProps) {
  const router = useRouter()
  const [invitation, setInvitation] = useState<InvitationWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      
      if (!session) {
        setLoading(false)
        return
      }

      // Load invitation details
      try {
        const inv = await getInvitationById(invitationId)
        if (!inv) {
          setError('Invitación no encontrada')
          setLoading(false)
          return
        }
        setInvitation(inv)
      } catch (err) {
        console.error('Error loading invitation:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar la invitación')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [invitationId])

  const handleAccept = async () => {
    if (!invitation) return

    setAccepting(true)
    setError(null)

    try {
      const result = await acceptInvitation(invitationId)

      if (!result.success) {
        // Parse error message for better UX
        const errorMsg = result.error || 'Error al aceptar la invitación'
        
        // Handle specific error cases
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

      // Success - redirect to appropriate page based on role
      router.push('/')
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(err instanceof Error ? err.message : 'Error al aceptar la invitación')
    } finally {
      setAccepting(false)
    }
  }

  const handleLogin = () => {
    // Redirect to login with return URL
    router.push(`/login?redirect=/accept-invitation?token=${invitationId}`)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <p style={{ color: '#666' }}>Cargando invitación...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid #e0e0e0'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Inicio de Sesión Requerido
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px'
          }}>
            Por favor inicia sesión para aceptar esta invitación.
          </p>
          <button
            onClick={handleLogin}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid #e0e0e0'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#d32f2f'
          }}>
            Invitación No Encontrada
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px'
          }}>
            La invitación que buscas no existe o no tienes permiso para verla.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    )
  }

  const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date()
  const canAccept = invitation.status === 'pending' && !isExpired

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid #e0e0e0'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          Aceptar Invitación
        </h1>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {invitation.status !== 'pending' && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fff3e0',
            color: '#f57c00',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {invitation.status === 'accepted' && 'Esta invitación ya ha sido aceptada.'}
            {invitation.status === 'declined' && 'Esta invitación ha sido rechazada.'}
            {invitation.status === 'expired' && 'Esta invitación ha expirado.'}
            {invitation.status === 'revoked' && 'Esta invitación ha sido revocada.'}
          </div>
        )}

        {isExpired && invitation.status === 'pending' && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fce4ec',
            color: '#c2185b',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            Esta invitación ha expirado.
          </div>
        )}

        <div style={{
          marginBottom: '20px'
        }}>
          <div style={{
            marginBottom: '12px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: '#666',
              marginBottom: '4px'
            }}>
              Correo Electrónico
            </label>
            <p style={{
              fontSize: '14px',
              color: '#333'
            }}>
              {invitation.email}
            </p>
          </div>

          <div style={{
            marginBottom: '12px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: '#666',
              marginBottom: '4px'
            }}>
              Rol
            </label>
            <p style={{
              fontSize: '14px',
              color: '#333',
              textTransform: 'capitalize'
            }}>
              {invitation.role_name}
            </p>
          </div>

          {invitation.expires_at && (
            <div style={{
              marginBottom: '12px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#666',
                marginBottom: '4px'
              }}>
                Expira
              </label>
              <p style={{
                fontSize: '14px',
                color: '#333'
              }}>
                {new Date(invitation.expires_at).toLocaleString('es-ES')}
              </p>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={handleAccept}
            disabled={!canAccept || accepting}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: canAccept && !accepting ? '#0070f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: canAccept && !accepting ? 'pointer' : 'not-allowed',
              opacity: canAccept && !accepting ? 1 : 0.6
            }}
          >
            {accepting ? 'Aceptando...' : 'Aceptar Invitación'}
          </button>
          <button
            onClick={() => router.push('/')}
            disabled={accepting}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: accepting ? 'not-allowed' : 'pointer',
              opacity: accepting ? 0.6 : 1
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

