'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/guidance/EmptyState'

export default function PaymentCancelPage() {
  const router = useRouter()

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <EmptyState
        title="Pago Cancelado"
        description="El pago del estipendio de intención de misa fue cancelado."
        secondaryDescription="No se ha procesado ningún pago. Puede intentar pagar nuevamente desde la página de Mis Intenciones cuando esté listo."
        actionLabel="Volver a Mis Intenciones"
        onAction={() => router.push('/mass-intentions')}
      />

      <Card className="bg-[var(--secondary)] border-[var(--border)]">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Si necesita ayuda con el pago o tiene alguna pregunta, por favor contacte a la oficina parroquial.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/mass-intentions')}
                className="flex-1"
              >
                Volver a Mis Intenciones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
