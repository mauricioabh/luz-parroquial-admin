'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../../../RoleGuard'
import {
  getMassIntentionsByEventId,
  updateMassIntentionStatus,
  markMassIntentionsFulfilled,
  formatOfferingAmount,
  formatOfferingStatus,
  getOfferingStatusBadgeVariant,
  getStatusBadgeVariant,
  getStatusDisplayName,
  type MassIntentionWithUser,
  type MassIntentionStatus,
} from '@/lib/supabase/mass-intentions'
import { getEvent, type Event } from '@/lib/supabase/events'
import { supabase } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'

export default function EventMassIntentionsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <EventMassIntentionsContent />
    </RoleGuard>
  )
}

function EventMassIntentionsContent() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useProfile()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<Event | null>(null)
  const [intentions, setIntentions] = useState<MassIntentionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Status update modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [intentionToUpdate, setIntentionToUpdate] = useState<MassIntentionWithUser | null>(null)
  const [newStatus, setNewStatus] = useState<MassIntentionStatus>('scheduled')
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Mark all fulfilled modal
  const [fulfillAllModalOpen, setFulfillAllModalOpen] = useState(false)
  const [fulfillAllNotes, setFulfillAllNotes] = useState('')
  const [fulfillingAll, setFulfillingAll] = useState(false)

  useEffect(() => {
    if (!eventId || !profile?.parish_id) return
    loadData()
  }, [eventId, profile])

  const loadData = async () => {
    if (!eventId || !profile?.parish_id) return

    setLoading(true)
    setError(null)

    try {
      // Load event and intentions in parallel
      const [eventData, intentionsData] = await Promise.all([
        getEvent(eventId),
        getMassIntentionsByEventId(eventId),
      ])

      if (!eventData) {
        setError('Evento no encontrado')
        setLoading(false)
        return
      }

      // Verify parish boundary
      if (eventData.parish_id !== profile.parish_id) {
        setError('No tienes acceso a este evento')
        setLoading(false)
        return
      }

      setEvent(eventData)
      setIntentions(intentionsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = (intention: MassIntentionWithUser) => {
    setIntentionToUpdate(intention)
    setNewStatus(intention.status === 'requested' ? 'scheduled' : 'fulfilled')
    setNotes(intention.notes || '')
    setUpdateModalOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!intentionToUpdate) return

    setUpdating(true)
    const previousIntentions = [...intentions]
    
    try {
      // Optimistic update
      setIntentions(
        intentions.map((i) =>
          i.id === intentionToUpdate.id
            ? { ...i, status: newStatus, notes: notes || null }
            : i
        )
      )

      await updateMassIntentionStatus(intentionToUpdate.id, {
        status: newStatus,
        notes: notes || null,
      })

      // Reload to get fresh data
      await loadData()
      setUpdateModalOpen(false)
      setIntentionToUpdate(null)
      setNotes('')
    } catch (err) {
      // Revert on error
      setIntentions(previousIntentions)
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleDownloadPdf = async () => {
    if (!eventId || !event) return

    setDownloadingPdf(true)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Debes iniciar sesión para descargar el PDF')
        return
      }

      // Fetch the PDF from the API
      const response = await fetch(`/api/mass-pdf?event_id=${eventId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar el PDF')
      }

      // Create a blob and download it
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mass-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${eventId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleMarkAllFulfilled = async () => {
    if (!eventId) return

    setFulfillingAll(true)
    setError(null)

    try {
      const result = await markMassIntentionsFulfilled(eventId, fulfillAllNotes || null)
      
      // Show success message
      if (result.intentions_updated > 0) {
        // Reload data to reflect changes
        await loadData()
        setFulfillAllModalOpen(false)
        setFulfillAllNotes('')
      } else {
        setError('No se actualizaron intenciones. Todas las intenciones pueden estar ya cumplidas.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar las intenciones como cumplidas')
    } finally {
      setFulfillingAll(false)
    }
  }

  // Check if there are any intentions that are not fulfilled
  const hasUnfulfilledIntentions = intentions.some(i => i.status !== 'fulfilled')

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-center items-center py-20">
          <p className="text-[var(--muted-foreground)] text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6 p-5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
          <p className="font-semibold mb-1">Error</p>
          <p className="text-sm">{error || 'Evento no encontrado'}</p>
        </div>
        <Button onClick={() => router.back()} variant="outline">
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header with event details */}
      <div>
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2"
        >
          ← Volver
        </Button>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold text-[var(--foreground)] tracking-tight">
              {event.title}
            </h1>
            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              variant="outline"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <svg
                className={`w-4 h-4 ${downloadingPdf ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {downloadingPdf ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                )}
              </svg>
              {downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-base text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-[var(--foreground)]">
                {formatEventDate(event.starts_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-[var(--foreground)]">
                {formatEventTime(event.starts_at)}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mass Intentions List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Intenciones de Misa</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)] mt-1.5">
                {intentions.length === 0
                  ? 'No hay intenciones para esta Misa'
                  : `${intentions.length} intención${intentions.length !== 1 ? 'es' : ''} vinculada${intentions.length !== 1 ? 's' : ''} a esta Misa`}
              </p>
            </div>
            {intentions.length > 0 && hasUnfulfilledIntentions && (
              <Button
                onClick={() => setFulfillAllModalOpen(true)}
                variant="default"
                size="sm"
                className="whitespace-nowrap"
              >
                Marcar Todas como Cumplidas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {intentions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--muted)] mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[var(--muted-foreground)] text-base">
                No se han solicitado intenciones de misa para esta Misa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {intentions.map((intention) => (
                <div
                  key={intention.id}
                  className="p-5 border border-[var(--border)] rounded-xl hover:border-[var(--primary)]/30 hover:bg-[var(--secondary)]/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-base leading-relaxed text-[var(--foreground)] font-medium">
                        {intention.intention}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted-foreground)]">
                        <span>
                          <span className="font-medium text-[var(--foreground)]">Solicitado por:</span>{' '}
                          {intention.user_name || 'Anónimo'}
                        </span>
                        {intention.offering_amount && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-[var(--foreground)] font-medium">
                              {formatOfferingAmount(intention.offering_amount)}
                            </span>
                            <Badge
                              variant={getOfferingStatusBadgeVariant(intention.offering_status)}
                              className="text-xs"
                            >
                              {formatOfferingStatus(intention.offering_status)}
                            </Badge>
                          </span>
                        )}
                      </div>
                      {intention.notes && (
                        <div className="pt-2 border-t border-[var(--border)]">
                          <p className="text-sm text-[var(--muted-foreground)] italic leading-relaxed">
                            {intention.notes}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <Badge 
                        variant={getStatusBadgeVariant(intention.status)}
                        className="text-xs font-medium px-3 py-1"
                      >
                        {getStatusDisplayName(intention.status)}
                      </Badge>
                      {intention.status !== 'fulfilled' && (
                        <Button
                          onClick={() => handleUpdateStatus(intention)}
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          Actualizar Estado
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false)
          setIntentionToUpdate(null)
          setNotes('')
        }}
        title="Actualizar Estado de Intención de Misa"
        size="md"
      >
        {intentionToUpdate && (
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Intención
              </p>
              <p className="text-base leading-relaxed text-[var(--foreground)]">
                {intentionToUpdate.intention}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                Nuevo Estado
              </label>
              <div className="space-y-3">
                {intentionToUpdate.status === 'requested' && (
                  <label className="flex items-center space-x-3 p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="scheduled"
                      checked={newStatus === 'scheduled'}
                      onChange={(e) =>
                        setNewStatus(e.target.value as MassIntentionStatus)
                      }
                      className="w-4 h-4 text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                    />
                    <div>
                      <span className="font-medium text-[var(--foreground)]">Programada</span>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        La intención ha sido confirmada y programada para esta Misa
                      </p>
                    </div>
                  </label>
                )}
                {intentionToUpdate.status === 'scheduled' && (
                  <label className="flex items-center space-x-3 p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="fulfilled"
                      checked={newStatus === 'fulfilled'}
                      onChange={(e) =>
                        setNewStatus(e.target.value as MassIntentionStatus)
                      }
                      className="w-4 h-4 text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                    />
                    <div>
                      <span className="font-medium text-[var(--foreground)]">Cumplida</span>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        La Misa ha sido celebrada y la intención ha sido cumplida
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                Notas <span className="text-[var(--muted-foreground)] font-normal">(opcional)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega cualquier nota sobre esta intención..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button
                onClick={() => {
                  setUpdateModalOpen(false)
                  setIntentionToUpdate(null)
                  setNotes('')
                }}
                variant="outline"
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updating}
              >
                {updating ? 'Actualizando...' : 'Actualizar Estado'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Mark All Fulfilled Confirmation Modal */}
      <Modal
        isOpen={fulfillAllModalOpen}
        onClose={() => {
          setFulfillAllModalOpen(false)
          setFulfillAllNotes('')
        }}
        title="Marcar Todas las Intenciones como Cumplidas"
        size="md"
      >
        <div className="p-6 space-y-6">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Esta acción es irreversible
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Todas las intenciones de misa para esta Misa serán marcadas como cumplidas. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">
                {intentions.filter(i => i.status !== 'fulfilled').length}
              </span>{' '}
              intención{intentions.filter(i => i.status !== 'fulfilled').length !== 1 ? 'es' : ''} será{intentions.filter(i => i.status !== 'fulfilled').length !== 1 ? 'n' : ''} marcada{intentions.filter(i => i.status !== 'fulfilled').length !== 1 ? 's' : ''} como cumplida{intentions.filter(i => i.status !== 'fulfilled').length !== 1 ? 's' : ''}.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--foreground)]">
              Notas <span className="text-[var(--muted-foreground)] font-normal">(opcional)</span>
            </label>
            <Textarea
              value={fulfillAllNotes}
              onChange={(e) => setFulfillAllNotes(e.target.value)}
              placeholder="Agrega cualquier nota sobre marcar estas intenciones como cumplidas..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Estas notas se agregarán a todas las intenciones que se están actualizando.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              onClick={() => {
                setFulfillAllModalOpen(false)
                setFulfillAllNotes('')
              }}
              variant="outline"
              disabled={fulfillingAll}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarkAllFulfilled}
              disabled={fulfillingAll}
              variant="default"
            >
              {fulfillingAll ? 'Marcando como Cumplidas...' : 'Marcar Todas como Cumplidas'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

