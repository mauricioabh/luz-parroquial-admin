'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import { 
  getPublishedAnnouncements,
  formatAudience,
  getAudienceBadgeVariant,
  type Announcement
} from '@/lib/supabase/announcements'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ReadOnlyIndicator } from '@/components/permissions'
import { EnhancedErrorDisplay } from '@/components/permissions'

export default function AnnouncementsPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <AnnouncementsContent />
    </RoleGuard>
  )
}

function AnnouncementsContent() {
  const { profile } = useProfile()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadAnnouncements = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const publishedAnnouncements = await getPublishedAnnouncements(profile.parish_id)
      setAnnouncements(publishedAnnouncements)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los anuncios'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [profile])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando anuncios...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <EnhancedErrorDisplay
          error={error}
          context={{ action: 'load announcements', resource: 'announcements' }}
          onRetry={loadAnnouncements}
          onDismiss={() => setError(null)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">
            Anuncios Parroquiales
          </h1>
          <ReadOnlyIndicator variant="badge" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Mantente conectado con tu comunidad parroquial
        </p>
      </div>

      {announcements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)]">
              No hay anuncios en este momento. ¡Vuelve pronto!
            </p>
          </CardContent>
        </Card>
      )}

      {announcements.length > 0 && (
        <div className="space-y-6">
          {announcements.map((announcement) => {
            const isExpanded = expandedId === announcement.id
            const shouldTruncate = announcement.body.length > 200
            const displayBody = isExpanded || !shouldTruncate 
              ? announcement.body 
              : truncateText(announcement.body)

            return (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <CardTitle className="text-2xl font-semibold text-[var(--card-foreground)] flex-1">
                      {announcement.title}
                    </CardTitle>
                    <Badge variant={getAudienceBadgeVariant(announcement.audience)}>
                      {formatAudience(announcement.audience)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <time dateTime={announcement.publish_at}>
                      {formatDate(announcement.publish_at)} at {formatTime(announcement.publish_at)}
                    </time>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-base max-w-none">
                    <p className="text-[var(--card-foreground)] whitespace-pre-wrap leading-relaxed text-base">
                      {displayBody}
                    </p>
                  </div>
                  {shouldTruncate && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                      className="mt-4 text-sm text-[var(--primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ring)] rounded"
                    >
                      {isExpanded ? 'Leer menos' : 'Leer más'}
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
