'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getMassIntentionsFiltered,
  updateMassIntentionStatus,
  updateMassIntentionOfferingStatus,
  formatOfferingAmount,
  formatOfferingStatus,
  getOfferingStatusBadgeVariant,
  formatMassDate,
  formatMassTime,
  getStatusBadgeVariant,
  getStatusDisplayName,
  getMassIntentionStripePayment,
  generateReceipt,
  downloadReceipt,
  receiptExists,
  type MassIntentionWithUser,
  type MassIntentionStatus,
  type OfferingStatus,
} from '@/lib/supabase/mass-intentions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { getCached, setCached, makeCacheKey } from '@/lib/cache'
import { useOnReconnect } from '@/lib/offline/network'
import { translateError } from '@/lib/errors'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { ActionConfirmation } from '@/components/guidance/ActionConfirmation'

export default function MassIntentionsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <MassIntentionsContent />
    </RoleGuard>
  )
}

function MassIntentionsContent() {
  const { profile } = useProfile()
  const [intentions, setIntentions] = useState<MassIntentionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterStatus, setFilterStatus] = useState<MassIntentionStatus | ''>('')

  // Status update modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [intentionToUpdate, setIntentionToUpdate] = useState<MassIntentionWithUser | null>(null)
  const [newStatus, setNewStatus] = useState<MassIntentionStatus>('scheduled')
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // Offering status update
  const [updatingOffering, setUpdatingOffering] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<{
    title: string
    message: string
    affectedItems: string[]
    nextSteps: string
  } | null>(null)

  // Receipt generation
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null)
  const [receiptStatuses, setReceiptStatuses] = useState<Record<string, boolean>>({})

  // Check receipt statuses on load
  useEffect(() => {
    if (intentions.length > 0) {
      const checkReceipts = async () => {
        const statuses: Record<string, boolean> = {}
        for (const intention of intentions) {
          if (intention.offering_status === 'paid_cash' || 
              intention.offering_status === 'paid_transfer' || 
              intention.offering_status === 'paid_stripe') {
            try {
              const exists = await receiptExists(intention.id)
              statuses[intention.id] = exists
            } catch (err) {
              statuses[intention.id] = false
            }
          }
        }
        setReceiptStatuses(statuses)
      }
      checkReceipts()
    }
  }, [intentions])

  const loadIntentions = async () => {
    if (!profile?.parish_id) return

    setLoading(true)
    setError(null)
    try {
      const data = await getMassIntentionsFiltered({
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        status: filterStatus || undefined,
      })
      setIntentions(data)
      const cacheKey = makeCacheKey([
        'massIntentions',
        profile.parish_id,
        filterStartDate || 'nil',
        filterEndDate || 'nil',
        filterStatus || 'all',
      ])
      setCached(cacheKey, data)
    } catch (err) {
      const cacheKey = makeCacheKey([
        'massIntentions',
        profile?.parish_id,
        filterStartDate || 'nil',
        filterEndDate || 'nil',
        filterStatus || 'all',
      ])
      const cached = getCached<MassIntentionWithUser[]>(cacheKey)
      if (cached) {
        setIntentions(cached)
      } else {
        setError(translateError(err, { action: 'load mass intentions', resource: 'mass intentions' }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntentions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, filterStartDate, filterEndDate, filterStatus])

  useOnReconnect(() => {
    if (profile) {
      loadIntentions()
    }
  })

  const handleUpdateStatusClick = (intention: MassIntentionWithUser) => {
    setIntentionToUpdate(intention)
    setNewStatus(intention.status === 'requested' ? 'scheduled' : 'fulfilled')
    setNotes(intention.notes || '')
    setUpdateModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!intentionToUpdate) return

    setUpdating(true)
    try {
      await updateMassIntentionStatus(intentionToUpdate.id, {
        status: newStatus,
        notes: notes || null,
      })
      
      // Show confirmation
      const statusDisplay = newStatus === 'scheduled' ? 'scheduled' : 'fulfilled'
      const parishionerName = intentionToUpdate.user_name || 'el feligrés'
      setConfirmationMessage({
        title: `Intención de misa marcada como ${statusDisplay === 'scheduled' ? 'programada' : 'cumplida'}`,
        message: `La intención de misa ha sido actualizada exitosamente.`,
        affectedItems: [
          `Feligrés: ${parishionerName}`,
          `Intention: ${intentionToUpdate.intention.substring(0, 50)}${intentionToUpdate.intention.length > 50 ? '...' : ''}`,
          `Status: ${statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1)}`,
        ],
        nextSteps: newStatus === 'scheduled' 
          ? 'El feligrés verá que su intención ha sido programada. Puedes marcarla como cumplida después de que se haya ofrecido la Misa.'
          : 'El feligrés verá que su intención ha sido cumplida. Esto completa la solicitud.',
      })
      setShowConfirmation(true)
      
      await loadIntentions()
      setUpdateModalOpen(false)
      setIntentionToUpdate(null)
      setNotes('')
      
      // Auto-dismiss confirmation after 8 seconds
      setTimeout(() => {
        setShowConfirmation(false)
        setConfirmationMessage(null)
      }, 8000)
    } catch (err) {
      setError(translateError(err, { action: 'update mass intention status', resource: 'mass intention' }))
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateOfferingStatus = async (intentionId: string, newStatus: OfferingStatus) => {
    setUpdatingOffering(intentionId)
    try {
      await updateMassIntentionOfferingStatus(intentionId, newStatus)
      await loadIntentions()
    } catch (err) {
      setError(translateError(err, { action: 'update offering status', resource: 'offering status' }))
    } finally {
      setUpdatingOffering(null)
    }
  }

  const handleGenerateReceipt = async (intentionId: string) => {
    setGeneratingReceipt(intentionId)
    try {
      // Check if receipt exists - if so, download it; otherwise generate it
      const exists = receiptStatuses[intentionId]
      if (exists) {
        await downloadReceipt(intentionId)
      } else {
        await generateReceipt(intentionId)
        // Update receipt status
        setReceiptStatuses(prev => ({ ...prev, [intentionId]: true }))
      }
    } catch (err) {
      setError(translateError(err, { action: 'generate receipt', resource: 'receipt' }))
    } finally {
      setGeneratingReceipt(null)
    }
  }

  const clearFilters = () => {
    setFilterStartDate('')
    setFilterEndDate('')
    setFilterStatus('')
  }

  const getNextStatus = (currentStatus: MassIntentionStatus): MassIntentionStatus | null => {
    switch (currentStatus) {
      case 'requested':
        return 'scheduled'
      case 'scheduled':
        return 'fulfilled'
      case 'fulfilled':
        return null
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[var(--foreground)] mb-2">
          Intenciones de Misa
        </h1>
        <p className="text-[var(--muted-foreground)] text-lg">
          Gestiona solicitudes de intenciones de misa de los feligreses
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
        storageKey="admin_mass_intentions"
        title="Gestión de Intenciones de Misa"
        description="Los feligreses envían solicitudes de intención de misa a través de su panel. Aquí puedes revisar estas solicitudes, programarlas para misas específicas y marcarlas como cumplidas una vez que se haya ofrecido la misa. Verás el texto de la intención, la fecha y hora solicitada, el nombre del feligrés y cualquier monto de estipendio."
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

      {/* Filters */}
      <div className="mb-8 pb-6 border-b border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
              Fecha de Inicio
            </label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
              Fecha de Fin
            </label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
              Estado
            </label>
            <select
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as MassIntentionStatus | '')}
            >
              <option value="">Todos</option>
              <option value="requested">Solicitado</option>
              <option value="scheduled">Programado</option>
              <option value="fulfilled">Cumplido</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Intentions List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando intenciones de misa...</p>
        </div>
      ) : intentions.length === 0 ? (
        <EmptyState
          title="No Hay Intenciones de Misa"
          description="Las solicitudes de intenciones de misa de los feligreses aparecerán aquí. Cuando un feligrés envía una solicitud, verás el texto de la intención, su fecha y hora preferidas, y cualquier monto de ofrenda."
          secondaryDescription="Los feligreses pueden enviar solicitudes a través de su panel. Una vez que una solicitud aparezca aquí, puedes programarla para una misa específica y actualizar su estado mientras la procesas. El feligrés verá las actualizaciones en su propio panel."
          actionLabel="Ver Todas las Intenciones"
          onAction={clearFilters}
        />
      ) : (
        <div className="space-y-0">
          {intentions.map((intention, index) => {
            const nextStatus = getNextStatus(intention.status)
            return (
              <div
                key={intention.id}
                className={`
                  border-b border-[var(--border)] 
                  py-6 px-2
                  ${index === 0 ? 'border-t' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg font-serif text-[var(--foreground)]">
                        {formatMassDate(intention.mass_date)}{intention.mass_time ? ` a las ${formatMassTime(intention.mass_time)}` : ''}
                      </span>
                      <Badge variant={getStatusBadgeVariant(intention.status)}>
                        {getStatusDisplayName(intention.status)}
                      </Badge>
                    </div>
                    <p className="text-[var(--foreground)] mb-3 whitespace-pre-wrap">
                      {intention.intention}
                    </p>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {intention.user_name && (
                        <>
                          <span>Solicitado por {intention.user_name}</span>
                          {' • '}
                        </>
                      )}
                      <span>{new Date(intention.created_at).toLocaleDateString('es-ES')}</span>
                      {intention.offering_amount && (
                        <>
                          {' • '}
                          <span>{formatOfferingAmount(intention.offering_amount)}</span>
                        </>
                      )}
                    </div>
                    {(intention.offering_amount || intention.offering_status) && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--muted-foreground)]">Ofrenda:</span>
                          <Badge variant={getOfferingStatusBadgeVariant(intention.offering_status)}>
                            {formatOfferingStatus(intention.offering_status)}
                          </Badge>
                          {intention.offering_status === 'pending' && intention.offering_amount && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateOfferingStatus(intention.id, 'received')}
                              disabled={updatingOffering === intention.id}
                              className="ml-2"
                            >
                              {updatingOffering === intention.id ? 'Actualizando...' : 'Marcar ofrenda como recibida'}
                            </Button>
                          )}
                        </div>
                        {intention.offering_status === 'paid_stripe' && (
                          <div className="text-xs text-[var(--muted-foreground)] pl-4 border-l-2 border-[var(--primary)]">
                            <span className="font-medium">Pagado en línea (Stripe)</span>
                            <StripePaymentInfo intentionId={intention.id} />
                          </div>
                        )}
                        {/* Receipt generation button - only show if offering is paid */}
                        {(intention.offering_status === 'paid_cash' || 
                          intention.offering_status === 'paid_transfer' || 
                          intention.offering_status === 'paid_stripe') && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateReceipt(intention.id)}
                              disabled={generatingReceipt === intention.id}
                            >
                              {generatingReceipt === intention.id 
                                ? 'Generando...' 
                                : receiptStatuses[intention.id] 
                                  ? 'Descargar Recibo' 
                                  : 'Generar Recibo'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {intention.notes && (
                      <div className="mt-3 p-3 bg-[var(--secondary)] rounded-md">
                        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Notas del Administrador:</p>
                        <p className="text-sm text-[var(--foreground)]">{intention.notes}</p>
                      </div>
                    )}
                  </div>
                  {nextStatus && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUpdateStatusClick(intention)}
                      className="flex-shrink-0"
                    >
                      Marcar como {nextStatus === 'scheduled' ? 'Programado' : nextStatus === 'fulfilled' ? 'Cumplido' : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Update Status Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => {
          if (!updating) {
            setUpdateModalOpen(false)
            setIntentionToUpdate(null)
            setNotes('')
          }
        }}
        title="Actualizar Estado de Intención de Misa"
      >
        <div className="p-6">
          {intentionToUpdate && (
            <>
              <div className="mb-4 p-4 bg-[var(--secondary)] rounded-lg">
                <p className="font-medium text-sm mb-1">Intención:</p>
                <p className="text-sm text-[var(--foreground)] mb-2">{intentionToUpdate.intention}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatMassDate(intentionToUpdate.mass_date)}{intentionToUpdate.mass_time ? ` a las ${formatMassTime(intentionToUpdate.mass_time)}` : ''}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                  Nuevo Estado
                </label>
                <select
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as MassIntentionStatus)}
                >
                  <option value="scheduled">Programado</option>
                  <option value="fulfilled">Cumplido</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                  Notas (Opcional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega cualquier nota sobre esta intención..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUpdateModalOpen(false)
                    setIntentionToUpdate(null)
                    setNotes('')
                  }}
                  disabled={updating}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  onClick={handleUpdateStatus}
                  disabled={updating}
                >
                  {updating ? 'Guardando cambios...' : 'Guardar cambios'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

// Component to display Stripe payment information
function StripePaymentInfo({ intentionId }: { intentionId: string }) {
  const [payment, setPayment] = useState<{
    stripe_payment_intent_id: string | null
    stripe_session_id: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPayment() {
      try {
        const data = await getMassIntentionStripePayment(intentionId)
        if (data) {
          setPayment({
            stripe_payment_intent_id: data.stripe_payment_intent_id,
            stripe_session_id: data.stripe_session_id,
          })
        }
      } catch (err) {
        console.error('Error al cargar el pago de Stripe:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPayment()
  }, [intentionId])

  if (loading) {
    return <div className="mt-1">Cargando información de pago...</div>
  }

  if (!payment) {
    return null
  }

  return (
    <div className="mt-1 space-y-1">
      {payment.stripe_payment_intent_id && (
        <div>
          <span className="font-medium">Stripe Payment ID:</span>{' '}
          <code className="text-xs bg-[var(--secondary)] px-1 py-0.5 rounded">
            {payment.stripe_payment_intent_id}
          </code>
        </div>
      )}
      {payment.stripe_session_id && (
        <div>
          <span className="font-medium">Stripe Session ID:</span>{' '}
          <code className="text-xs bg-[var(--secondary)] px-1 py-0.5 rounded">
            {payment.stripe_session_id}
          </code>
        </div>
      )}
    </div>
  )
}

