'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { translateError } from '@/lib/errors'
import { Button } from '@/components/ui/Button'

export default function RegisterParishPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    parish_name: '',
    diocese: '',
    city: '',
    country: ''
  })
  const [consent, setConsent] = useState({
    privacy_policy_accepted: false,
    terms_accepted: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    // Validate consent
    if (!consent.privacy_policy_accepted || !consent.terms_accepted) {
      setError('Debes aceptar la Política de Privacidad y los Términos de Uso para crear una cuenta')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/register-parish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          parish_name: formData.parish_name,
          diocese: formData.diocese,
          city: formData.city,
          country: formData.country,
          privacy_policy_accepted: consent.privacy_policy_accepted,
          terms_accepted: consent.terms_accepted
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar la parroquia')
      }

      setSuccess(true)
      
      // Auto-login and redirect after 2 seconds
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 2000)
    } catch (err) {
      setError(translateError(err, { action: 'register your parish', resource: 'parish' }))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle>¡Registro Exitoso!</CardTitle>
            <CardDescription>
              Tu parroquia ha sido creada. Redirigiendo al inicio de sesión...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Registra Tu Parroquia</CardTitle>
          <CardDescription>
            Get your parish set up in less than 30 minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] border-b pb-2">
                Tu Cuenta
              </h3>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Dirección de Correo Electrónico *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="tu.correo@ejemplo.com"
                />
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Nombre Completo *
                </label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                    Contraseña *
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Al menos 8 caracteres"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                    Confirmar Contraseña *
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Vuelve a ingresar la contraseña"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] border-b pb-2">
                Información de la Parroquia
              </h3>

              <div>
                <label htmlFor="parish_name" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Nombre de la Parroquia *
                </label>
                <Input
                  id="parish_name"
                  type="text"
                  value={formData.parish_name}
                  onChange={(e) => setFormData({ ...formData, parish_name: e.target.value })}
                  required
                  placeholder="ej., Parroquia de Santa María"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                    Ciudad *
                  </label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    placeholder="Ciudad"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                    País *
                  </label>
                  <Input
                    id="country"
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    placeholder="País"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="diocese" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Diócesis *
                </label>
                <Input
                  id="diocese"
                  type="text"
                  value={formData.diocese}
                  onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                  required
                  placeholder="ej., Arquidiócesis de Nueva York"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] border-b pb-2">
                Términos y Privacidad
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy_policy"
                    checked={consent.privacy_policy_accepted}
                    onChange={(e) => setConsent({ ...consent, privacy_policy_accepted: e.target.checked })}
                    required
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="privacy_policy" className="text-sm text-[var(--foreground)]">
                    He leído y acepto la{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Política de Privacidad
                    </a>
                    {' '}*
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={consent.terms_accepted}
                    onChange={(e) => setConsent({ ...consent, terms_accepted: e.target.checked })}
                    required
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-[var(--foreground)]">
                    He leído y acepto los{' '}
                    <a
                      href="/terms-of-use"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Términos de Uso
                    </a>
                    {' '}*
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Serás configurado como párroco/administrador de la parroquia. Después del registro, 
                puedes invitar administradores adicionales y completar la lista de configuración.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/login')}
                disabled={submitting}
                className="flex-1"
              >
                Volver al Inicio de Sesión
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Registrando...' : 'Registrar Parroquia'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

