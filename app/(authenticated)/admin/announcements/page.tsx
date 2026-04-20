'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getParishAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  expireAnnouncement,
  deleteAnnouncement,
  Announcement,
  AnnouncementInsert,
  AnnouncementUpdate,
  getAudienceBadgeVariant,
  formatAudience
} from '@/lib/supabase/announcements'
import AnnouncementForm from './AnnouncementForm'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function AdminAnnouncementsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AdminAnnouncementsContent />
    </RoleGuard>
  )
}

function AdminAnnouncementsContent() {
  const { profile } = useProfile()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [expiringId, setExpiringId] = useState<string | null>(null)

  const loadAnnouncements = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parishAnnouncements = await getParishAnnouncements(profile.parish_id)
      setAnnouncements(parishAnnouncements)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los anuncios'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [profile])

  const handleCreate = () => {
    setEditingAnnouncement(null)
    setShowForm(true)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio? Esta acción no se puede deshacer. El anuncio ya no será visible para los feligreses.')) {
      return
    }

    setDeletingId(id)
    try {
      await deleteAnnouncement(id)
      await loadAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el anuncio'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublish = async (announcement: Announcement) => {
    setPublishingId(announcement.id)
    try {
      await publishAnnouncement(announcement.id, !announcement.is_published)
      await loadAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al actualizar el anuncio'))
    } finally {
      setPublishingId(null)
    }
  }

  const handleExpire = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres expirar este anuncio? Ya no será visible para los feligreses.')) {
      return
    }

    setExpiringId(id)
    try {
      await expireAnnouncement(id)
      await loadAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al expirar el anuncio'))
    } finally {
      setExpiringId(null)
    }
  }

  const handleFormSubmit = async (data: AnnouncementInsert | AnnouncementUpdate) => {
    if (!profile) return

    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, data as AnnouncementUpdate, profile.parish_id)
      } else {
        await createAnnouncement({ ...data, parish_id: profile.parish_id } as AnnouncementInsert)
      }
      setShowForm(false)
      setEditingAnnouncement(null)
      await loadAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingAnnouncement ? 'actualizar' : 'crear'} el anuncio`))
      throw err
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingAnnouncement(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (announcement: Announcement) => {
    const now = new Date()
    const publishAt = new Date(announcement.publish_at)
    const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null

    if (!announcement.is_published) {
      return <Badge variant="warning">Borrador</Badge>
    }

    if (expiresAt && expiresAt <= now) {
      return <Badge variant="destructive">Expirado</Badge>
    }

    if (publishAt > now) {
      return <Badge variant="info">Programado</Badge>
    }

    return <Badge variant="success">Publicado</Badge>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 text-[var(--foreground)]">
            Anuncios
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Crea y gestiona anuncios parroquiales con segmentación de audiencia y programación
          </p>
        </div>
        <Button onClick={handleCreate}>
          + Crear Anuncio
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando anuncios...</p>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">
              Aún no hay anuncios. Crea tu primer anuncio para comenzar.
            </p>
            <Button onClick={handleCreate}>
              Crear Primer Anuncio
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      {getStatusBadge(announcement)}
                      <Badge variant={getAudienceBadgeVariant(announcement.audience)}>
                        {formatAudience(announcement.audience)}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-[var(--muted-foreground)]">
                      <p>Creado: {formatDate(announcement.created_at)}</p>
                      <p>Publicar: {formatDate(announcement.publish_at)}</p>
                      {announcement.expires_at && (
                        <p>Expira: {formatDate(announcement.expires_at)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(announcement)}
                      disabled={publishingId === announcement.id}
                    >
                      {publishingId === announcement.id
                        ? '...'
                        : announcement.is_published
                        ? 'Despublicar'
                        : 'Publicar'}
                    </Button>
                    {announcement.is_published && !announcement.expires_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExpire(announcement.id)}
                        disabled={expiringId === announcement.id}
                      >
                        {expiringId === announcement.id ? 'Expirando...' : 'Expirar'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(announcement)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                      disabled={deletingId === announcement.id}
                    >
                      {deletingId === announcement.id ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-[var(--card-foreground)] whitespace-pre-wrap leading-relaxed">
                    {announcement.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <AnnouncementForm
          announcement={editingAnnouncement}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}

