'use client'

import { useState, FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function DataRequestPage() {
  const [formData, setFormData] = useState({
    email: '',
    request_type: 'access',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.request_type) {
      setError('El correo electrónico y el tipo de solicitud son requeridos')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/data-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la solicitud de datos')
      }

      setSuccess(true)
      setRequestId(data.data_request?.id || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud de datos')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle>Solicitud Enviada Exitosamente</CardTitle>
            <CardDescription>
              Tu solicitud de protección de datos ha sido recibida
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestId && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>ID de Solicitud:</strong> {requestId}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Por favor guarda este ID para tus registros
                </p>
              </div>
            )}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">
                <strong>¿Qué sigue?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                <li>Revisaremos tu solicitud dentro de 1 día hábil</li>
                <li>Procesaremos tu solicitud dentro de 30 días según lo requieren las leyes de protección de datos aplicables</li>
                <li>Recibirás actualizaciones por correo electrónico en {formData.email}</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSuccess(false)
                  setFormData({ email: '', request_type: 'access', description: '' })
                  setRequestId(null)
                }}
                className="flex-1"
              >
                Enviar Otra Solicitud
              </Button>
              <Button
                type="button"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-[var(--border)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Luz Parroquial — Cuenta y datos personales</CardTitle>
            <CardDescription>
              Canal oficial para solicitudes de protección de datos y eliminación de cuenta de la app móvil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--foreground)]">
            <p>
              Esta página es el canal oficial de <strong>Luz Parroquial</strong> (aplicación móvil de oración y
              servicios asociados) para solicitudes de protección de datos y <strong>eliminación de cuenta</strong>.
            </p>
            <p className="font-medium text-[var(--card-foreground)]">Cómo solicitar la eliminación de tu cuenta</p>
            <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
              <li>
                Usa el mismo <strong>correo electrónico</strong> con el que inicias sesión en la app.
              </li>
              <li>
                En &quot;Tipo de solicitud&quot;, elige <strong>Eliminar mis datos</strong> (incluye baja de la cuenta
                y datos asociados según se indica en la{' '}
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Política de Privacidad
                </Link>
                ).
              </li>
              <li>
                Opcional: añade en &quot;Detalles adicionales&quot; que deseas{' '}
                <strong>eliminar la cuenta de la app</strong> y cualquier contexto útil.
              </li>
              <li>Envía el formulario y conserva el <strong>ID de solicitud</strong> que te mostraremos.</li>
            </ol>
            <p className="text-[var(--muted-foreground)]">
              Trataremos la solicitud en un plazo de hasta <strong>30 días</strong> cuando así lo exija la ley
              aplicable. Podemos pedirte que verifiques que eres el titular del correo. Los plazos de retención y
              borrado (incluido el borrado definitivo tras un periodo de gracia) están descritos en la política de
              privacidad.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Solicitud de Protección de Datos</CardTitle>
            <CardDescription>
              Ejerce tus derechos bajo GDPR, LFPDPPP (México) y otras leyes de protección de datos aplicables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

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
                <p className="text-xs text-gray-500 mt-1">
                  Usaremos este correo para comunicarnos sobre tu solicitud
                </p>
              </div>

              <div>
                <label htmlFor="request_type" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Tipo de Solicitud *
                </label>
                <select
                  id="request_type"
                  value={formData.request_type}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="access">Acceder a mis datos</option>
                  <option value="deletion">Eliminar mis datos</option>
                  <option value="correction">Corregir mis datos</option>
                  <option value="portability">Exportar mis datos (Portabilidad)</option>
                  <option value="objection">Oponerme al procesamiento</option>
                </select>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p><strong>Acceso:</strong> Recibe una copia de tus datos personales</p>
                  <p><strong>Eliminación:</strong> Solicita la eliminación permanente de tus datos</p>
                  <p><strong>Corrección:</strong> Solicita la corrección de datos inexactos</p>
                  <p><strong>Portabilidad:</strong> Recibe tus datos en un formato legible por máquina</p>
                  <p><strong>Oposición:</strong> Oponte al procesamiento de tus datos</p>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Detalles Adicionales (Opcional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Por favor proporciona cualquier contexto adicional o detalles específicos sobre tu solicitud..."
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Tus Derechos:</strong> Bajo las leyes de protección de datos, tienes derecho a acceder, 
                  corregir, eliminar u oponerte al procesamiento de tus datos personales. Procesaremos tu 
                  solicitud dentro de 30 días según lo requiere la ley.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  Al enviar esta solicitud, confirmas que eres el propietario de la dirección de correo proporcionada 
                  o estás autorizado para actuar en nombre del titular de los datos. Podemos verificar tu identidad antes de 
                  procesar tu solicitud. Consulta nuestra{' '}
                  <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                    Política de Privacidad
                  </Link>
                  {' '}para más información.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

