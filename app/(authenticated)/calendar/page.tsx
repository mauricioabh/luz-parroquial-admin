'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  getUpcomingPublicEvents,
  getEventsInRange,
  Event
} from '@/lib/supabase/events'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function CalendarPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <CalendarContent />
    </RoleGuard>
  )
}

function CalendarContent() {
  const { profile } = useProfile()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [viewMode, setViewMode] = useState<'upcoming' | 'calendar'>('upcoming')
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  const loadUpcomingEvents = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const upcomingEvents = await getUpcomingPublicEvents(profile.parish_id, 20)
      setEvents(upcomingEvents)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los eventos'))
    } finally {
      setLoading(false)
    }
  }

  const loadMonthEvents = async () => {
    if (!profile?.parish_id) return

    setLoading(true)
    setError(null)

    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth()
      const startDate = new Date(year, month, 1).toISOString()
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const monthEvents = await getEventsInRange(
        profile.parish_id,
        startDate,
        endDate,
        false
      )
      setEvents(monthEvents)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los eventos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    
    if (viewMode === 'upcoming') {
      loadUpcomingEvents()
    } else {
      loadMonthEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, viewMode, selectedMonth])

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = formatDate(event.starts_at)
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setSelectedMonth(newMonth)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2 text-[var(--foreground)]">
          Calendario Parroquial
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Próximas misas, reuniones y actividades
        </p>
      </div>

      <div className="mb-6 flex gap-3">
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'upcoming'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
            }`}
          >
            Próximos
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

        {viewMode === 'calendar' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] text-[var(--foreground)]"
            >
              ←
            </button>
            <h2 className="text-lg font-semibold text-[var(--foreground)] min-w-[200px] text-center">
              {selectedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] text-[var(--foreground)]"
            >
              →
            </button>
          </div>
        )}
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
            <p className="text-[var(--muted-foreground)]">
              {viewMode === 'upcoming'
                ? 'No hay eventos próximos programados.'
                : 'No hay eventos programados para este mes.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && events.length > 0 && viewMode === 'upcoming' && (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
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
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle className="text-lg mb-2">{event.title}</CardTitle>
                      <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                        <p>
                          <strong>Hora:</strong> {formatTime(event.starts_at)}
                          {event.ends_at && ` - ${formatTime(event.ends_at)}`}
                        </p>
                        {event.location && (
                          <p>
                            <strong>Ubicación:</strong> {event.location}
                          </p>
                        )}
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
    </div>
  )
}

