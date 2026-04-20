'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getParishMinistries,
  getMinistryWithMembers,
  createMinistry,
  updateMinistry,
  deleteMinistry,
  assignMinistryLeader,
  removeMinistryMember,
  getParishJoinRequests,
  approveMinistryJoinRequest,
  rejectMinistryJoinRequest,
  Ministry,
  MinistryWithMembers,
  MinistryInsert,
  MinistryUpdate,
  MinistryJoinRequest,
} from '@/lib/supabase/ministries'
import MinistryForm from './MinistryForm'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export default function AdminMinistriesPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AdminMinistriesContent />
    </RoleGuard>
  )
}

function AdminMinistriesContent() {
  const { profile } = useProfile()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [joinRequestsError, setJoinRequestsError] = useState<boolean>(false)
  const [showForm, setShowForm] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [viewingMinistry, setViewingMinistry] = useState<MinistryWithMembers | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [joinRequests, setJoinRequests] = useState<MinistryJoinRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

  const loadMinistries = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parishMinistries = await getParishMinistries(profile.parish_id)
      setMinistries(parishMinistries)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los ministerios'))
    } finally {
      setLoading(false)
    }
  }

  const loadJoinRequests = async () => {
    if (!profile?.parish_id) {
      setLoadingRequests(false)
      return
    }

    setLoadingRequests(true)
    setJoinRequestsError(false)
    try {
      const pendingRequests = await getParishJoinRequests(profile.parish_id, 'submitted')
      const inReviewRequests = await getParishJoinRequests(profile.parish_id, 'in_review')
      setJoinRequests([...pendingRequests, ...inReviewRequests])
    } catch (err) {
      // Error silencioso: las solicitudes de unión son opcionales
      console.warn('No se pudieron cargar las solicitudes de unión:', err)
      setJoinRequestsError(true)
      setJoinRequests([])
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    loadMinistries()
    loadJoinRequests()
  }, [profile])

  const handleCreate = () => {
    setEditingMinistry(null)
    setShowForm(true)
  }

  const handleEdit = (ministry: Ministry) => {
    setEditingMinistry(ministry)
    setShowForm(true)
  }

  const handleViewMembers = async (ministryId: string) => {
    setLoadingMembers(true)
    try {
      const ministryWithMembers = await getMinistryWithMembers(ministryId)
      setViewingMinistry(ministryWithMembers)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los miembros del ministerio'))
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ministerio? Esta acción no se puede deshacer. Todas las membresías serán eliminadas y el ministerio ya no será visible.')) {
      return
    }

    setDeletingId(id)
    try {
      await deleteMinistry(id)
      await loadMinistries()
      if (viewingMinistry?.id === id) {
        setViewingMinistry(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el ministerio'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleLeader = async (ministryId: string, userId: string, currentRole: 'member' | 'leader') => {
    try {
      await assignMinistryLeader(ministryId, userId, currentRole !== 'leader')
      // Reload the ministry with members
      const updated = await getMinistryWithMembers(ministryId)
      setViewingMinistry(updated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al actualizar el estado de líder'))
    }
  }

  const handleRemoveMember = async (ministryId: string, userId: string, userName: string) => {
    if (!confirm(`¿Eliminar a ${userName} de este ministerio?`)) {
      return
    }

    try {
      await removeMinistryMember(ministryId, userId)
      // Reload the ministry with members
      const updated = await getMinistryWithMembers(ministryId)
      setViewingMinistry(updated)
      // Reload ministries list to update member counts
      await loadMinistries()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el miembro'))
    }
  }

  const handleFormSubmit = async (data: MinistryInsert | MinistryUpdate) => {
    if (!profile?.parish_id) return

    try {
      if (editingMinistry) {
        await updateMinistry(editingMinistry.id, data as MinistryUpdate)
      } else {
        await createMinistry({ ...data, parish_id: profile.parish_id } as MinistryInsert)
      }
      setShowForm(false)
      setEditingMinistry(null)
      await loadMinistries()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingMinistry ? 'actualizar' : 'crear'} ministerio`))
      throw err
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequestId(requestId)
    try {
      await approveMinistryJoinRequest(requestId)
      await loadJoinRequests()
      await loadMinistries()
      // Reload viewing ministry if it's related
      if (viewingMinistry) {
        const updated = await getMinistryWithMembers(viewingMinistry.id)
        setViewingMinistry(updated)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al aprobar la solicitud de unión'))
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm('¿Estás seguro de que deseas rechazar esta solicitud de unión?')) {
      return
    }

    setProcessingRequestId(requestId)
    try {
      await rejectMinistryJoinRequest(requestId)
      await loadJoinRequests()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al rechazar la solicitud de unión'))
    } finally {
      setProcessingRequestId(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-[var(--muted-foreground)]">Cargando ministerios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Ministerios</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Organiza voluntarios y feligreses en grupos
          </p>
        </div>
        <Button onClick={handleCreate}>
          Crear Ministerio
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error.message}
        </div>
      )}

      {/* Join Requests Approval Panel */}
      {joinRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Solicitudes de Unión Pendientes ({joinRequests.length})</CardTitle>
            <CardDescription>
              Revisa y aprueba o rechaza las solicitudes de unión a ministerios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-[var(--foreground)]">
                          {request.profile?.full_name || 'Usuario Desconocido'}
                        </p>
                        <Badge variant={request.status === 'in_review' ? 'default' : 'secondary'}>
                          {request.status === 'in_review' ? 'En Revisión' : 'Enviado'}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Solicitó unirse a <strong>{request.ministry?.name || 'Ministerio Desconocido'}</strong>
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={processingRequestId === request.id}
                      >
                        {processingRequestId === request.id ? 'Procesando...' : 'Aprobar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={processingRequestId === request.id}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <MinistryForm
          ministry={editingMinistry}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingMinistry(null)
          }}
        />
      )}

      {viewingMinistry && (
        <Modal
          isOpen={true}
          onClose={() => setViewingMinistry(null)}
          title={viewingMinistry.name}
          size="lg"
        >
          <div className="space-y-6">
            {viewingMinistry.description && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-[var(--foreground)]">Descripción</h3>
                <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">
                  {viewingMinistry.description}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium mb-3 text-[var(--foreground)]">
                Miembros ({viewingMinistry.members.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {viewingMinistry.members.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)] py-4">
                    Aún no hay miembros
                  </p>
                ) : (
                  viewingMinistry.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {member.profile?.full_name || 'Usuario Desconocido'}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Se unió el {new Date(member.joined_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        {member.role === 'leader' && (
                          <Badge variant="default">Líder</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleLeader(
                              viewingMinistry.id,
                              member.user_id,
                              member.role
                            )
                          }
                        >
                          {member.role === 'leader' ? 'Quitar Líder' : 'Hacer Líder'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(
                              viewingMinistry.id,
                              member.user_id,
                              member.profile?.full_name || 'este miembro'
                            )
                          }
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {ministries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">
              Aún no hay ministerios. Crea tu primer ministerio para comenzar.
            </p>
            <Button onClick={handleCreate}>Crear Ministerio</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ministries.map((ministry) => (
            <Card key={ministry.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{ministry.name}</CardTitle>
                    {ministry.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {ministry.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {ministry.is_public ? (
                      <Badge variant="default">Público</Badge>
                    ) : (
                      <Badge variant="secondary">Privado</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {ministry.member_count || 0} {ministry.member_count === 1 ? 'miembro' : 'miembros'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewMembers(ministry.id)}
                    >
                      Miembros
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(ministry)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(ministry.id)}
                      disabled={deletingId === ministry.id}
                    >
                      {deletingId === ministry.id ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

