'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  getPublicMinistries,
  getMinistry,
  requestToJoinMinistry,
  leaveMinistry,
  Ministry,
} from '@/lib/supabase/ministries'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export default function MinistriesPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <MinistriesContent />
    </RoleGuard>
  )
}

function MinistriesContent() {
  const { profile } = useProfile()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  const loadMinistries = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const publicMinistries = await getPublicMinistries(profile.parish_id)
      setMinistries(publicMinistries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los ministerios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMinistries()
  }, [profile])

  const handleJoin = async (ministryId: string) => {
    setJoiningId(ministryId)
    setError(null)
    try {
      await requestToJoinMinistry(ministryId)
      // Reload ministries to update request status
      await loadMinistries()
      // Update selected ministry if viewing it
      if (selectedMinistry?.id === ministryId) {
        const updated = await getMinistry(ministryId)
        if (updated) {
          // Check membership and request status
          const updatedMinistries = await getPublicMinistries(profile!.parish_id)
          const found = updatedMinistries.find((m) => m.id === ministryId)
          if (found) {
            setSelectedMinistry(found)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar unirse al ministerio')
    } finally {
      setJoiningId(null)
    }
  }

  const handleLeave = async (ministryId: string) => {
    if (!confirm('¿Estás seguro de que deseas salir de este ministerio?')) {
      return
    }

    setLeavingId(ministryId)
    setError(null)
    try {
      await leaveMinistry(ministryId)
      // Reload ministries to update membership status
      await loadMinistries()
      // Update selected ministry if viewing it
      if (selectedMinistry?.id === ministryId) {
        const updated = await getMinistry(ministryId)
        if (updated) {
          // Check membership status
          const updatedMinistries = await getPublicMinistries(profile!.parish_id)
          const found = updatedMinistries.find((m) => m.id === ministryId)
          if (found) {
            setSelectedMinistry(found)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al salir del ministerio')
    } finally {
      setLeavingId(null)
    }
  }

  const handleViewDetails = async (ministry: Ministry) => {
    setSelectedMinistry(ministry)
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
          Ministerios y Grupos
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Descubre oportunidades para servir y conectarte con tu comunidad parroquial
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {selectedMinistry && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMinistry(null)}
          title={selectedMinistry.name}
          size="md"
        >
          <div className="space-y-6">
            {selectedMinistry.description && (
              <div>
                <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap leading-relaxed">
                  {selectedMinistry.description}
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
              <div className="text-sm text-[var(--muted-foreground)]">
                <strong className="text-[var(--foreground)]">{selectedMinistry.member_count || 0}</strong>{' '}
                {selectedMinistry.member_count === 1 ? 'miembro' : 'miembros'}
              </div>
              {selectedMinistry.is_member ? (
                <div className="flex-1">
                  {selectedMinistry.user_role === 'leader' && (
                    <Badge variant="default" className="mb-3">Líder</Badge>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleLeave(selectedMinistry.id)}
                    disabled={leavingId === selectedMinistry.id}
                    className="w-full"
                  >
                    {leavingId === selectedMinistry.id ? 'Saliendo...' : 'Salir del Ministerio'}
                  </Button>
                </div>
              ) : selectedMinistry.has_pending_request ? (
                <Button
                  variant="outline"
                  disabled
                  className="w-full"
                >
                  Solicitud Pendiente
                </Button>
              ) : (
                <Button
                  onClick={() => handleJoin(selectedMinistry.id)}
                  disabled={joiningId === selectedMinistry.id}
                  className="w-full"
                >
                  {joiningId === selectedMinistry.id ? 'Enviando Solicitud...' : 'Solicitar Unirse'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {ministries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)]">
              No hay ministerios públicos disponibles en este momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ministries.map((ministry) => (
            <Card
              key={ministry.id}
              className="hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handleViewDetails(ministry)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl pr-2">{ministry.name}</CardTitle>
                  {ministry.is_member && (
                    <Badge variant="default">Miembro</Badge>
                  )}
                </div>
                {ministry.description && (
                  <CardDescription className="line-clamp-3 mt-2">
                    {ministry.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {ministry.member_count || 0} {ministry.member_count === 1 ? 'miembro' : 'miembros'}
                  </div>
                  <Button
                    variant={ministry.is_member ? 'outline' : ministry.has_pending_request ? 'outline' : 'primary'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (ministry.is_member) {
                        handleLeave(ministry.id)
                      } else if (!ministry.has_pending_request) {
                        handleJoin(ministry.id)
                      }
                    }}
                    disabled={joiningId === ministry.id || leavingId === ministry.id || ministry.has_pending_request}
                  >
                    {joiningId === ministry.id
                      ? 'Enviando...'
                      : leavingId === ministry.id
                      ? 'Saliendo...'
                      : ministry.is_member
                      ? 'Salir'
                      : ministry.has_pending_request
                      ? 'Pendiente'
                      : 'Solicitar Unirse'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

