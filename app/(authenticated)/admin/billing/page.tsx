'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getParishSubscription,
  getSubscriptionPlans,
  formatPrice,
  getStatusColor,
  type SubscriptionWithPlan,
  type SubscriptionPlan
} from '@/lib/supabase/subscriptions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Traducción de nombres de planes y características al español
const PLAN_NAMES: Record<string, string> = {
  'Free (Pilot)': 'Gratis (Piloto)',
  'Parish': 'Parroquia',
  'Diocese': 'Diócesis',
}

const FEATURE_TRANSLATIONS: Record<string, string> = {
  'Basic member management': 'Gestión básica de miembros',
  'Sacrament records': 'Registros de sacramentos',
  'Mass intentions': 'Intenciones de misa',
  'Basic announcements': 'Anuncios básicos',
  'Community support': 'Soporte comunitario',
  'Unlimited member management': 'Gestión ilimitada de miembros',
  'Full sacrament records': 'Registros completos de sacramentos',
  'Mass intentions & scheduling': 'Intenciones de misa y programación',
  'Announcements & events': 'Anuncios y eventos',
  'Ministries management': 'Gestión de ministerios',
  'Donation tracking': 'Seguimiento de donaciones',
  'Email support': 'Soporte por correo',
  'Priority updates': 'Actualizaciones prioritarias',
  'Everything in Parish plan': 'Todo lo del plan Parroquia',
  'Multi-parish management': 'Gestión multi-parroquial',
  'Diocese-wide analytics': 'Analíticas a nivel diócesis',
  'Advanced reporting': 'Informes avanzados',
  'Custom integrations': 'Integraciones personalizadas',
  'Dedicated support': 'Soporte dedicado',
  'Training & onboarding': 'Capacitación e incorporación',
  'Custom feature requests': 'Solicitudes de funciones personalizadas',
}

function translatePlanName(name: string): string {
  return PLAN_NAMES[name] ?? name
}

function translateFeature(feature: string): string {
  return FEATURE_TRANSLATIONS[feature] ?? feature
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    trial: 'Prueba',
    past_due: 'Vencido',
    cancelled: 'Cancelado',
  }
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

export default function BillingPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <BillingContent />
    </RoleGuard>
  )
}

function BillingContent() {
  const { profile } = useProfile()
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.parish_id) return

      try {
        setLoading(true)
        setError(null)

        const [subscriptionData, plansData] = await Promise.all([
          getParishSubscription(profile.parish_id),
          getSubscriptionPlans()
        ])

        setSubscription(subscriptionData)
        setPlans(plansData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la información de facturación')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Cargando información de facturación...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-red-600 dark:text-red-400">{error}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Facturación y Suscripción</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona la suscripción de tu parroquia y visualiza los planes disponibles
          </p>
        </div>

        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Actual</CardTitle>
            <CardDescription>
              Tu plan de suscripción actual y estado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">
                      {translatePlanName(subscription.plan.name)}
                    </h3>
                    <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
                      {formatPrice(subscription.plan.monthly_price)}
                      <span className="text-sm font-normal text-[var(--muted-foreground)]">/mes</span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      subscription.status
                    )}`}
                  >
                    {translateStatus(subscription.status)}
                  </span>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-3">Características del Plan</h4>
                  <ul className="space-y-2">
                    {subscription.plan.features.features?.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-[var(--foreground)]">{translateFeature(feature)}</span>
                      </li>
                    ))}
                  </ul>
                  {subscription.plan.features.max_members && (
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                      Hasta {subscription.plan.features.max_members.toLocaleString()} miembros
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Iniciado: {new Date(subscription.started_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--muted-foreground)] mb-4">
                  No se encontró una suscripción activa. Por favor contáctanos para configurar tu plan.
                </p>
                <Button
                  onClick={() => {
                    window.location.href = 'mailto:support@luzparroquial.com?subject=Consulta de Suscripción'
                  }}
                >
                  Contáctanos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planes Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle>Planes Disponibles</CardTitle>
            <CardDescription>
              Elige el plan que mejor se adapte a las necesidades de tu parroquia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const isCurrentPlan = subscription?.plan_id === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`p-6 rounded-lg border-2 ${
                      isCurrentPlan
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                        {translatePlanName(plan.name)}
                      </h3>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {formatPrice(plan.monthly_price)}
                        <span className="text-sm font-normal text-[var(--muted-foreground)]">/mes</span>
                      </p>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.features?.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <svg
                            className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-[var(--foreground)]">{translateFeature(feature)}</span>
                        </li>
                      ))}
                      {plan.features.features && plan.features.features.length > 5 && (
                        <li className="text-sm text-[var(--muted-foreground)]">
                          +{plan.features.features.length - 5} características más
                        </li>
                      )}
                    </ul>

                    {plan.features.max_members && (
                      <p className="text-sm text-[var(--muted-foreground)] mb-4">
                        Hasta {plan.features.max_members.toLocaleString()} miembros
                      </p>
                    )}

                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="outline">
                        Plan Actual
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => {
                          window.location.href = `mailto:support@luzparroquial.com?subject=Actualizar a ${encodeURIComponent(translatePlanName(plan.name))}&body=Hola, me gustaría actualizar al plan ${encodeURIComponent(translatePlanName(plan.name))}.`
                        }}
                      >
                        Contáctanos para Actualizar
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>¿Necesitas Ayuda?</CardTitle>
            <CardDescription>
              Nuestro equipo está aquí para ayudarte con preguntas de facturación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-[var(--foreground)]">
                Para preguntas sobre tu suscripción, actualizaciones o facturación, por favor contáctanos:
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = 'mailto:support@luzparroquial.com?subject=Pregunta de Facturación'
                  }}
                >
                  Enviar Correo de Soporte
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

