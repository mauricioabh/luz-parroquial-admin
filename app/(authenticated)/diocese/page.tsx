'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { getCurrentUserDiocese, getParishesInDiocese, getDioceseUsageStats, getDioceseReportData, type Diocese, type Parish, type DioceseUsageStats, type DioceseReportData } from '@/lib/supabase/dioceses'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function DioceseDashboardPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [diocese, setDiocese] = useState<Diocese | null>(null)
  const [parishes, setParishes] = useState<Parish[]>([])
  const [stats, setStats] = useState<DioceseUsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDioceseData = async () => {
      if (!profile) return

      // Check if user is diocese admin
      if (profile.role_name !== 'diocese_admin') {
        router.push('/')
        return
      }

      try {
        const dioceseData = await getCurrentUserDiocese()
        if (!dioceseData) {
          console.error('Diocese not found for user')
          setLoading(false)
          return
        }

        setDiocese(dioceseData)

        // Load parishes and stats in parallel
        const [parishesData, statsData] = await Promise.all([
          getParishesInDiocese(dioceseData.id),
          getDioceseUsageStats(dioceseData.id),
        ])

        setParishes(parishesData)
        setStats(statsData)
      } catch (err) {
        console.error('Error loading diocese data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!profileLoading && profile) {
      loadDioceseData()
    } else if (!profileLoading && !profile) {
      setLoading(false)
    }
  }, [profile, profileLoading, router])

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!profile || !diocese) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes acceso al panel de la diócesis.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const exportToCSV = async () => {
    try {
      const reportData = await getDioceseReportData(diocese.id)
      
      // Create CSV content
      const headers = [
        'Nombre de Parroquia',
        'Ciudad',
        'Estado',
        'Intenciones (Total)',
        'Solicitudes de Sacramentos (Total)',
        'Donaciones Total (USD)',
      ]

      const rows = reportData.parish_details.map((parish) => [
        parish.name,
        parish.city,
        parish.is_active ? 'Activa' : 'Inactiva',
        parish.intentions_count.toString(),
        parish.sacrament_requests_count.toString(),
        (parish.donations_total / 100).toFixed(2),
      ])

      const csvContent = [
        `Reporte de Diócesis: ${reportData.diocese.name}`,
        `Generado: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        '',
        'Detalles de Parroquias',
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell)}"`).join(',')),
        '',
        'Estadísticas Resumidas',
        `Total de Parroquias,${reportData.stats.total_parishes}`,
        `Parroquias Activas,${reportData.stats.active_parishes}`,
        `Total de Intenciones,${reportData.stats.total_intentions}`,
        `Intenciones Este Mes,${reportData.stats.intentions_this_month}`,
        `Total de Solicitudes de Sacramentos,${reportData.stats.sacrament_requests_total}`,
        `Solicitudes de Sacramentos Pendientes,${reportData.stats.sacrament_requests_pending}`,
        `Total de Donaciones (USD),${(reportData.stats.donations_total_amount / 100).toFixed(2)}`,
        `Donaciones Este Mes (USD),${(reportData.stats.donations_this_month / 100).toFixed(2)}`,
        '',
        'Tendencia Mensual de Intenciones',
        'Mes,Conteo',
        ...reportData.monthly_intentions.map((mi) => `"${mi.month}",${mi.count}`),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const fileName = `diocese-report-${diocese.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error exporting CSV:', err)
      alert('Error al exportar CSV. Por favor intenta nuevamente.')
    }
  }

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para exportar PDF')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diocese Report - ${diocese.name}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              padding: 40px;
              color: #000;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            h2 {
              font-size: 18px;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            .header {
              margin-bottom: 30px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin: 20px 0;
            }
            .metric-card {
              border: 1px solid #ddd;
              padding: 15px;
              background-color: #f9f9f9;
            }
            .metric-value {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
            }
            .metric-label {
              color: #666;
              font-size: 14px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Diócesis: ${diocese.name}</h1>
            <p>Generado: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Tipo de Reporte: Estadísticas Resumidas</p>
          </div>

          <h2>Métricas Clave</h2>
          <div class="metrics">
            ${stats ? `
              <div class="metric-card">
                <div class="metric-label">Parroquias Activas</div>
                <div class="metric-value">${stats.active_parishes}</div>
                <div class="metric-label">de ${stats.total_parishes} total</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Intenciones Este Mes</div>
                <div class="metric-value">${stats.intentions_this_month}</div>
                <div class="metric-label">de ${stats.total_intentions} total</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Solicitudes de Sacramentos</div>
                <div class="metric-value">${stats.sacrament_requests_total}</div>
                <div class="metric-label">${stats.sacrament_requests_pending} pendientes</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Donaciones Este Mes</div>
                <div class="metric-value">${formatCurrency(stats.donations_this_month)}</div>
                <div class="metric-label">Total: ${formatCurrency(stats.donations_total_amount)}</div>
              </div>
            ` : ''}
          </div>

          <h2>Resumen de Parroquias</h2>
          <table>
            <thead>
              <tr>
                <th>Nombre de Parroquia</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Intenciones</th>
                <th>Solicitudes de Sacramentos</th>
                <th>Donaciones</th>
              </tr>
            </thead>
            <tbody>
              ${parishes.map(parish => `
                <tr>
                  <td>${parish.name}</td>
                  <td>${parish.city}</td>
                  <td>${parish.is_active ? 'Activa' : 'Inactiva'}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>Este es un reporte de solo lectura generado desde el sistema Luz Parroquial.</p>
            <p>Para información detallada, por favor contacta a tu administrador del sistema.</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Panel de Diócesis
          </h1>
          <p className="text-[var(--muted-foreground)]">
            {diocese.name} - Resumen y Estadísticas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Parroquias Activas</CardTitle>
              <CardDescription>Parroquias actualmente activas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-[var(--foreground)]">
                  {stats.active_parishes}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  de {stats.total_parishes} total
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Intenciones Este Mes</CardTitle>
              <CardDescription>Intenciones de oración enviadas este mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-[var(--foreground)]">
                  {stats.intentions_this_month}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  de {stats.total_intentions} total
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Solicitudes de Sacramentos</CardTitle>
              <CardDescription>Total y solicitudes pendientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-[var(--foreground)]">
                  {stats.sacrament_requests_total}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {stats.sacrament_requests_pending} pendientes
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Donaciones Este Mes</CardTitle>
              <CardDescription>Total de donaciones recibidas este mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-[var(--foreground)]">
                  {formatCurrency(stats.donations_this_month)}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Total: {formatCurrency(stats.donations_total_amount)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Perfiles de Usuario</CardTitle>
              <CardDescription>Total de usuarios registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--foreground)]">
                {stats.total_profiles}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Members</CardTitle>
              <CardDescription>Total de miembros registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--foreground)]">
                {stats.total_members}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Total de Intenciones</CardTitle>
              <CardDescription>All-time prayer intentions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--foreground)]">
                {stats.total_intentions}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parish List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Parroquias en la Diócesis</CardTitle>
          <CardDescription>
            Lista de todas las parroquias en {diocese.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parishes.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <p className="text-lg">No se encontraron parroquias en esta diócesis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">Nombre de Parroquia</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">Ciudad</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">País</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--foreground)]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parishes.map((parish) => (
                    <tr
                      key={parish.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-[var(--foreground)]">
                          {parish.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {parish.city}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {parish.country}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {parish.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inactiva
                          </span>
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
    </div>
  )
}

