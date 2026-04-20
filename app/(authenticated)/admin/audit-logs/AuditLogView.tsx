'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { ParishContext } from '@/components/ParishContext'
import {
  fetchAuditLogs,
  getAuditActions,
  getAuditTargetTypes,
  type AuditLogWithActor,
  type AuditAction,
  type AuditTargetType,
  type AuditLogFilters
} from '@/lib/supabase/audit-logs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

export default function AuditLogView() {
  const { profile } = useProfile()
  const [logs, setLogs] = useState<AuditLogWithActor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('')
  const [filterTargetType, setFilterTargetType] = useState<AuditTargetType | ''>('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const loadLogs = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const filters: AuditLogFilters = {
        parish_id: profile.parish_id
      }

      if (filterAction) {
        filters.action = filterAction as AuditAction
      }

      if (filterTargetType) {
        filters.target_type = filterTargetType as AuditTargetType
      }

      if (filterStartDate) {
        filters.start_date = filterStartDate
      }

      if (filterEndDate) {
        filters.end_date = filterEndDate
      }

      const data = await fetchAuditLogs(filters)
      setLogs(data)
    } catch (err) {
      console.error('Error loading audit logs:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los registros de auditoría'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.parish_id, filterAction, filterTargetType, filterStartDate, filterEndDate])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const ACTION_TRANSLATIONS: Record<string, string> = {
    invite_created: 'Invitación creada',
    invite_revoked: 'Invitación revocada',
    invite_resend: 'Invitación reenviada',
    invite_accepted: 'Invitación aceptada',
    role_changed: 'Rol cambiado',
    financial_monthly_closing_created: 'Cierre mensual financiero creado',
    financial_daily_closing_created: 'Cierre diario financiero creado',
    financial_write_blocked_post_closing: 'Escritura bloqueada tras cierre',
  }

  const TARGET_TYPE_TRANSLATIONS: Record<string, string> = {
    invitation: 'Invitación',
    user: 'Usuario',
    parish: 'Parroquia',
    financial_closing: 'Cierre financiero',
    financial_data: 'Datos financieros',
  }

  const formatAction = (action: string) => {
    return ACTION_TRANSLATIONS[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatTargetType = (targetType: string) => {
    return TARGET_TYPE_TRANSLATIONS[targetType] ?? targetType.charAt(0).toUpperCase() + targetType.slice(1).replace(/_/g, ' ')
  }

  const clearFilters = () => {
    setFilterAction('')
    setFilterTargetType('')
    setFilterStartDate('')
    setFilterEndDate('')
  }

  const hasActiveFilters = filterAction || filterTargetType || filterStartDate || filterEndDate

  return (
    <ParishContext>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">Registros de Auditoría</h1>
          <p className="text-[var(--muted-foreground)]">
            Ver el registro de auditoría de todas las acciones sensibles en tu parroquia
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtrar registros de auditoría por acción, tipo o rango de fechas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label htmlFor="action" className="text-sm font-medium text-[var(--foreground)]">
                  Acción
                </label>
                <select
                  id="action"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value as AuditAction | '')}
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  <option value="">Todas las Acciones</option>
                  {getAuditActions().map(action => (
                    <option key={action} value={action}>
                      {formatAction(action)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="target_type" className="text-sm font-medium text-[var(--foreground)]">
                  Tipo de Objetivo
                </label>
                <select
                  id="target_type"
                  value={filterTargetType}
                  onChange={(e) => setFilterTargetType(e.target.value as AuditTargetType | '')}
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  <option value="">Todos los Tipos</option>
                  {getAuditTargetTypes().map(type => (
                    <option key={type} value={type}>
                      {formatTargetType(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="start_date" className="text-sm font-medium text-[var(--foreground)]">
                  Fecha de Inicio
                </label>
                <Input
                  id="start_date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="end_date" className="text-sm font-medium text-[var(--foreground)]">
                  Fecha de Fin
                </label>
                <Input
                  id="end_date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-[var(--muted-foreground)]">Cargando registros de auditoría...</p>
            </div>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-[var(--secondary)] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No se encontraron registros de auditoría</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {hasActiveFilters
                  ? 'Intenta ajustar tus filtros para ver más resultados.'
                  : 'Los registros de auditoría aparecerán aquí cuando se realicen acciones.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Registro de Auditoría</CardTitle>
              <CardDescription>
                {logs.length} registro{logs.length !== 1 ? 's' : ''} encontrado{logs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--secondary)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Actor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Acción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Objetivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Detalles
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--secondary)] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-[var(--foreground)]">
                              {log.actor_name || 'Desconocido'}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {log.actor_email || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="info" className="capitalize">
                            {formatAction(log.action)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-[var(--foreground)]">
                              {formatTargetType(log.target_type)}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)] font-mono">
                              {log.target_id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {log.metadata ? (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                Ver detalles
                              </summary>
                              <pre className="mt-2 p-2 text-xs bg-[var(--secondary)] rounded border border-[var(--border)] overflow-auto max-w-md">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-sm text-[var(--muted-foreground)]">—</span>
                          )}
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
    </ParishContext>
  )
}
