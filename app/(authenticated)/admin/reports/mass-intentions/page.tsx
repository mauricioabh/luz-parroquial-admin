'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../../RoleGuard'
import {
  getMassIntentionFinancialReport,
  getMassIntentionFinancials,
  formatOfferingAmount,
  type MassIntentionFinancial,
  type MassIntentionFinancialReportSummary,
  type MassIntentionFinancialFilters,
} from '@/lib/supabase/mass-intention-financials'
import { supabase } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function MassIntentionsFinancialReportPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <MassIntentionsFinancialReportContent />
    </RoleGuard>
  )
}

function MassIntentionsFinancialReportContent() {
  const { profile } = useProfile()
  const [financialData, setFinancialData] = useState<MassIntentionFinancial[]>([])
  const [summary, setSummary] = useState<MassIntentionFinancialReportSummary>({
    total_collected: 0,
    total_pending: 0,
    total_refunded: 0,
    count_paid: 0,
    count_pending: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [filterOfferingStatus, setFilterOfferingStatus] = useState('')

  const loadReport = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      // Set default date range if not provided (last 30 days)
      const fromDate = filterFromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const toDate = filterToDate || new Date().toISOString().split('T')[0]

      // Get summary from RPC
      const reportSummary = await getMassIntentionFinancialReport(fromDate, toDate)
      setSummary(reportSummary)

      // Get detailed data from VIEW
      const filters: MassIntentionFinancialFilters = {
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        offeringStatus: filterOfferingStatus || undefined,
      }
      const data = await getMassIntentionFinancials(filters)
      setFinancialData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el reporte')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [profile, filterFromDate, filterToDate, filterOfferingStatus])

  const clearFilters = () => {
    setFilterFromDate('')
    setFilterToDate('')
    setFilterOfferingStatus('')
  }

  const handleExportCSV = async () => {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No autenticado')
      }

      // Build query params
      const params = new URLSearchParams()
      if (filterFromDate) params.append('from_date', filterFromDate)
      if (filterToDate) params.append('to_date', filterToDate)
      if (filterOfferingStatus) params.append('offering_status', filterOfferingStatus)

      // Fetch CSV from API
      const response = await fetch(`/api/mass-intention-financials-export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Error al exportar CSV')
      }

      // Download the CSV
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mass-intention-financials-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting CSV:', err)
      alert('Error al exportar CSV. Por favor intenta nuevamente.')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'N/A'
    const methodMap: Record<string, string> = {
      'stripe': 'Stripe',
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'manual': 'Manual'
    }
    return methodMap[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1)
  }

  const formatOfferingStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'paid_cash': 'Pagado en Efectivo',
      'paid_transfer': 'Pagado por Transferencia',
      'paid_stripe': 'Pagado por Stripe',
      'waived': 'Exento',
      'refunded': 'Reembolsado'
    }
    return statusMap[status] || status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
          Reportes Financieros de Intenciones de Misa
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Visibilidad financiera de estipendios de intenciones de misa (Stripe + manual/efectivo)
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtrar reporte por rango de fechas y estado de ofrenda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Fecha Desde
              </label>
              <Input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Fecha Hasta
              </label>
              <Input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Estado de Ofrenda
              </label>
              <select
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
                value={filterOfferingStatus}
                onChange={(e) => setFilterOfferingStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="paid_cash">Pagado en Efectivo</option>
                <option value="paid_transfer">Pagado por Transferencia</option>
                <option value="paid_stripe">Pagado por Stripe</option>
                <option value="waived">Exento</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Limpiar
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="flex-1">
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatOfferingAmount(summary.total_collected)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Total Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatOfferingAmount(summary.total_pending)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Total Reembolsado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatOfferingAmount(summary.total_refunded)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Count Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {summary.count_paid}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Cantidad Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {summary.count_pending}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles Financieros</CardTitle>
          <CardDescription>
            Registros financieros individuales de intenciones de misa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted-foreground)]">Cargando reporte...</p>
            </div>
          ) : financialData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted-foreground)]">
                No se encontraron datos para los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">
                      Fecha de Misa
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">
                      Monto de Ofrenda
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">
                      Método de Pago
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">
                      Estado de Ofrenda
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">
                      Creado En
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.map((row) => (
                    <tr
                      key={row.mass_intention_id}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50"
                    >
                      <td className="p-3 text-sm text-[var(--foreground)]">
                        {formatDate(row.mass_date)}
                      </td>
                      <td className="p-3 text-sm text-[var(--foreground)]">
                        {formatOfferingAmount(row.offering_amount)}
                      </td>
                      <td className="p-3 text-sm text-[var(--foreground)]">
                        {formatPaymentMethod(row.payment_method)}
                      </td>
                      <td className="p-3 text-sm text-[var(--foreground)]">
                        {formatOfferingStatus(row.offering_status)}
                      </td>
                      <td className="p-3 text-sm text-[var(--foreground)]">
                        {new Date(row.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
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
