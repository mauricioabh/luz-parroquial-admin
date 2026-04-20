'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function DonateSuccessPage() {
  const router = useRouter()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">¡Gracias!</CardTitle>
          <CardDescription>
            Tu donación ha sido procesada exitosamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[var(--card-foreground)]">
            Estamos agradecidos por tu generosa contribución a nuestra comunidad parroquial. Tu donación nos ayuda a continuar nuestra misión y servir a nuestra comunidad.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => router.push('/dashboard')}>
              Volver al Panel
            </Button>
            <Button variant="outline" onClick={() => router.push('/donate')}>
              Hacer Otra Donación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


