'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import { 
  getAllPrayerIntentionsForParish, 
  deletePrayerIntention,
  type PrayerIntentionWithUser 
} from '@/lib/supabase/prayer-intentions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export default function IntentionsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <IntentionsContent />
    </RoleGuard>
  )
}

function IntentionsContent() {
  const { profile } = useProfile()
  const [intentions, setIntentions] = useState<PrayerIntentionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [intentionToDelete, setIntentionToDelete] = useState<PrayerIntentionWithUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadIntentions = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data, error } = await supabase
        .from('prayer_intentions')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Transform data to include user names
      const enriched: PrayerIntentionWithUser[] = (data || []).map((intention: any) => ({
        id: intention.id,
        parish_id: intention.parish_id,
        user_id: intention.user_id,
        title: intention.title,
        description: intention.description,
        visibility: intention.visibility,
        is_anonymous: intention.is_anonymous,
        created_at: intention.created_at,
        user_name: intention.is_anonymous || !intention.user_id
          ? null
          : (intention.profiles as any)?.full_name || null,
      }))

      setIntentions(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las intenciones de oración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntentions()
  }, [profile])

  const handleDeleteClick = (intention: PrayerIntentionWithUser) => {
    setIntentionToDelete(intention)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!intentionToDelete) return

    setDeleting(true)
    try {
      await deletePrayerIntention(intentionToDelete.id)
      await loadIntentions()
      setDeleteModalOpen(false)
      setIntentionToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la intención de oración')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
          Moderación de Intenciones de Oración
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Revisa y gestiona las intenciones de oración enviadas por los feligreses. Elimina cualquier contenido que sea inapropiado o viole las pautas de la comunidad.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando intenciones de oración...</p>
        </div>
      ) : intentions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-[var(--muted-foreground)]">
              Aún no se han enviado intenciones de oración.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {intentions.map((intention) => (
            <Card key={intention.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{intention.title}</CardTitle>
                      <Badge variant={intention.visibility === 'parish' ? 'info' : 'default'}>
                        {intention.visibility === 'parish' ? 'Parroquia' : 'Público'}
                      </Badge>
                      {intention.is_anonymous && (
                        <Badge variant="default">Anónimo</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {intention.is_anonymous ? (
                        'Enviado de forma anónima'
                      ) : intention.user_name ? (
                        `Enviado por ${intention.user_name}`
                      ) : (
                        'Enviado por un feligrés'
                      )}
                      {' • '}
                      {formatDate(intention.created_at)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(intention)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                  {intention.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false)
            setIntentionToDelete(null)
          }
        }}
        title="Eliminar Intención de Oración"
      >
        <div className="p-6">
          <p className="text-sm text-[var(--foreground)] mb-4">
            ¿Estás seguro de que deseas eliminar esta intención de oración? Esta acción no se puede deshacer.
          </p>
          {intentionToDelete && (
            <div className="mb-4 p-4 bg-[var(--secondary)] rounded-lg">
              <p className="font-medium text-sm mb-1">{intentionToDelete.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                {intentionToDelete.description}
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setIntentionToDelete(null)
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
