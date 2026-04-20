'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

interface FeatureDisabledMessageProps {
  featureName?: string
  className?: string
}

/**
 * Message shown when a feature is disabled via feature flags
 * Explains that the feature is not available at their parish
 */
export function FeatureDisabledMessage({ 
  featureName = 'This feature',
  className = '' 
}: FeatureDisabledMessageProps) {
  return (
    <Card className={`border-[var(--border)] bg-[var(--secondary)] ${className}`}>
      <CardHeader>
        <CardTitle className="text-base text-[var(--foreground)]">
          Función No Disponible
        </CardTitle>
        <CardDescription>
          {featureName} is not currently available at your parish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--muted-foreground)]">
          Esta función puede estar habilitada en el futuro. Si tienes preguntas, por favor contacta a tu oficina parroquial.
        </p>
      </CardContent>
    </Card>
  )
}

