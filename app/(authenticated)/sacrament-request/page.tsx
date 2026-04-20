'use client'

import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '../RoleGuard'
import {
  createSacramentRequest,
  getSacramentDisplayName,
  type SacramentType,
} from '@/lib/supabase/sacrament-requests'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { translateError } from '@/lib/errors'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'

const SACRAMENT_OPTIONS: { value: SacramentType; label: string; description: string }[] = [
  {
    value: 'baptism',
    label: 'Bautismo',
    description: 'Solicita el bautismo para ti o un familiar'
  },
  {
    value: 'first_communion',
    label: 'Primera Comuni?n',
    description: 'Solicita la preparaci?n y celebraci?n de la primera comuni?n'
  },
  {
    value: 'confirmation',
    label: 'Confirmaci?n',
    description: 'Solicita la preparaci?n y celebraci?n de la confirmaci?n'
  },
  {
    value: 'marriage',
    label: 'Matrimonio',
    description: 'Solicita la preparaci?n y celebraci?n del matrimonio'
  }
]

export default function SacramentRequestPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <SacramentRequestContent />
    </RoleGuard>
  )
}

function SacramentRequestContent() {
  const { profile } = useProfile()
  const router = useRouter()
  const [selectedSacrament, setSelectedSacrament] = useState<SacramentType | null>(null)
  const [applicantName, setApplicantName] = useState('')
  const [applicantBirthdate, setApplicantBirthdate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSacrament) {
      setError('Por favor selecciona un tipo de sacramento')
      return
    }

    if (!applicantName.trim()) {
      setError('Por favor ingresa el nombre del solicitante')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createSacramentRequest({
        sacrament_type: selectedSacrament,
        applicant_name: applicantName.trim(),
        applicant_birthdate: applicantBirthdate || null,
      })

      // Redirect to status tracking page with success parameter
      router.push('/sacrament-request/status?success=true')
    } catch (err) {
      setError(translateError(err, { action: 'submit your sacrament request', resource: 'sacrament request' }))
      setSubmitting(false)
    }
  }

  // If no sacrament selected, show selection screen
  if (!selectedSacrament) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-serif text-[var(--foreground)]">
            Solicitar un Sacramento
          </h1>
          <p className="text-base text-[var(--muted-foreground)] font-sans">
            Por favor selecciona el sacramento que deseas solicitar. Tu solicitud será revisada por el personal parroquial.
          </p>
        </div>

        {/* First-time Hint */}
        <FirstTimeHint
          storageKey="sacrament_request"
          title="Solicitar un Sacramento"
          description="Cuando solicitas un sacramento, la oficina parroquial revisar? tu solicitud y te contactar? para discutir los requisitos de preparaci?n y la programaci?n. Podr?s rastrear el estado de tu solicitud y subir los documentos requeridos en la p?gina de estado despu?s del env?o."
        />

        {/* Sacrament Options */}
        <div className="grid gap-4 sm:grid-cols-2">
          {SACRAMENT_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className="cursor-pointer hover:shadow-md transition-all duration-300"
              onClick={() => setSelectedSacrament(option.value)}
            >
              <CardHeader>
                <CardTitle className="text-xl font-serif text-[var(--foreground)]">
                  {option.label}
                </CardTitle>
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show form for selected sacrament
  const selectedOption = SACRAMENT_OPTIONS.find(opt => opt.value === selectedSacrament)

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={() => setSelectedSacrament(null)}
          className="mb-2 -ml-2"
        >
          ? Volver a Selección
        </Button>
        <h1 className="text-3xl lg:text-4xl font-serif text-[var(--foreground)]">
          Request {selectedOption?.label}
        </h1>
        <p className="text-base text-[var(--muted-foreground)] font-sans">
          Por favor proporciona la siguiente información para enviar tu solicitud.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Nombre Completo del Solicitante <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Nombre completo de la persona que recibirá el sacramento"
                required
                disabled={submitting}
                className="w-full"
              />
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Ingresa el nombre completo de la persona que recibirá este sacramento (si es diferente de tu nombre)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Fecha de Nacimiento (Opcional)
              </label>
              <Input
                type="date"
                value={applicantBirthdate}
                onChange={(e) => setApplicantBirthdate(e.target.value)}
                disabled={submitting}
                className="w-full"
              />
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Ingresa la fecha de nacimiento si la conoces. Esto ayuda a la oficina parroquial a procesar tu solicitud.
              </p>
            </div>

            {/* What happens next? */}
            <Card className="bg-[var(--secondary)] border-[var(--border)]">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  ¿Qué sucede a continuación?
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Después de enviar tu solicitud, la oficina parroquial la revisará. Te contactarán 
                  para discutir los requisitos de preparación y la programación. Puedes rastrear el estado de 
                  tu solicitud y subir los documentos requeridos en la página de estado.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedSacrament(null)}
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
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
