'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface PermissionDeniedProps {
  title?: string
  message?: string
  action?: string
  onAction?: () => void
  actionLabel?: string
}

/**
 * Friendly permission denied message
 * Used when a user lacks access to a page or action
 */
export function PermissionDenied({
  title = "Acceso Restringido",
  message = "Esta acción es gestionada por la oficina parroquial.",
  action,
  onAction,
  actionLabel = "Ir al Panel"
}: PermissionDeniedProps) {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Si crees que deberías tener acceso a esto, por favor contacta a tu administrador parroquial.
        </p>
        {(onAction || action) && (
          <Button
            variant="outline"
            onClick={onAction || (action ? () => window.location.href = action : undefined)}
            className="w-full"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

