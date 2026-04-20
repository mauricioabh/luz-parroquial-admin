'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function OfferingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Small delay to show success message
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">¡Gracias!</CardTitle>
          <CardDescription>
            Tu ofrenda ha sido recibida exitosamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Tu pago ha sido procesado. Estamos agradecidos por tu generosa contribución a nuestra parroquia.
            </p>
          </div>

          {sessionId && (
            <div className="text-xs text-[var(--muted-foreground)]">
              ID de Transacción: {sessionId}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => router.push('/offerings')}
            >
              Hacer Otra Ofrenda
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Volver al Panel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

