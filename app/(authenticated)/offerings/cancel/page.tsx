'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function OfferingCancelPage() {
  const router = useRouter()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Pago Cancelado</CardTitle>
          <CardDescription>
            Tu ofrenda no fue completada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              El proceso de pago fue cancelado. No se realizó ningún cargo a tu cuenta.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => router.push('/offerings')}
            >
              Intentar Nuevamente
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

