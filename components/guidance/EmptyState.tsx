'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryDescription?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryDescription,
}: EmptyStateProps) {
  return (
    <Card className="border-[var(--border)] bg-[var(--background)]">
      <CardContent className="pt-12 pb-12 px-6 text-center">
        <h3 className="text-xl font-serif text-[var(--foreground)] mb-3">
          {title}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-2 max-w-md mx-auto">
          {description}
        </p>
        {secondaryDescription && (
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6 max-w-md mx-auto mt-3">
            {secondaryDescription}
          </p>
        )}
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            variant="outline"
            className="mt-6"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
