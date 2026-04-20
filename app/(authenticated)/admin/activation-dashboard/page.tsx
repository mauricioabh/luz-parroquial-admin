'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import { getActivationSummary, ActivationSummary } from '@/lib/supabase/activation-metrics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function ActivationDashboardPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <ActivationDashboardContent />
    </RoleGuard>
  )
}

function ActivationDashboardContent() {
  const { profile } = useProfile()
  const [summary, setSummary] = useState<ActivationSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSummary = async () => {
      if (!profile?.parish_id) return

      try {
        const data = await getActivationSummary(profile.parish_id)
        setSummary(data)
      } catch (err) {
        console.error('Error loading activation summary:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando métricas de activación...</p>
        </div>
      </div>
    )
  }

  if (!summary || !summary.metrics || summary.metrics.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)]">
              Las métricas de activación estarán disponibles después de que tu parroquia esté registrada. Vuelve a revisar en unos días.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const metrics = summary.metrics
  const totals = summary.totals
  const currentDay = metrics.length
  const daysRemaining = Math.max(0, 7 - currentDay)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Panel de Activación de los Primeros 7 Días
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Rastrea el compromiso y la activación de tu parroquia durante la primera semana
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Eventos</CardDescription>
            <CardTitle className="text-2xl">{totals.total_events || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Anuncios Publicados</CardDescription>
            <CardTitle className="text-2xl">{totals.total_announcements || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Usuarios Activos</CardDescription>
            <CardTitle className="text-2xl">{totals.max_active_users || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Configuración Completada</CardDescription>
            <CardTitle className="text-2xl">
              {totals.completed_on_day ? `Día ${totals.completed_on_day}` : 'Aún no'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Activación</CardTitle>
          <CardDescription>
            Día {currentDay} de 7 {daysRemaining > 0 && `(${daysRemaining} días restantes)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--foreground)] font-medium">
                {Math.round((currentDay / 7) * 100)}% Completado
              </span>
              <span className="text-[var(--muted-foreground)]">
                {currentDay}/7 días
              </span>
            </div>
            <div className="w-full bg-[var(--secondary)] rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-500 ease-out"
                style={{ width: `${(currentDay / 7) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Diarias</CardTitle>
          <CardDescription>
            Desglose detallado de actividad para cada uno de los primeros 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">Día</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--foreground)]">Fecha</th>
                  <th className="text-right p-3 text-sm font-medium text-[var(--foreground)]">Eventos</th>
                  <th className="text-right p-3 text-sm font-medium text-[var(--foreground)]">Anuncios</th>
                  <th className="text-right p-3 text-sm font-medium text-[var(--foreground)]">Ministerios</th>
                  <th className="text-right p-3 text-sm font-medium text-[var(--foreground)]">Usuarios Invitados</th>
                  <th className="text-right p-3 text-sm font-medium text-[var(--foreground)]">Usuarios Activos</th>
                  <th className="text-center p-3 text-sm font-medium text-[var(--foreground)]">Configuración</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => (
                  <tr
                    key={metric.day}
                    className={`border-b border-[var(--border)] ${
                      metric.onboarding_completed ? 'bg-green-50/30' : ''
                    }`}
                  >
                    <td className="p-3 text-sm font-medium text-[var(--foreground)]">
                      Día {metric.day}
                    </td>
                    <td className="p-3 text-sm text-[var(--muted-foreground)]">
                      {new Date(metric.date).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-3 text-sm text-right text-[var(--foreground)]">
                      {metric.events_created}
                    </td>
                    <td className="p-3 text-sm text-right text-[var(--foreground)]">
                      {metric.announcements_published}
                    </td>
                    <td className="p-3 text-sm text-right text-[var(--foreground)]">
                      {metric.ministries_created}
                    </td>
                    <td className="p-3 text-sm text-right text-[var(--foreground)]">
                      {metric.users_invited}
                    </td>
                    <td className="p-3 text-sm text-right text-[var(--foreground)]">
                      {metric.active_users}
                    </td>
                    <td className="p-3 text-center">
                      {metric.onboarding_completed ? (
                        <Badge variant="default" className="bg-green-600">
                          ✓ Completo
                        </Badge>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      {currentDay < 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Consejos para Mejor Activación</CardTitle>
            <CardDescription>
              Aquí hay algunas sugerencias para mejorar el compromiso de tu parroquia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
              {totals.total_events === 0 && (
                <p>
                  <strong className="text-[var(--foreground)]">💡 Agregar Eventos:</strong> Crea horarios regulares de Misa y eventos parroquiales para involucrar a tu comunidad.
                </p>
              )}
              {totals.total_announcements === 0 && (
                <p>
                  <strong className="text-[var(--foreground)]">💡 Publicar Anuncios:</strong> Comparte noticias y actualizaciones con tus feligreses.
                </p>
              )}
              {totals.total_ministries === 0 && (
                <p>
                  <strong className="text-[var(--foreground)]">💡 Crear Ministerios:</strong> Configura ministerios y grupos para organizar las actividades de tu parroquia.
                </p>
              )}
              {totals.total_users_invited === 0 && (
                <p>
                  <strong className="text-[var(--foreground)]">💡 Invitar Usuarios:</strong> Invita administradores adicionales y feligreses para unirse a tu parroquia.
                </p>
              )}
              {!totals.completed_on_day && (
                <p>
                  <strong className="text-[var(--foreground)]">💡 Completar Configuración:</strong> Termina todas las tareas de configuración para desbloquear todo el potencial de Luz Parroquial.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

