'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  createMassIntention,
  getMyMassIntentions,
  formatOfferingAmount,
  formatMassDate,
  formatMassTime,
  getStatusBadgeVariant,
  getStatusDisplayName,
  getStatusMessage,
  createMassIntentionCheckout,
  formatOfferingStatus,
  getOfferingStatusBadgeVariant,
  downloadReceipt,
  type MassIntention,
  type CreateMassIntentionInput,
} from '@/lib/supabase/mass-intentions'
import {
  getUpcomingPublicEvents,
  getEventIntentionCapacity,
  type Event,
  type EventIntentionCapacity,
} from '@/lib/supabase/events'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { translateError } from '@/lib/errors'
import { EnhancedErrorDisplay } from '@/components/permissions'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { SuccessConfirmation } from '@/components/guidance/SuccessConfirmation'

export default function MassIntentionsPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <MassIntentionsContent />
    </RoleGuard>
  )
}

function MassIntentionsContent() {
  const { profile } = useProfile()
  const [intentions, setIntentions] = useState<MassIntention[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateMassIntentionInput>({
    intention: '',
    event_id: '',
    offering_amount: null,
  })

  // Events and capacity state
  const [events, setEvents] = useState<Event[]>([])
  const [eventCapacities, setEventCapacities] = useState<Record<string, EventIntentionCapacity>>({})
  const [loadingEvents, setLoadingEvents] = useState(false)

  const loadIntentions = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      const data = await getMyMassIntentions()
      setIntentions(data)
    } catch (err) {
      setError(translateError(err, { action: 'load mass intentions', resource: 'mass intentions' }))
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    if (!profile?.parish_id) return

    setLoadingEvents(true)
    try {
      const upcomingEvents = await getUpcomingPublicEvents(profile.parish_id, 50)
      setEvents(upcomingEvents)

      // Load capacity for each event
      const capacities: Record<string, EventIntentionCapacity> = {}
      for (const event of upcomingEvents) {
        try {
          const capacity = await getEventIntentionCapacity(event.id)
          capacities[event.id] = capacity
        } catch (err) {
          console.error(`Error al cargar la capacidad para el evento ${event.id}:`, err)
        }
      }
      setEventCapacities(capacities)
    } catch (err) {
      console.error('Error al cargar eventos:', err)
    } finally {
      setLoadingEvents(false)
    }
  }

  const formatEventDateTime = (dateString: string) => {
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

  useEffect(() => {
    loadIntentions()
    loadEvents()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.intention.trim() || !formData.event_id) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createMassIntention(formData)
      // Reset form
      setFormData({
        intention: '',
        event_id: '',
        offering_amount: null,
      })
      setShowForm(false)
      setSubmitted(true)
      // Reload intentions
      await loadIntentions()
      // Reset success message after 8 seconds
      setTimeout(() => setSubmitted(false), 8000)
    } catch (err) {
      setError(translateError(err, { action: 'submit your Mass intention request', resource: 'Mass intention' }))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayOnline = async (intentionId: string) => {
    setProcessingPayment(intentionId)
    setError(null)
    try {
      const { checkout_url } = await createMassIntentionCheckout(intentionId)
      if (checkout_url) {
        window.location.href = checkout_url
      } else {
        throw new Error('No se recibió la URL de pago')
      }
    } catch (err) {
      setError(translateError(err, { action: 'create payment', resource: 'mass intention payment' }))
      setProcessingPayment(null)
    }
  }

  const handleDownloadReceipt = async (intentionId: string) => {
    setDownloadingReceipt(intentionId)
    setError(null)
    try {
      await downloadReceipt(intentionId)
    } catch (err) {
      setError(translateError(err, { action: 'download receipt', resource: 'receipt' }))
    } finally {
      setDownloadingReceipt(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-serif text-[var(--foreground)]">
          Intenciones de Misa
        </h1>
        <p className="text-base text-[var(--muted-foreground)] font-sans">
          Solicita una intención de misa para una misa específica.
        </p>
      </div>

      {/* Success Message */}
      {submitted && (
        <SuccessConfirmation
          title="Solicitud de Intención de Misa Recibida"
          message="Gracias por tu solicitud. Hemos recibido tu intención y será revisada por la oficina parroquial."
          nextSteps="El personal parroquial revisará tu solicitud y confirmará la programación. Puedes seguir el estado de tu solicitud en esta página y serás notificado una vez que haya sido confirmada."
          followUpTime="Puedes esperar una respuesta en unos días hábiles, dependiendo de la disponibilidad del horario de misa solicitado."
        />
      )}

      {/* Error Message */}
      {error && (
        <EnhancedErrorDisplay
          error={error}
          context={{ action: 'submit your Mass intention request', resource: 'Mass intention' }}
          dataSaved={false}
          onRetry={() => setError(null)}
          onDismiss={() => setError(null)}
        />
      )}

      {/* First-time Hint */}
      <FirstTimeHint
        storageKey="mass_intentions"
        title="¿Qué son las Intenciones de Misa?"
        description="Una intención de misa es una solicitud especial para que se ofrezcan oraciones por una intención específica durante una misa particular. Puedes solicitar que se ofrezca una misa por el descanso del alma de un ser querido, por la salud de alguien, o por cualquier intención especial. La oficina parroquial revisará tu solicitud y confirmará la programación."
      />

      {/* Primary Action */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto"
        >
          Solicitar Intención de Misa
        </Button>
      </div>

      {/* Submit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          if (!submitting) {
            setShowForm(false)
            setError(null)
          }
        }}
        title="Solicitar una Intención de Misa"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Intention <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.intention}
                onChange={(e) => setFormData({ ...formData, intention: e.target.value })}
                placeholder="Ej: Por el descanso del alma de Juan Pérez, o Por la salud e intenciones de mi familia"
                required
                disabled={submitting}
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Por favor proporciona la intención que deseas ofrecer en la Misa.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Seleccionar Misa <span className="text-red-500">*</span>
              </label>
              {loadingEvents ? (
                <div className="text-sm text-[var(--muted-foreground)] py-2">
                  Cargando misas disponibles...
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)] py-2">
                  No hay misas próximas disponibles. Por favor contacta a la oficina parroquial.
                </div>
              ) : (
                <select
                  value={formData.event_id}
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  required
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">-- Selecciona una Misa --</option>
                  {events.map((event) => {
                    const capacity = eventCapacities[event.id]
                    const isFull = capacity?.is_full ?? false
                    const availableSlots = capacity?.available_slots ?? 0
                    const maxIntentions = capacity?.max_intentions ?? event.max_intentions ?? 10
                    
                    return (
                      <option
                        key={event.id}
                        value={event.id}
                        disabled={isFull}
                      >
                        {formatEventDateTime(event.starts_at)} - {event.title}
                        {isFull
                          ? ' (Completo)'
                          : ` (${availableSlots}/${maxIntentions} disponibles)`}
                      </option>
                    )
                  })}
                </select>
              )}
              {formData.event_id && eventCapacities[formData.event_id] && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  {eventCapacities[formData.event_id].is_full ? (
                    <span className="text-red-500">Esta Misa está llena. Por favor selecciona otra Misa.</span>
                  ) : (
                    <span>
                      {eventCapacities[formData.event_id].available_slots} of{' '}
                      {eventCapacities[formData.event_id].max_intentions} slots available
                    </span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Ofrenda voluntaria (opcional)
              </label>
              <Input
                type="number"
                value={formData.offering_amount ? formData.offering_amount / 100 : ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({
                    ...formData,
                    offering_amount: value ? Math.round(parseFloat(value) * 100) : null,
                  })
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={submitting}
                className="w-full"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                La parroquia confirmará la fecha. La ofrenda no es obligatoria.
              </p>
            </div>

            {/* What happens next? */}
            <Card className="bg-[var(--secondary)] border-[var(--border)]">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  ¿Qué sigue?
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Su solicitud será revisada por la oficina parroquial. Confirmarán la fecha y le contactarán si se necesita información adicional. Puede seguir el estado de su solicitud en esta página.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setError(null)
                }}
                disabled={submitting}
                className="w-full sm:w-auto sm:flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full sm:w-auto sm:flex-1"
              >
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* My Intentions List */}
      <div className="space-y-2">
        <h2 className="text-xl font-serif text-[var(--foreground)]">
          Mis Intenciones de Misa
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track the status of your Mass intention requests.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando tus intenciones de misa...</p>
        </div>
      ) : intentions.length === 0 ? (
        <EmptyState
          title="Aún No Hay Solicitudes de Intención de Misa"
          description="Cuando solicites una intención de misa, aparecerá aquí para que puedas rastrear su estado. Una intención de misa te permite que se ofrezcan oraciones por una intención específica—como por el alma de un ser querido, la salud de alguien o una necesidad especial—durante una misa en particular."
          secondaryDescription="Después de enviar una solicitud, la oficina parroquial la revisará y confirmará la programación. Podrás ver el estado aquí y recibir actualizaciones mientras se procesa tu solicitud."
          actionLabel="Solicitar una Intención de Misa"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {intentions.map((intention) => (
            <Card key={intention.id} className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-lg font-serif text-[var(--foreground)] flex-1">
                    {formatMassDate(intention.mass_date)} a las {formatMassTime(intention.mass_time)}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(intention.status)}>
                    {getStatusDisplayName(intention.status)}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  Solicitado el {new Date(intention.created_at).toLocaleDateString('es-ES')}
                  {intention.offering_amount && (
                    <>
                      {' • '}
                      {formatOfferingAmount(intention.offering_amount)}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                  {intention.intention}
                </p>
                
                {/* Offering Status and Payment Button */}
                {intention.offering_amount && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[var(--muted-foreground)]">Estipendio:</span>
                    <Badge variant={getOfferingStatusBadgeVariant(intention.offering_status)}>
                      {formatOfferingStatus(intention.offering_status)}
                    </Badge>
                    {intention.offering_status === 'pending' && 
                     (intention.status === 'promoted' || intention.status === 'confirmed') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePayOnline(intention.id)}
                        disabled={processingPayment === intention.id}
                        className="ml-auto"
                      >
                        {processingPayment === intention.id ? 'Procesando...' : 'Pagar estipendio en línea'}
                      </Button>
                    )}
                    {intention.offering_status === 'paid_stripe' && (
                      <span className="text-xs text-[var(--muted-foreground)] ml-2">
                        Pago recibido, pendiente de confirmación parroquial
                      </span>
                    )}
                    {/* Download receipt button - show if offering is paid */}
                    {(intention.offering_status === 'paid_cash' || 
                      intention.offering_status === 'paid_transfer' || 
                      intention.offering_status === 'paid_stripe') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(intention.id)}
                        disabled={downloadingReceipt === intention.id}
                        className="ml-auto"
                      >
                        {downloadingReceipt === intention.id ? 'Descargando...' : 'Descargar Recibo'}
                      </Button>
                    )}
                  </div>
                )}

                <Card className="bg-[var(--secondary)] border-[var(--border)]">
                  <CardContent className="pt-4">
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      {getStatusMessage(intention.status)}
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
