'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import { getOnboardingStatus } from '@/lib/supabase/onboarding'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function OnboardingPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <OnboardingContent />
    </RoleGuard>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const { profile } = useProfile()
  const [onboarding, setOnboarding] = useState<Awaited<ReturnType<typeof getOnboardingStatus>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOnboarding = async () => {
      if (!profile?.parish_id) return

      try {
        const status = await getOnboardingStatus(profile.parish_id)
        setOnboarding(status)
      } catch (err) {
        const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String((err as { message?: unknown }).message) : 'Error desconocido')
        console.error('Error loading onboarding status:', msg || err)
        setOnboarding(null)
      } finally {
        setLoading(false)
      }
    }

    loadOnboarding()
  }, [profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando estado de configuración...</p>
        </div>
      </div>
    )
  }

  if (!onboarding) return null

  const tasks = [
    {
      id: 'parish_info',
      title: 'Completar Información de la Parroquia',
      description: 'Agrega el nombre de tu parroquia, ubicación y detalles de la diócesis',
      completed: onboarding.parish_info_completed,
      action: () => router.push('/admin/settings'),
      helpText: 'Ve a Configuración para actualizar la información de tu parroquia. Asegúrate de que todos los campos requeridos estén llenos.'
    },
    {
      id: 'mass_schedule',
      title: 'Agregar Horario de Misa',
      description: 'Crea eventos de Misa recurrentes para que los feligreses sepan cuándo asistir',
      completed: onboarding.mass_schedule_added,
      action: () => router.push('/events'),
      helpText: 'Crea eventos para tus horarios de Misa regulares. Usa títulos como "Misa Dominical" o "Misa Diaria" para que sean reconocidos automáticamente.'
    },
    {
      id: 'admins',
      title: 'Invitar Administradores',
      description: 'Invita a sacerdotes, secretarios y editores para ayudar a gestionar tu parroquia',
      completed: onboarding.admins_invited,
      action: () => router.push('/admin/users'),
      helpText: 'Invita al menos un administrador adicional (sacerdote, secretario o editor) para ayudar a gestionar tu parroquia.'
    },
    {
      id: 'ministries',
      title: 'Crear Ministerios',
      description: 'Configura los ministerios y grupos de tu parroquia',
      completed: onboarding.ministries_created,
      action: () => router.push('/admin/ministries'),
      helpText: 'Crea al menos un ministerio para organizar las actividades y grupos de tu parroquia.'
    }
  ]

  const completedCount = tasks.filter(t => t.completed).length
  const progressPercentage = onboarding.progress

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Configuración de la Parroquia
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Completa estos pasos para configurar completamente tu parroquia
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Progreso de Configuración</CardTitle>
              <CardDescription>
                {completedCount} de {tasks.length} tareas completadas
              </CardDescription>
            </div>
            {onboarding.is_complete && (
              <Badge variant="default" className="bg-green-600">
                ¡Completo!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--foreground)] font-medium">
                  {Math.round(progressPercentage)}% Completado
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {completedCount}/{tasks.length}
                </span>
              </div>
              <div className="w-full bg-[var(--secondary)] rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {onboarding.is_complete && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">
                      ¡Felicitaciones! Tu parroquia está completamente configurada.
                    </h3>
                    <p className="text-sm text-green-700">
                      Todas las tareas de configuración están completas. ¡Tu parroquia está lista para funcionar!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task, index) => (
          <Card key={task.id} className={task.completed ? 'border-green-200 bg-green-50/30' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Checkbox/Number */}
                <div className="flex-shrink-0">
                  {task.completed ? (
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-[var(--secondary)] border-2 border-[var(--border)] rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {index + 1}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                        {task.title}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)] mb-3">
                        {task.description}
                      </p>
                      {!task.completed && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <strong className="font-medium">💡 Tip:</strong> {task.helpText}
                          </p>
                        </div>
                      )}
                    </div>
                    {task.completed && (
                      <Badge variant="default" className="bg-green-600 flex-shrink-0">
                        Completado
                      </Badge>
                    )}
                  </div>

                  {!task.completed && (
                    <div className="mt-4">
                      <Button onClick={task.action}>
                        {task.id === 'parish_info' && 'Ir a Configuración'}
                        {task.id === 'mass_schedule' && 'Agregar Horario de Misas'}
                        {task.id === 'admins' && 'Invitar Administradores'}
                        {task.id === 'ministries' && 'Crear Ministerios'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Configuración</CardTitle>
          <CardDescription>
            Descarga plantillas listas para usar para dar la bienvenida a tu comunidad parroquial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-[var(--border)] rounded-lg space-y-2">
              <h3 className="font-semibold text-[var(--foreground)]">Correo de Bienvenida</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Plantilla de correo de bienvenida lista para enviar para nuevos registros parroquiales
              </p>
              <Button
                onClick={() => {
                  if (!profile?.parish_id) return
                  const url = `/api/templates?type=welcome_email&parish_id=${profile.parish_id}`
                  window.open(url, '_blank')
                }}
                variant="outline"
                className="w-full"
              >
                Ver Plantilla
              </Button>
            </div>

            <div className="p-4 border border-[var(--border)] rounded-lg space-y-2">
              <h3 className="font-semibold text-[var(--foreground)]">Texto de Anuncio</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Texto de anuncio pre-escrito para compartir con tu comunidad parroquial
              </p>
              <Button
                onClick={() => {
                  if (!profile?.parish_id) return
                  const url = `/api/templates?type=announcement_text&parish_id=${profile.parish_id}`
                  window.open(url, '_blank')
                }}
                variant="outline"
                className="w-full"
              >
                Ver Plantilla
              </Button>
            </div>

            <div className="p-4 border border-[var(--border)] rounded-lg space-y-2">
              <h3 className="font-semibold text-[var(--foreground)]">Inserción de Boletín</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Plantilla en Markdown para inserción de boletín o anuncio de boletín informativo
              </p>
              <Button
                onClick={() => {
                  if (!profile?.parish_id) return
                  const url = `/api/templates?type=bulletin_insert&parish_id=${profile.parish_id}`
                  window.open(url, '_blank')
                }}
                variant="outline"
                className="w-full"
              >
                Ver Plantilla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      {!onboarding.is_complete && (
        <Card>
          <CardHeader>
            <CardTitle>¿Necesitas Ayuda?</CardTitle>
            <CardDescription>
              Obtén asistencia para configurar tu parroquia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <p>
                <strong className="text-[var(--foreground)]">Información de la Parroquia:</strong> Asegúrate de que todos los campos estén llenos en la configuración de tu parroquia.
              </p>
              <p>
                <strong className="text-[var(--foreground)]">Horario de Misas:</strong> Crea eventos con "Misa" en el título para detección automática.
              </p>
              <p>
                <strong className="text-[var(--foreground)]">Administradores:</strong> Necesitas al menos un administrador adicional (sacerdote, secretario o editor).
              </p>
              <p>
                <strong className="text-[var(--foreground)]">Ministerios:</strong> Crea al menos un ministerio para organizar las actividades de tu parroquia.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

