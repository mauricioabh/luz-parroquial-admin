'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  getUserPushSubscriptions,
  updatePushSubscription,
  deletePushSubscription,
  requestPushNotificationPermission,
  PushSubscription,
} from '@/lib/supabase/push-notifications'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <SettingsContent />
    </RoleGuard>
  )
}

function SettingsContent() {
  const { profile } = useProfile()
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requestingPermission, setRequestingPermission] = useState(false)

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const subs = await getUserPushSubscriptions()
      setSubscriptions(subs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las suscripciones')
    } finally {
      setLoading(false)
    }
  }

  const handleEnableNotifications = async () => {
    try {
      setRequestingPermission(true)
      setError(null)
      setSuccess(null)

      const subscription = await requestPushNotificationPermission()
      if (subscription) {
        setSuccess('¡Notificaciones push habilitadas exitosamente!')
        await loadSubscriptions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al habilitar las notificaciones')
    } finally {
      setRequestingPermission(false)
    }
  }

  const handleToggleSubscription = async (subscriptionId: string, currentEnabled: boolean) => {
    try {
      setError(null)
      setSuccess(null)

      await updatePushSubscription(subscriptionId, { enabled: !currentEnabled })
      setSuccess(`Notificaciones ${!currentEnabled ? 'habilitadas' : 'deshabilitadas'}`)
      await loadSubscriptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la suscripción')
    }
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta suscripción de notificaciones?')) {
      return
    }

    try {
      setError(null)
      setSuccess(null)

      await deletePushSubscription(subscriptionId)
      setSuccess('Suscripción eliminada')
      await loadSubscriptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la suscripción')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
          Configuración de Notificaciones
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Gestiona tus preferencias de notificaciones push para actualizaciones parroquiales
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Notificaciones Push
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Recibe notificaciones para actualizaciones importantes de la parroquia, incluyendo nuevos anuncios
              y eventos próximos. Puedes habilitar o deshabilitar las notificaciones en cualquier momento.
            </p>
          </div>

          {subscriptions.length === 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[var(--secondary)] border border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Aún no tienes suscripciones de notificaciones. Habilita las notificaciones push
                  para mantenerte actualizado sobre tu parroquia.
                </p>
                <Button
                  onClick={handleEnableNotifications}
                  disabled={requestingPermission}
                  className="w-full sm:w-auto"
                >
                  {requestingPermission ? 'Solicitando Permiso...' : 'Habilitar Notificaciones'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="p-4 rounded-lg bg-[var(--secondary)] border border-[var(--border)] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {subscription.platform === 'web' && 'Navegador Web'}
                          {subscription.platform === 'ios' && 'Dispositivo iOS'}
                          {subscription.platform === 'android' && 'Dispositivo Android'}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            subscription.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {subscription.enabled ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Registrado el {new Date(subscription.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleSubscription(subscription.id, subscription.enabled)}
                      variant={subscription.enabled ? 'secondary' : 'primary'}
                      size="sm"
                    >
                      {subscription.enabled ? 'Deshabilitar' : 'Habilitar'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteSubscription(subscription.id)}
                      variant="secondary"
                      size="sm"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}

              {subscriptions.length > 0 && (
                <div className="pt-2">
                  <Button
                    onClick={handleEnableNotifications}
                    disabled={requestingPermission}
                    variant="secondary"
                    size="sm"
                  >
                    {requestingPermission ? 'Solicitando Permiso...' : 'Agregar Otro Dispositivo'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Acerca de las Notificaciones
            </h2>
            <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <p>
                <strong className="text-[var(--foreground)]">Lo que recibirás:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Nuevos anuncios y actualizaciones parroquiales</li>
                <li>Nuevos eventos agregados al calendario</li>
                <li>Recordatorios para eventos próximos (24 horas antes)</li>
              </ul>
              <p className="pt-2">
                <strong className="text-[var(--foreground)]">Tu privacidad:</strong>
              </p>
              <p>
                Las notificaciones solo se envían para tu parroquia. Tienes control total sobre
                habilitar y deshabilitar las notificaciones en cualquier momento. No se comparte
                información personal con terceros.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

