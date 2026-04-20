'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SuccessConfirmation } from '@/components/guidance/SuccessConfirmation'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <SuccessConfirmation
        title="Pago Recibido"
        message="Su pago del estipendio de intención de misa ha sido procesado exitosamente."
        nextSteps="El pago ha sido registrado. La parroquia revisará y confirmará su intención de misa. Puede seguir el estado de su intención en la página de Mis Intenciones."
        followUpTime="Recibirá una notificación cuando su intención sea confirmada por la parroquia."
      />

      <Card className="bg-[var(--secondary)] border-[var(--border)]">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {sessionId && (
              <div className="text-sm">
                <span className="text-[var(--muted-foreground)]">ID de sesión de pago:</span>{' '}
                <code className="text-xs bg-[var(--background)] px-2 py-1 rounded">
                  {sessionId}
                </code>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/mass-intentions')}
                className="flex-1"
              >
                Ver Mis Intenciones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
