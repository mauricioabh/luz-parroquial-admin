'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  getParishEvents,
  createEvent,
  updateEvent,
  publishEvent,
  deleteEvent,
  Event,
  EventInsert,
  EventUpdate
} from '@/lib/supabase/events'
import EventForm from './EventForm'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function EventsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <EventsContent />
    </RoleGuard>
  )
}

function EventsContent() {
  const router = useRouter()
  const { profile } = useProfile()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const loadEvents = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parishEvents = await getParishEvents(profile.parish_id)
      setEvents(parishEvents)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los eventos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [profile])

  const handleCreate = () => {
    setEditingEvent(null)
    setShowForm(true)
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      return
    }

    setDeletingId(id)
    try {
      await deleteEvent(id)
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el evento'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublish = async (event: Event) => {
    setPublishingId(event.id)
    try {
      await publishEvent(event.id, !event.is_public)
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al actualizar el evento'))
    } finally {
      setPublishingId(null)
    }
  }

  const handleFormSubmit = async (data: EventInsert | EventUpdate) => {
    if (!profile?.parish_id) return

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data as EventUpdate)
      } else {
        await createEvent({ ...data, parish_id: profile.parish_id } as EventInsert)
      }
      setShowForm(false)
      setEditingEvent(null)
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingEvent ? 'actualizar' : 'crear'} el evento`))
      throw err
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingEvent(null)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isPast = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  // Group events by date for calendar view
  const eventsByDate = events.reduce((acc, event) => {
    const date = new Date(event.starts_at).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 text-[var(--foreground)]">
            Calendario Parroquial
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Gestiona misas, reuniones y actividades
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              Calendario
            </button>
          </div>
          <Button onClick={handleCreate}>
            + Crear Evento
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando eventos...</p>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">
              Aún no hay eventos. Crea tu primer evento para comenzar.
            </p>
            <Button onClick={handleCreate}>
              Crear Primer Evento
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && events.length > 0 && viewMode === 'list' && (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className={isPast(event.starts_at) ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      {event.is_public ? (
                        <Badge variant="success">Público</Badge>
                      ) : (
                        <Badge variant="warning">Privado</Badge>
                      )}
                      {isPast(event.starts_at) && (
                        <Badge variant="secondary">Pasado</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                      <p>
                        <strong>Cuándo:</strong> {formatDateTime(event.starts_at)}
                        {event.ends_at && ` - ${formatTime(event.ends_at)}`}
                      </p>
                      {event.location && (
                        <p>
                          <strong>Dónde:</strong> {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/events/${event.id}/mass-intentions`)}
                    >
                      Intenciones de Misa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(event)}
                      disabled={publishingId === event.id}
                    >
                      {publishingId === event.id
                        ? '...'
                        : event.is_public
                        ? 'Hacer Privado'
                        : 'Hacer Público'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                    >
                      {deletingId === event.id ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {event.description && (
                <CardContent>
                  <p className="text-[var(--card-foreground)] whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && events.length > 0 && viewMode === 'calendar' && (
        <div className="space-y-6">
          {Object.entries(eventsByDate).map(([date, dateEvents]) => (
            <div key={date}>
              <h2 className="text-xl font-semibold mb-3 text-[var(--foreground)] border-b border-[var(--border)] pb-2">
                {date}
              </h2>
              <div className="space-y-3">
                {dateEvents.map((event) => (
                  <Card key={event.id} className={isPast(event.starts_at) ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            {event.is_public ? (
                              <Badge variant="success">Público</Badge>
                            ) : (
                              <Badge variant="warning">Privado</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                            <p>
                              <strong>Hora:</strong> {formatTime(event.starts_at)}
                              {event.ends_at && ` - ${formatTime(event.ends_at)}`}
                            </p>
                            {event.location && (
                              <p>
                                <strong>Lugar:</strong> {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/events/${event.id}/mass-intentions`)}
                          >
                            Intenciones de Misa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(event)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {event.description && (
                      <CardContent>
                        <p className="text-sm text-[var(--card-foreground)] whitespace-pre-wrap">
                          {event.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <EventForm
          event={editingEvent}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}


