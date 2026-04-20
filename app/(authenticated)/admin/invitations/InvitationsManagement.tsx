'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { ParishContext } from '@/components/ParishContext'
import {
  fetchInvitations,
  resendInvitation,
  revokeInvitation,
  type InvitationWithRole,
  type InvitationStatus
} from '@/lib/supabase/invitations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import InviteUserForm from './InviteUserForm'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { ActionConfirmation } from '@/components/guidance/ActionConfirmation'

export default function InvitationsManagement() {
  const { profile } = useProfile()
  const [invitations, setInvitations] = useState<InvitationWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<{
    title: string
    message: string
    affectedItems: string[]
    nextSteps: string
    isDestructive?: boolean
  } | null>(null)

  const loadInvitations = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchInvitations()
      setInvitations(data)
    } catch (err) {
      console.error('Error loading invitations:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las invitaciones'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.parish_id])

  const handleResend = async (invitationId: string) => {
    setActionLoading(invitationId)
    setActionError(null)

    try {
      const result = await resendInvitation(invitationId)
      
      if (!result.success) {
        setActionError(result.error || 'Error al reenviar la invitación')
        return
      }

      await loadInvitations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al reenviar la invitación'
      setActionError(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (revokeConfirm !== invitationId) {
      setRevokeConfirm(invitationId)
      return
    }

    setActionLoading(invitationId)
    setActionError(null)

    try {
      const invitation = invitations.find(inv => inv.id === invitationId)
      const result = await revokeInvitation(invitationId)
      
      if (!result.success) {
        setActionError(result.error || 'Error al revocar la invitación')
        return
      }

      // Show confirmation
      if (invitation) {
        setConfirmationMessage({
          title: 'Invitación revocada',
          message: 'La invitación ha sido revocada exitosamente. El destinatario ya no podrá usar esta invitación para crear una cuenta.',
          affectedItems: [
            `Correo: ${invitation.email}`,
            `Rol: ${invitation.role_name}`,
          ],
          nextSteps: 'Si es necesario, puedes enviar una nueva invitación a esta persona. Las invitaciones revocadas no se pueden restaurar.',
          isDestructive: true,
        })
        setShowConfirmation(true)
        
        // Auto-dismiss confirmation after 8 seconds
        setTimeout(() => {
          setShowConfirmation(false)
          setConfirmationMessage(null)
        }, 8000)
      }

      setRevokeConfirm(null)
      await loadInvitations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al revocar la invitación'
      setActionError(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="info">Pendiente</Badge>
      case 'accepted':
        return <Badge variant="success">Aceptada</Badge>
      case 'declined':
        return <Badge variant="warning">Rechazada</Badge>
      case 'expired':
        return <Badge variant="warning">Expirada</Badge>
      case 'revoked':
        return <Badge variant="destructive">Revocada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const isPending = (status: InvitationStatus) => status === 'pending'

  return (
    <ParishContext>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-serif text-[var(--foreground)] mb-2">Invitaciones</h1>
            <p className="text-[var(--muted-foreground)] text-lg">
              Gestiona invitaciones de usuarios para tu parroquia
            </p>
          </div>
          <Button onClick={() => setShowInviteModal(true)} size="lg">
            Invitar Usuario
          </Button>
        </div>

        {/* First-time Hint */}
        <FirstTimeHint
          storageKey="admin_invitations"
          title="Gestión de Invitaciones"
          description="Al invitar a un usuario a tu parroquia, recibirá una invitación por correo. Aquí puedes ver el estado de todas las invitaciones: pendientes, aceptadas, rechazadas o expiradas. Puedes reenviar o revocar invitaciones según sea necesario."
        />

        {/* Action Confirmation */}
        {showConfirmation && confirmationMessage && (
          <div className="mb-6">
            <ActionConfirmation
              title={confirmationMessage.title}
              message={confirmationMessage.message}
              affectedItems={confirmationMessage.affectedItems}
              nextSteps={confirmationMessage.nextSteps}
              isDestructive={confirmationMessage.isDestructive}
            />
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between">
            <p className="text-sm text-red-700">{actionError}</p>
            <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
              Descartar
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-[var(--muted-foreground)]">Cargando invitaciones...</p>
            </div>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && invitations.length === 0 && (
        <EmptyState
          title="Aún No Hay Invitaciones"
          description="Las invitaciones te permiten agregar nuevos usuarios a tu sistema parroquial. Cuando invitas a alguien, recibirán un correo electrónico con instrucciones para crear su cuenta."
          secondaryDescription="Después de enviar una invitación, podrás rastrear su estado aquí. Puedes ver si está pendiente, aceptada o si necesita ser reenviada. Todas las invitaciones tienen una fecha de expiración por seguridad."
          actionLabel="Invitar Usuario"
          onAction={() => setShowInviteModal(true)}
        />
        )}

        {!loading && !error && invitations.length > 0 && (
          <div className="space-y-0">
            {invitations.map((invitation, index) => {
              const pending = isPending(invitation.status)
              const isLoading = actionLoading === invitation.id
              const isRevokeConfirm = revokeConfirm === invitation.id

              return (
                <div
                  key={invitation.id}
                  className={`
                    border-b border-[var(--border)] 
                    py-4 px-2 
                    hover:bg-[var(--secondary)] 
                    transition-colors
                    ${index === 0 ? 'border-t' : ''}
                  `}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-base font-medium text-[var(--foreground)]">
                          {invitation.email}
                        </span>
                        <Badge variant="default" className="capitalize">
                          {invitation.role_name}
                        </Badge>
                        {getStatusBadge(invitation.status)}
                      </div>
                      <div className="text-sm text-[var(--muted-foreground)]">
                        <span>Created {formatDate(invitation.created_at)}</span>
                        {invitation.expires_at && (
                          <>
                            {' • '}
                            <span>Expires {formatDate(invitation.expires_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {pending && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResend(invitation.id)
                          }}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Enviando...' : 'Reenviar'}
                        </Button>
                        <Button
                          variant={isRevokeConfirm ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRevoke(invitation.id)
                          }}
                          disabled={isLoading}
                        >
                          {isRevokeConfirm ? 'Confirmar Eliminación' : 'Eliminar'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Invitar Usuario"
          size="md"
        >
          <div className="p-6">
            <InviteUserForm
              onSuccess={() => {
                setShowInviteModal(false)
                loadInvitations()
              }}
              onCancel={() => setShowInviteModal(false)}
            />
          </div>
        </Modal>
      </div>
    </ParishContext>
  )
}
