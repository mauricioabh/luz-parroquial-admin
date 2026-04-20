'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../../RoleGuard'
import {
  getWaitlistMassIntentions,
  promoteMassIntention,
  formatOfferingAmount,
  formatMassDate,
  formatMassTime,
  getStatusBadgeVariant,
  getStatusDisplayName,
  type MassIntentionWithUser,
} from '@/lib/supabase/mass-intentions'
import {
  getEventsWithAvailableCapacity,
  type EventWithCapacity,
} from '@/lib/supabase/events'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { translateError } from '@/lib/errors'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { ActionConfirmation } from '@/components/guidance/ActionConfirmation'

export default function WaitlistPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <WaitlistContent />
    </RoleGuard>
  )
}

function WaitlistContent() {
  const { profile } = useProfile()
  const [intentions, setIntentions] = useState<MassIntentionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Promotion modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false)
  const [intentionToPromote, setIntentionToPromote] = useState<MassIntentionWithUser | null>(null)
  const [availableEvents, setAvailableEvents] = useState<EventWithCapacity[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [pastoralNotes, setPastoralNotes] = useState('')
  const [promoting, setPromoting] = useState(false)
  
  // Confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<{
    title: string
    message: string
    affectedItems: string[]
    nextSteps: string
  } | null>(null)

  const loadWaitlist = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      const data = await getWaitlistMassIntentions()
      setIntentions(data)
    } catch (err) {
      setError(translateError(err, { action: 'load waitlist', resource: 'waitlist' }))
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableEvents = async () => {
    if (!profile?.parish_id) return

    try {
      const events = await getEventsWithAvailableCapacity(profile.parish_id)
      setAvailableEvents(events)
    } catch (err) {
      console.error('Error al cargar los eventos disponibles:', err)
      setAvailableEvents([])
    }
  }

  useEffect(() => {
    loadWaitlist()
    loadAvailableEvents()
  }, [profile])

  const handlePromoteClick = (intention: MassIntentionWithUser) => {
    setIntentionToPromote(intention)
    setSelectedEventId('')
    setPastoralNotes('')
    setPromoteModalOpen(true)
    loadAvailableEvents() // Refresh available events
  }

  const handlePromote = async () => {
    if (!intentionToPromote || !selectedEventId) return

    setPromoting(true)
    setError(null)
    try {
      const result = await promoteMassIntention(
        intentionToPromote.id,
        selectedEventId,
        pastoralNotes || null
      )

      // Show confirmation
      setConfirmationMessage({
        title: 'Intención Promovida',
        message: `La intención ha sido promovida exitosamente a la misa seleccionada.`,
        affectedItems: [
          `Intención: ${intentionToPromote.intention}`,
          `Misa: ${result.event_title}`,
          `Fecha: ${new Date(result.event_date).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          `Cupos restantes: ${result.available_slots_remaining}`,
        ],
        nextSteps: 'La intención ahora tiene estado "promovida". Recuerda que no se cobrará ningún estipendio hasta que se confirme la intención.',
      })
      setShowConfirmation(true)

      // Close modal and reload waitlist
      setPromoteModalOpen(false)
      setIntentionToPromote(null)
      setSelectedEventId('')
      setPastoralNotes('')
      await loadWaitlist()
      await loadAvailableEvents()
    } catch (err) {
      setError(translateError(err, { action: 'promote intention', resource: 'mass intention' }))
    } finally {
      setPromoting(false)
    }
  }

  const selectedEvent = availableEvents.find(e => e.id === selectedEventId)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[var(--foreground)] mb-2">
          Waitlist de Intenciones
        </h1>
        <p className="text-[var(--muted-foreground)] text-lg">
          Gestiona manualmente las intenciones en lista de espera y promuévelas a misas disponibles
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* First-time Hint */}
      <FirstTimeHint
        storageKey="admin_waitlist"
        title="Gestión Manual de Waitlist"
        description="Las intenciones en waitlist están esperando ser promovidas a una misa específica. Aquí puedes revisar cada intención y promoverla manualmente a una misa con cupo disponible. Todo el proceso es manual y reversible."
      />

      {/* Action Confirmation */}
      {showConfirmation && confirmationMessage && (
        <div className="mb-6">
          <ActionConfirmation
            title={confirmationMessage.title}
            message={confirmationMessage.message}
            affectedItems={confirmationMessage.affectedItems}
            nextSteps={confirmationMessage.nextSteps}
          />
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-[var(--muted-foreground)]">Cargando waitlist...</p>
          </CardContent>
        </Card>
      ) : intentions.length === 0 ? (
        <EmptyState
          title="No hay intenciones en waitlist"
          description="Actualmente no hay intenciones esperando ser promovidas."
        />
      ) : (
        <div className="space-y-4">
          {intentions.map((intention) => (
            <Card key={intention.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant={getStatusBadgeVariant(intention.status)}>
                        {getStatusDisplayName(intention.status)}
                      </Badge>
                      {intention.offering_amount && (
                        <Badge variant="default">
                          {formatOfferingAmount(intention.offering_amount)}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-lg font-medium mb-2">{intention.intention}</p>
                    
                    <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                      <p>
                        <span className="font-medium">Solicitante:</span>{' '}
                        {intention.user_name || 'Usuario desconocido'}
                      </p>
                      {intention.mass_date && (
                        <p>
                          <span className="font-medium">Fecha solicitada:</span>{' '}
                          {formatMassDate(intention.mass_date)}
                          {intention.mass_time && ` a las ${formatMassTime(intention.mass_time)}`}
                        </p>
                      )}
                      {intention.notes && (
                        <p>
                          <span className="font-medium">Notas:</span> {intention.notes}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Creada:</span>{' '}
                        {new Date(intention.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePromoteClick(intention)}
                      variant="default"
                    >
                      Promover a Misa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Promote Modal */}
      <Modal
        isOpen={promoteModalOpen}
        onClose={() => {
          setPromoteModalOpen(false)
          setIntentionToPromote(null)
          setSelectedEventId('')
          setPastoralNotes('')
        }}
        title="Promover Intención a Misa"
      >
        {intentionToPromote && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-2">Intención:</p>
              <p className="font-medium">{intentionToPromote.intention}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Seleccionar Misa *
              </label>
              {availableEvents.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No hay misas con cupo disponible en este momento.
                </p>
              ) : (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
                >
                  <option value="">Selecciona una misa...</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.starts_at).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} ({event.available_slots} cupos disponibles)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedEvent && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium mb-2">Información de la Misa:</p>
                <ul className="text-sm space-y-1">
                  <li>
                    <span className="font-medium">Título:</span> {selectedEvent.title}
                  </li>
                  <li>
                    <span className="font-medium">Fecha:</span>{' '}
                    {new Date(selectedEvent.starts_at).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </li>
                  <li>
                    <span className="font-medium">Cupos disponibles:</span>{' '}
                    {selectedEvent.available_slots} de {selectedEvent.max_intentions}
                  </li>
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Notas Pastorales (opcional)
              </label>
              <Textarea
                value={pastoralNotes}
                onChange={(e) => setPastoralNotes(e.target.value)}
                placeholder="Agregar notas pastorales sobre esta promoción..."
                rows={3}
              />
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm font-medium text-yellow-800 mb-1">
                ⚠️ Advertencia Importante
              </p>
              <p className="text-sm text-yellow-700">
                No se cobrará ningún estipendio hasta que la intención sea confirmada. 
                El estado "promovida" no es lo mismo que "confirmada". 
                Solo las intenciones confirmadas permiten pagos.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPromoteModalOpen(false)
                  setIntentionToPromote(null)
                  setSelectedEventId('')
                  setPastoralNotes('')
                }}
                disabled={promoting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePromote}
                disabled={!selectedEventId || promoting}
              >
                {promoting ? 'Promoviendo...' : 'Confirmar Promoción'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
