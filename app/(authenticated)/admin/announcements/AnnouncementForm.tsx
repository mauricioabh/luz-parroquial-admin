'use client'

import { useState, useEffect, FormEvent } from 'react'
import { Announcement, AnnouncementInsert, AnnouncementUpdate } from '@/lib/supabase/announcements'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface AnnouncementFormProps {
  announcement: Announcement | null
  onSubmit: (data: AnnouncementInsert | AnnouncementUpdate) => Promise<void>
  onCancel: () => void
}

export default function AnnouncementForm({ announcement, onSubmit, onCancel }: AnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all' | 'volunteers' | 'youth' | 'parents'>('all')
  const [publishAt, setPublishAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title)
      setBody(announcement.body)
      setAudience(announcement.audience)
      // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
      const publishDate = new Date(announcement.publish_at)
      setPublishAt(formatDateForInput(publishDate))
      if (announcement.expires_at) {
        const expireDate = new Date(announcement.expires_at)
        setExpiresAt(formatDateForInput(expireDate))
        setHasExpiration(true)
      } else {
        setExpiresAt('')
        setHasExpiration(false)
      }
      setIsPublished(announcement.is_published)
    } else {
      // Default to now for new announcements
      const now = new Date()
      setPublishAt(formatDateForInput(now))
      setTitle('')
      setBody('')
      setAudience('all')
      setExpiresAt('')
      setHasExpiration(false)
      setIsPublished(false)
    }
  }, [announcement])

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Validate publish date
      if (!publishAt) {
        throw new Error('La fecha de publicación es requerida')
      }

      // Validate expiration date if set
      if (hasExpiration && expiresAt) {
        const publishDate = new Date(publishAt)
        const expireDate = new Date(expiresAt)
        if (expireDate <= publishDate) {
          throw new Error('La fecha de expiración debe ser posterior a la fecha de publicación')
        }
      }

      const data: AnnouncementInsert | AnnouncementUpdate = {
        title: title.trim(),
        body: body.trim(),
        audience,
        publish_at: new Date(publishAt).toISOString(),
        expires_at: hasExpiration && expiresAt ? new Date(expiresAt).toISOString() : null,
        is_published: isPublished
      }
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el anuncio')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateForDisplay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={announcement ? 'Editar Anuncio' : 'Crear Anuncio'}
      size="lg"
    >
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {previewMode ? (
          <div className="space-y-4">
            <div className="border-b border-[var(--border)] pb-4">
              <h2 className="text-2xl font-semibold mb-2 text-[var(--foreground)]">
                {title || 'Título del Anuncio'}
              </h2>
              <div className="flex gap-2 text-sm text-[var(--muted-foreground)]">
                <span>Audiencia: {audience === 'all' ? 'Todos' : audience === 'volunteers' ? 'Voluntarios' : audience === 'youth' ? 'Jóvenes' : 'Padres'}</span>
                <span>•</span>
                <span>Publicar: {publishAt ? formatDateForDisplay(publishAt) : 'No establecido'}</span>
                {hasExpiration && expiresAt && (
                  <>
                    <span>•</span>
                    <span>Expira: {formatDateForDisplay(expiresAt)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="prose prose-base max-w-none">
              <p className="text-[var(--card-foreground)] whitespace-pre-wrap leading-relaxed">
                {body || 'El contenido del anuncio aparecerá aquí...'}
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewMode(false)}
              >
                Volver a Editar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                Título *
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ingresa el título del anuncio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                Contenido *
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={8}
                placeholder="Escribe tu anuncio aquí..."
                className="font-sans"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                Audiencia *
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as 'all' | 'volunteers' | 'youth' | 'parents')}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                required
              >
                <option value="all">Todos</option>
                <option value="volunteers">Voluntarios</option>
                <option value="youth">Jóvenes</option>
                <option value="parents">Padres</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                Fecha y Hora de Publicación *
              </label>
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasExpiration"
                checked={hasExpiration}
                onChange={(e) => {
                  setHasExpiration(e.target.checked)
                  if (!e.target.checked) {
                    setExpiresAt('')
                  }
                }}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
              />
              <label htmlFor="hasExpiration" className="text-sm text-[var(--card-foreground)] cursor-pointer">
                Establecer fecha de expiración
              </label>
            </div>

            {hasExpiration && (
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                  Fecha y Hora de Expiración
                </label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={publishAt}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
              />
              <label htmlFor="isPublished" className="text-sm text-[var(--card-foreground)] cursor-pointer">
                Publicar inmediatamente (si la fecha de publicación es en el pasado o ahora)
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewMode(true)}
                disabled={submitting || !title.trim() || !body.trim()}
              >
                Vista Previa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : announcement ? 'Actualizar Anuncio' : 'Crear Anuncio'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

