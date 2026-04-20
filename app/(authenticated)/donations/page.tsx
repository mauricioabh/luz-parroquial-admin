'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import { getOfferingsForParish, getOfferingTotals, type OfferingWithUser } from '@/lib/supabase/offerings'
import { getDonationSummaries, getDonationTotals, type DonationSummary } from '@/lib/supabase/donations'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function DonationsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <DonationsContent />
    </RoleGuard>
  )
}

function DonationsContent() {
  const { profile } = useProfile()
  const [offerings, setOfferings] = useState<OfferingWithUser[]>([])
  const [totals, setTotals] = useState<{ total_amount: number; total_count: number; currency: string }[]>([])
  const [donationSummaries, setDonationSummaries] = useState<DonationSummary[]>([])
  const [donationTotals, setDonationTotals] = useState<{ total_amount: number; total_count: number; by_purpose: Record<string, { amount: number; count: number }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [profile])

  const loadData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      const [offeringsData, totalsData, summariesData, donationTotalsData] = await Promise.all([
        getOfferingsForParish(),
        getOfferingTotals(),
        getDonationSummaries(),
        getDonationTotals(),
      ])
      setOfferings(offeringsData)
      setTotals(totalsData)
      setDonationSummaries(summariesData)
      setDonationTotals(donationTotalsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos de donaciones')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (offerings.length === 0) return

    const headers = ['Fecha', 'Donante', 'Monto', 'Moneda', 'Propósito', 'Estado']
    const statusLabels: Record<string, string> = {
      completed: 'Completado',
      pending: 'Pendiente',
      failed: 'Fallido',
    }
    const rows = offerings.map(offering => [
      new Date(offering.created_at).toLocaleDateString('es-ES'),
      offering.user?.full_name || 'Anónimo',
      offering.amount.toString(),
      offering.currency,
      formatPurpose(offering.purpose),
      statusLabels[offering.status] || offering.status,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `offerings-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  }

  const formatCentsToDollars = (cents: number) => {
    return formatCurrency(cents / 100)
  }

  const formatPurpose = (purpose: string | null) => {
    if (!purpose) return 'General'
    const purposeMap: Record<string, string> = {
      'general': 'General',
      'mass_intention': 'Intención de Misa',
      'charity': 'Caridad'
    }
    return purposeMap[purpose] || purpose.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
      completed: 'success',
      pending: 'warning',
      failed: 'destructive',
    }
    const statusMap: Record<string, string> = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'failed': 'Fallido',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-[var(--muted-foreground)]">Cargando ofrendas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--card-foreground)] mb-2">
            Donaciones y Ofrendas
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Ver donaciones y ofrendas digitales de los feligreses
          </p>
        </div>
        {offerings.length > 0 && (
          <Button variant="outline" onClick={exportToCSV}>
            Exportar CSV
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Voluntary Donations Summary */}
      {donationTotals && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[var(--card-foreground)] mb-4">Resumen de Donaciones Voluntarias</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total de Donaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[var(--card-foreground)]">
                  {formatCentsToDollars(donationTotals.total_amount)}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {donationTotals.total_count} {donationTotals.total_count === 1 ? 'donation' : 'donations'}
                </p>
              </CardContent>
            </Card>
            {Object.entries(donationTotals.by_purpose).map(([purpose, data]) => {
              if (data.count === 0) return null
              return (
                <Card key={purpose}>
                  <CardHeader>
                    <CardTitle className="text-lg">{formatPurpose(purpose === 'null' ? null : purpose)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[var(--card-foreground)]">
                      {formatCentsToDollars(data.amount)}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      {data.count} {data.count === 1 ? 'donación' : 'donaciones'}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Donations by Purpose & Month */}
          {donationSummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Donaciones por Propósito y Mes</CardTitle>
                <CardDescription>
                  Totales agregados agrupados por propósito y mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                          Mes
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                          Propósito
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                          Monto Total
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                          Cantidad
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {donationSummaries.map((summary, index) => (
                        <tr
                          key={`${summary.month}-${summary.purpose}-${index}`}
                          className="border-b border-[var(--border)] hover:bg-[var(--secondary)]"
                        >
                          <td className="py-3 px-4 text-sm text-[var(--card-foreground)]">
                            {new Date(summary.month + '-01').toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--card-foreground)]">
                            {formatPurpose(summary.purpose)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium text-[var(--card-foreground)]">
                            {formatCentsToDollars(summary.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-[var(--muted-foreground)]">
                            {summary.total_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Digital Offerings Summary */}
      {totals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[var(--card-foreground)] mb-4">Ofrendas Digitales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {totals.map((total) => (
              <Card key={total.currency}>
                <CardHeader>
                  <CardTitle className="text-lg">Total {total.currency}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[var(--card-foreground)]">
                    {formatCurrency(total.total_amount, total.currency)}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {total.total_count} {total.total_count === 1 ? 'ofrenda' : 'ofrendas'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Offerings List */}
      <Card>
            <CardHeader>
              <CardTitle>Ofrendas Recientes</CardTitle>
              <CardDescription>
                Todas las ofrendas digitales de los feligreses
              </CardDescription>
            </CardHeader>
        <CardContent>
          {offerings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted-foreground)]">
                Aún no hay ofrendas. Las ofrendas aparecerán aquí una vez que los feligreses hagan contribuciones.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                      Donante
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                      Monto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                      Propósito
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--card-foreground)]">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((offering) => (
                    <tr
                      key={offering.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--secondary)]"
                    >
                      <td className="py-3 px-4 text-sm text-[var(--card-foreground)]">
                        {new Date(offering.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--card-foreground)]">
                        {offering.user?.full_name || 'Anónimo'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-[var(--card-foreground)]">
                        {formatCurrency(Number(offering.amount), offering.currency)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--muted-foreground)]">
                        {formatPurpose(offering.purpose)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(offering.status)}
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

