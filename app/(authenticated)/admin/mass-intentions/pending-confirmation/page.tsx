'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../../RoleGuard'
import {
  getPromotedMassIntentions,
  confirmMassIntention,
  formatOfferingAmount,
  formatMassDate,
  formatMassTime,
  getStatusBadgeVariant,
  getStatusDisplayName,
  type MassIntentionWithUser,
  type OfferingStatus,
} from '@/lib/supabase/mass-intentions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { translateError } from '@/lib/errors'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { ActionConfirmation } from '@/components/guidance/ActionConfirmation'

export default function PendingConfirmationPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <PendingConfirmationContent />
    </RoleGuard>
  )
}

function PendingConfirmationContent() {
  const { profile } = useProfile()
  const [intentions, setIntentions] = useState<MassIntentionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [intentionToConfirm, setIntentionToConfirm] = useState<MassIntentionWithUser | null>(null)
  const [offeringAmount, setOfferingAmount] = useState<string>('')
  const [offeringStatus, setOfferingStatus] = useState<OfferingStatus>('pending')
  const [pastoralNotes, setPastoralNotes] = useState('')
  const [confirming, setConfirming] = useState(false)
  
  // Success confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<{
    title: string
    message: string
    affectedItems: string[]
    nextSteps: string
  } | null>(null)

  const loadPromotedIntentions = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      const data = await getPromotedMassIntentions()
      setIntentions(data)
    } catch (err) {
      setError(translateError(err, { action: 'load pending confirmations', resource: 'mass intentions' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromotedIntentions()
  }, [profile])

  const handleConfirmClick = (intention: MassIntentionWithUser) => {
    setIntentionToConfirm(intention)
    setOfferingAmount(intention.offering_amount ? (intention.offering_amount / 100).toString() : '')
    setOfferingStatus(intention.offering_status || 'pending')
    setPastoralNotes('')
    setConfirmModalOpen(true)
  }

  const handleConfirm = async () => {
    if (!intentionToConfirm) return

    setConfirming(true)
    try {
      // Convert offering amount from dollars to cents
      const amountInCents = offeringAmount && offeringAmount.trim() !== '' 
        ? Math.round(parseFloat(offeringAmount) * 100)
        : null

      // Validate: if offering_status is not waived, amount must be provided
      if (offeringStatus !== 'waived' && (!amountInCents || amountInCents <= 0)) {
        setError('El monto del estipendio es requerido cuando el método de pago no es "Exento"')
        setConfirming(false)
        return
      }

      await confirmMassIntention(
        intentionToConfirm.id,
        offeringStatus === 'waived' ? null : amountInCents,
        offeringStatus,
        pastoralNotes || null
      )
      
      // Show confirmation
      const parishionerName = intentionToConfirm.user_name || 'el feligrés'
      setConfirmationMessage({
        title: 'Intención de misa confirmada',
        message: 'La intención de misa ha sido confirmada exitosamente.',
        affectedItems: [
          `Feligrés: ${parishionerName}`,
          `Intención: ${intentionToConfirm.intention.substring(0, 50)}${intentionToConfirm.intention.length > 50 ? '...' : ''}`,
          `Estado: Confirmada`,
          `Estipendio: ${offeringStatus === 'waived' ? 'Exento' : formatOfferingAmount(amountInCents || 0)}`,
        ],
        nextSteps: 'La confirmación es un acto pastoral y administrativo. El feligrés verá que su intención ha sido confirmada.',
      })
      setShowConfirmation(true)
      
      await loadPromotedIntentions()
      setConfirmModalOpen(false)
      setIntentionToConfirm(null)
      setOfferingAmount('')
      setOfferingStatus('pending')
      setPastoralNotes('')
      
      // Auto-dismiss confirmation after 8 seconds
      setTimeout(() => {
        setShowConfirmation(false)
        setConfirmationMessage(null)
      }, 8000)
    } catch (err) {
      setError(translateError(err, { action: 'confirm mass intention', resource: 'mass intention' }))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[var(--foreground)] mb-2">
          Pendientes de Confirmar
        </h1>
        <p className="text-[var(--muted-foreground)] text-lg">
          Intenciones de misa promovidas que requieren confirmación y registro de estipendio
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
        storageKey="admin_pending_confirmations"
        title="Confirmación de Intenciones de Misa"
        description="Las intenciones promovidas desde la lista de espera aparecen aquí. La confirmación es un acto pastoral y administrativo que permite registrar el estipendio y finalizar el proceso. Puedes registrar el pago en efectivo, por transferencia, o marcar como exento."
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

      {/* Intentions List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando intenciones pendientes...</p>
        </div>
      ) : intentions.length === 0 ? (
        <EmptyState
          title="No hay intenciones pendientes de confirmar"
          description="Las intenciones promovidas desde la lista de espera aparecerán aquí. Una vez promovidas, requieren confirmación para registrar el estipendio y finalizar el proceso."
          secondaryDescription="La confirmación es un acto pastoral y administrativo. Permite registrar el método de pago del estipendio (efectivo, transferencia, o exento) y agregar notas pastorales."
        />
      ) : (
        <div className="space-y-0">
          {intentions.map((intention, index) => (
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
                      {intention.mass_date ? formatMassDate(intention.mass_date) : 'Fecha no asignada'}
                      {intention.mass_time && ` a las ${formatMassTime(intention.mass_time)}`}
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
                    <span>{new Date(intention.created_at).toLocaleDateString()}</span>
                    {intention.offering_amount && (
                      <>
                        {' • '}
                        <span>{formatOfferingAmount(intention.offering_amount)}</span>
                      </>
                    )}
                  </div>
                  {intention.notes && (
                    <div className="mt-3 p-3 bg-[var(--secondary)] rounded-md">
                      <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Notas:</p>
                      <p className="text-sm text-[var(--foreground)]">{intention.notes}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleConfirmClick(intention)}
                  className="flex-shrink-0"
                >
                  Confirmar Intención
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => {
          if (!confirming) {
            setConfirmModalOpen(false)
            setIntentionToConfirm(null)
            setOfferingAmount('')
            setOfferingStatus('pending')
            setPastoralNotes('')
          }
        }}
        title="Confirmar Intención de Misa"
      >
        <div className="p-6">
          {intentionToConfirm && (
            <>
              <div className="mb-6 p-4 bg-[var(--secondary)] rounded-lg">
                <p className="font-medium text-sm mb-1">Intención:</p>
                <p className="text-sm text-[var(--foreground)] mb-2">{intentionToConfirm.intention}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {intentionToConfirm.mass_date && formatMassDate(intentionToConfirm.mass_date)}
                  {intentionToConfirm.mass_time && ` a las ${formatMassTime(intentionToConfirm.mass_time)}`}
                </p>
                {intentionToConfirm.user_name && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Solicitante: {intentionToConfirm.user_name}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm text-[var(--muted-foreground)] mb-4 italic">
                  La confirmación es un acto pastoral y administrativo. Permite registrar el estipendio y finalizar el proceso.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Monto del Estipendio (USD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={offeringAmount}
                  onChange={(e) => setOfferingAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={offeringStatus === 'waived'}
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Ingrese el monto en dólares (ej: 50.00)
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Método de Pago
                </label>
                <select
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
                  value={offeringStatus}
                  onChange={(e) => {
                    setOfferingStatus(e.target.value as OfferingStatus)
                    if (e.target.value === 'waived') {
                      setOfferingAmount('')
                    }
                  }}
                >
                  <option value="pending">Pendiente</option>
                  <option value="paid_cash">Efectivo</option>
                  <option value="paid_transfer">Transferencia</option>
                  <option value="waived">Exento</option>
                </select>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Seleccione cómo se recibió o recibirá el estipendio
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                  Notas Pastorales (Opcional)
                </label>
                <Textarea
                  value={pastoralNotes}
                  onChange={(e) => setPastoralNotes(e.target.value)}
                  placeholder="Agregar notas sobre esta confirmación..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmModalOpen(false)
                    setIntentionToConfirm(null)
                    setOfferingAmount('')
                    setOfferingStatus('pending')
                    setPastoralNotes('')
                  }}
                  disabled={confirming}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  onClick={handleConfirm}
                  disabled={confirming || (offeringStatus !== 'waived' && (!offeringAmount || parseFloat(offeringAmount) <= 0))}
                >
                  {confirming ? 'Confirmando...' : 'Confirmar Intención'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
