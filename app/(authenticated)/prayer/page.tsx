'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import { 
  createPrayerIntention, 
  getVisiblePrayerIntentions,
  type PrayerIntention,
  type CreatePrayerIntentionInput
} from '@/lib/supabase/prayer-intentions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { getCached, setCached, makeCacheKey } from '@/lib/cache'
import { useOnReconnect } from '@/lib/offline/network'
import { translateError } from '@/lib/errors'
import { EnhancedErrorDisplay } from '@/components/permissions'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { SuccessConfirmation } from '@/components/guidance/SuccessConfirmation'

export default function PrayerPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <PrayerContent />
    </RoleGuard>
  )
}

function PrayerContent() {
  const { profile } = useProfile()
  const [intentions, setIntentions] = useState<PrayerIntention[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [lastSubmissionVisibility, setLastSubmissionVisibility] = useState<'private' | 'parish' | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<CreatePrayerIntentionInput>({
    title: '',
    description: '',
    visibility: 'parish',
    is_anonymous: false,
  })

  const loadIntentions = async () => {
    if (!profile?.parish_id) return

    setLoading(true)
    setError(null)
    try {
      const data = await getVisiblePrayerIntentions()
      setIntentions(data)
      // Persist latest successful fetch for offline fallback
      const cacheKey = makeCacheKey(['prayerIntentions', profile.parish_id])
      setCached(cacheKey, data)
    } catch (err) {
      // Try offline cache
      const cacheKey = makeCacheKey(['prayerIntentions', profile?.parish_id])
      const cached = getCached<PrayerIntention[]>(cacheKey)
      if (cached) {
        setIntentions(cached)
      } else {
        setError(translateError(err, { action: 'load prayer intentions', resource: 'prayer intentions' }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntentions()
  }, [profile])

  // Auto-refresh on reconnect/visibility gain
  useOnReconnect(() => {
    // Avoid kicking off before profile loads
    if (profile) {
      loadIntentions()
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createPrayerIntention(formData)
      // Store visibility for success message
      setLastSubmissionVisibility(formData.visibility)
      // Reset form
      setFormData({
        title: '',
        description: '',
        visibility: 'parish',
        is_anonymous: false,
      })
      setShowForm(false)
      setSubmitted(true)
      // Reload intentions
      await loadIntentions()
      // Reset success message after 8 seconds
      setTimeout(() => {
        setSubmitted(false)
        setLastSubmissionVisibility(null)
      }, 8000)
    } catch (err) {
      setError(translateError(err, { action: 'submit your prayer intention', resource: 'prayer intention' }))
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-serif text-[var(--foreground)]">
          Intenciones de Oración
        </h1>
        <p className="text-base text-[var(--muted-foreground)] font-sans">
          Comparte tus intenciones de oración con la comunidad parroquial.
        </p>
      </div>

      {/* Success Message */}
      {submitted && (
        <SuccessConfirmation
          title="Intención de Oración Recibida"
          message="Gracias por compartir tu intención de oración con nosotros. Tu solicitud ha sido recibida y será compartida según la configuración de visibilidad que elegiste."
          nextSteps={
            lastSubmissionVisibility === 'parish'
              ? "Tu intención será visible para otros feligreses para que puedan unirse en oración. La verás aparecer en la lista de intenciones de la comunidad a continuación."
              : "Tu intención es privada y solo será visible para ti y los administradores parroquiales. Será mantenida en nuestras oraciones."
          }
        />
      )}

      {/* Error Message */}
      {error && (
        <EnhancedErrorDisplay
          error={error}
          context={{ action: 'submit your prayer intention', resource: 'prayer intention' }}
          dataSaved={false}
          onRetry={() => setError(null)}
          onDismiss={() => setError(null)}
        />
      )}

      {/* First-time Hint */}
      <FirstTimeHint
        storageKey="prayer_intentions"
        title="¿Qué son las Intenciones de Oración?"
        description="Las intenciones de oración son peticiones de oración personales que puedes compartir con la comunidad parroquial. Cuando envías una intención, otros feligreses pueden verla y unirse en oración. Puedes elegir mantener tu intención privada o compartirla con la comunidad."
      />

      {/* Primary Action */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto"
        >
          Enviar Intención de Oración
        </Button>
      </div>

      {/* Submit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          if (!submitting) {
            setShowForm(false)
            setError(null)
          }
        }}
        title="Enviar una Intención de Oración"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Título <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., For my family's health"
                required
                disabled={submitting}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Petición de Oración <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Por favor comparte tu intención de oración..."
                rows={6}
                required
                disabled={submitting}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                Visibility
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === 'private'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'parish' })}
                    disabled={submitting}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)] block">Privado</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Solo visible para ti y los administradores parroquiales
                    </span>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="parish"
                    checked={formData.visibility === 'parish'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'parish' })}
                    disabled={submitting}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)] block">Compartir con la Parroquia</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Visible para todos los feligreses
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                  disabled={submitting}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--foreground)]">
                  Enviar de forma anónima (tu nombre no se mostrará)
                </span>
              </label>
            </div>

            {/* What happens next? */}
            <Card className="bg-[var(--secondary)] border-[var(--border)]">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  ¿Qué sucede a continuación?
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Your prayer intention will be shared according to your chosen visibility settings. 
                  Si elegiste compartir con la parroquia, otros feligreses podrán orar por tu intención.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setError(null)
                }}
                disabled={submitting}
                className="w-full sm:w-auto sm:flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto sm:flex-1"
              >
                {submitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Community Intentions List */}
      <div className="space-y-2">
        <h2 className="text-xl font-serif text-[var(--foreground)]">
          Intenciones de Oración de la Comunidad
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Estas son intenciones de oración compartidas por miembros de nuestra comunidad parroquial.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando intenciones de oración...</p>
        </div>
      ) : intentions.length === 0 ? (
        <EmptyState
          title="Aún No Hay Intenciones de Oración"
          description="Aquí aparecerán las intenciones de oración compartidas por los feligreses. Cuando alguien comparte una intención, se convierte en una forma para que nuestra comunidad se apoye mutuamente en oración."
          secondaryDescription="Puedes ser el primero en compartir una intención de oración. Ya sea para ti mismo, un ser querido o una necesidad específica, tu comunidad parroquial puede unirse a ti en oración."
          actionLabel="Compartir una Intención de Oración"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {intentions.map((intention) => (
            <Card key={intention.id} className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-lg font-serif text-[var(--foreground)] flex-1">
                    {intention.title}
                  </CardTitle>
                  {intention.is_anonymous && (
                    <Badge variant="default">Anónimo</Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {formatDate(intention.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                  {intention.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
