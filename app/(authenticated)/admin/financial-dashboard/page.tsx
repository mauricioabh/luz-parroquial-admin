'use client'

import { useEffect, useState, useCallback } from 'react'
import { RoleGuard } from '@/app/(authenticated)/RoleGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  getFinancialDashboardData,
  formatAmount,
  formatDate,
  formatTime,
  type FinancialDashboardData,
} from '@/lib/supabase/priest-financial-dashboard'
import { createDailyClosing, isTodayClosed as checkTodayClosed } from '@/lib/supabase/financial-closings'

// Helper function to format payment source labels
function formatPaymentSource(source: string): string {
  if (source === 'Stripe') return 'En línea'
  if (source === 'Cash') return 'Efectivo'
  if (source === 'Manual') return 'Transferencia'
  return source
}

function FinancialDashboardContent() {
  const [data, setData] = useState<FinancialDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTodayClosed, setIsTodayClosed] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingInProgress, setClosingInProgress] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [dashboardData, todayClosed] = await Promise.all([
        getFinancialDashboardData(),
        checkTodayClosed().catch(() => false), // If check fails, assume not closed
      ])
      setData(dashboardData)
      setIsTodayClosed(todayClosed)
    } catch (err) {
      console.error('Error loading financial dashboard:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos financieros')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCloseDay = useCallback(async () => {
    try {
      setClosingInProgress(true)
      await createDailyClosing()
      setIsTodayClosed(true)
      setShowCloseModal(false)
      // Reload data to refresh the dashboard
      await loadData()
    } catch (err) {
      console.error('Error closing day:', err)
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el día')
      setShowCloseModal(false)
    } finally {
      setClosingInProgress(false)
    }
  }, [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Cargando información financiera
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Esto puede tardar unos segundos...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const handleRetry = () => {
      loadData()
    }

    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-[var(--foreground)] mb-1">
                No se pudieron cargar los datos
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">{error}</p>
              <Button onClick={handleRetry}>Intentar de nuevo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6 pb-8">
      {/* Header */}
      <div className="space-y-2 mb-2">
        <h1 className="text-3xl font-serif text-[var(--foreground)]">Panel Financiero</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Resumen financiero de ofrendas y pagos
        </p>
      </div>

      {/* Daily Snapshot Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resumen de hoy</CardTitle>
            {isTodayClosed && (
              <Badge variant="success" className="ml-2">
                CERRADO
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.dailySnapshot.paymentCount === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto bg-[var(--muted)] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-[var(--foreground)] mb-1">
                  Aún no se han registrado aportaciones hoy
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Las aportaciones aparecerán aquí cuando se registren ofrendas o intenciones de misa
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Total KPI */}
              <div>
                <div className="text-sm text-[var(--muted-foreground)] mb-1">Total recaudado hoy</div>
                <div className="text-3xl font-semibold text-[var(--foreground)]">
                  {formatAmount(data.dailySnapshot.totalToday)}
                </div>
              </div>

              {/* Breakdown by Source */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">En línea</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {formatAmount(data.dailySnapshot.stripeTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Efectivo / Transferencia
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {formatAmount(data.dailySnapshot.cashTransferTotal)}
                  </span>
                </div>
              </div>

              {/* Last Payment Time */}
              {data.dailySnapshot.lastPaymentTime && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Último pago recibido a las {formatTime(data.dailySnapshot.lastPaymentTime)}
                  </p>
                </div>
              )}

              {/* Close Day Button */}
              {!isTodayClosed && (
                <div className="pt-4 border-t border-[var(--border)]">
                  <Button
                    onClick={() => setShowCloseModal(true)}
                    variant="primary"
                    className="w-full"
                  >
                    Cerrar el día
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Day Confirmation Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => !closingInProgress && setShowCloseModal(false)}
        title="Cerrar el día"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            ¿Está seguro de que desea cerrar el día de hoy?
          </p>
          
          {data && (
            <div className="bg-[var(--muted)] rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-[var(--foreground)] mb-2">
                Resumen del día:
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Total recaudado:</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatAmount(data.dailySnapshot.totalToday)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">En línea:</span>
                  <span className="text-[var(--foreground)]">
                    {formatAmount(data.dailySnapshot.stripeTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Efectivo / Transferencia:</span>
                  <span className="text-[var(--foreground)]">
                    {formatAmount(data.dailySnapshot.cashTransferTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Pagos registrados:</span>
                  <span className="text-[var(--foreground)]">
                    {data.dailySnapshot.paymentCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--muted-foreground)]">
            Una vez cerrado, no podrá modificar el cierre del día. Esta acción es permanente.
          </p>

          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCloseModal(false)}
              disabled={closingInProgress}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCloseDay}
              disabled={closingInProgress}
            >
              {closingInProgress ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Month Status Banner */}
      {data.monthStatus === 'OPEN' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="warning">ABIERTO</Badge>
                </div>
                <p className="text-sm text-amber-800">
                  Este mes aún no está cerrado. Puede cerrar este período desde el menú de reportes cuando esté listo para la reconciliación.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today Total */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-[var(--muted-foreground)]">
              Recaudado Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-[var(--foreground)]">
              {formatAmount(data.todayTotal)}
            </div>
          </CardContent>
        </Card>

        {/* Month Total */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-[var(--muted-foreground)]">
              Recaudado Este Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-[var(--foreground)]">
              {formatAmount(data.monthTotal)}
            </div>
          </CardContent>
        </Card>

        {/* Last Closing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-[var(--muted-foreground)]">
              Último Cierre
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lastClosingAmount !== null ? (
              <div className="text-3xl font-semibold text-[var(--foreground)]">
                {formatAmount(data.lastClosingAmount)}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-semibold text-[var(--muted-foreground)]">
                  Sin cierres
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Aún no se ha cerrado ningún período
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month Status Badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-[var(--muted-foreground)]">Estado del mes:</span>
        <Badge variant={data.monthStatus === 'CLOSED' ? 'success' : 'warning'}>
          {data.monthStatus === 'CLOSED' ? 'CERRADO' : 'ABIERTO'}
        </Badge>
      </div>

      {/* Daily Closings History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres Diarios</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyClosingsHistory.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto bg-[var(--muted)] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-[var(--foreground)] mb-1">
                  Aún no hay días cerrados
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Los cierres diarios aparecerán aquí cuando cierre un día desde el resumen de hoy
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Total del día
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyClosingsHistory.map((closing) => (
                    <tr
                      key={closing.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                        {formatDate(closing.date)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--foreground)]">
                        {formatAmount(closing.total)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                        {closing.notes ? (
                          <span className="text-[var(--muted-foreground)]">{closing.notes}</span>
                        ) : (
                          <span className="text-[var(--muted-foreground)] italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos 10 Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentPayments.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto bg-[var(--muted)] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-[var(--foreground)] mb-1">
                  Aún no hay pagos registrados
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Los pagos aparecerán aquí cuando se registren ofrendas o intenciones de misa
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Monto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Origen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                        {formatDate(payment.date)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--foreground)]">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            payment.status === 'succeeded' || payment.status === 'completed'
                              ? 'success'
                              : payment.status === 'failed'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {payment.status === 'succeeded' || payment.status === 'completed'
                            ? 'COMPLETADO'
                            : payment.status === 'failed'
                            ? 'FALLIDO'
                            : payment.status === 'paid_cash'
                            ? 'EFECTIVO'
                            : payment.status === 'paid_transfer'
                            ? 'TRANSFERENCIA'
                            : 'PENDIENTE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                        {formatPaymentSource(payment.source)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function FinancialDashboardPage() {
  return (
    <RoleGuard allowedRoles={['priest']}>
      <FinancialDashboardContent />
    </RoleGuard>
  )
}
