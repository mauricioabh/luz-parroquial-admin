'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../../RoleGuard'
import {
  getFinancialClosings,
  closeFinancialPeriod,
  formatAmount,
  formatPeriod,
  type FinancialClosing,
  type CloseFinancialPeriodResponse,
} from '@/lib/supabase/financial-closings'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'

export default function FinancialClosuresPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <FinancialClosuresContent />
    </RoleGuard>
  )
}

function FinancialClosuresContent() {
  const { profile } = useProfile()
  const [closings, setClosings] = useState<FinancialClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Close period modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [closeFromDate, setCloseFromDate] = useState('')
  const [closeToDate, setCloseToDate] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [closingInProgress, setClosingInProgress] = useState(false)

  const loadClosings = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      const data = await getFinancialClosings()
      setClosings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los cierres financieros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClosings()
  }, [profile])

  const handleOpenCloseModal = () => {
    // Set default dates (current month)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setCloseFromDate(firstDay.toISOString().split('T')[0])
    setCloseToDate(lastDay.toISOString().split('T')[0])
    setCloseNotes('')
    setIsCloseModalOpen(true)
  }

  const handleClosePeriod = async () => {
    if (!closeFromDate || !closeToDate) {
      setError('Por favor selecciona ambas fechas de inicio y fin')
      return
    }

    if (new Date(closeFromDate) > new Date(closeToDate)) {
      setError('La fecha de inicio debe ser anterior o igual a la fecha de fin')
      return
    }

    setClosingInProgress(true)
    setError(null)

    try {
      const result = await closeFinancialPeriod(closeFromDate, closeToDate, closeNotes || undefined)
      
      // Reload closings to show the new one
      await loadClosings()
      
      // Close modal and reset form
      setIsCloseModalOpen(false)
      setCloseFromDate('')
      setCloseToDate('')
      setCloseNotes('')
      
      // Show success message (you could add a toast notification here)
      alert(`¡Período cerrado exitosamente!\n\nTotal Stripe: ${formatAmount(result.total_stripe)}\nTotal Efectivo: ${formatAmount(result.total_cash)}\nTotal Manual: ${formatAmount(result.total_manual)}\nTotal General: ${formatAmount(result.total_all)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar el período')
    } finally {
      setClosingInProgress(false)
    }
  }

  const getTotalForPeriod = (closing: FinancialClosing) => {
    return closing.total_stripe + closing.total_cash + closing.total_manual
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
            Cierres Financieros Mensuales
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Cerrar y reconciliar períodos financieros para ofrendas de intenciones de misa
          </p>
        </div>
        <Button onClick={handleOpenCloseModal} className="shrink-0">
          Cerrar Mes
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Closings List */}
      <Card>
        <CardHeader>
          <CardTitle>Períodos Cerrados</CardTitle>
          <CardDescription>
            Cierres financieros históricos para reconciliación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              Cargando cierres...
            </div>
          ) : closings.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              Aún no se han cerrado períodos. Haz clic en "Cerrar Mes" para crear tu primer cierre.
            </div>
          ) : (
            <div className="space-y-4">
              {closings.map((closing) => (
                <div
                  key={closing.id}
                  className="p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] mb-1">
                        {formatPeriod(closing.period_start, closing.period_end)}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Cerrado el {new Date(closing.closed_at).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Closed
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Stripe</p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {formatAmount(closing.total_stripe)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Cash</p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {formatAmount(closing.total_cash)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Manual/Transfer</p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {formatAmount(closing.total_manual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Total</p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {formatAmount(getTotalForPeriod(closing))}
                      </p>
                    </div>
                  </div>

                  {closing.notes && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        <span className="font-medium">Notes:</span> {closing.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Period Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => !closingInProgress && setIsCloseModalOpen(false)}
        title="Cerrar Período Financiero"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Advertencia:</strong> Una vez que se cierra un período, no se puede modificar ni eliminar. 
              Asegúrate de que todos los datos sean correctos antes de cerrar.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Fecha de Inicio del Período <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={closeFromDate}
                onChange={(e) => setCloseFromDate(e.target.value)}
                disabled={closingInProgress}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Fecha de Fin del Período <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={closeToDate}
                onChange={(e) => setCloseToDate(e.target.value)}
                disabled={closingInProgress}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Notas (Opcional)
              </label>
              <Textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                disabled={closingInProgress}
                placeholder="Agrega cualquier nota sobre este cierre..."
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              onClick={() => setIsCloseModalOpen(false)}
              disabled={closingInProgress}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClosePeriod}
              disabled={closingInProgress || !closeFromDate || !closeToDate}
            >
              {closingInProgress ? 'Cerrando...' : 'Cerrar Período'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
