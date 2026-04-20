'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { translateError, formatError, ErrorContext } from '@/lib/errors'

interface EnhancedErrorDisplayProps {
  error: unknown
  context?: ErrorContext
  dataSaved?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * Enhanced error display with:
 * - What went wrong (user-friendly message)
 * - Whether data was saved
 * - What to do next (recovery steps)
 * - Neutral tones (no warning red unless critical)
 */
export function EnhancedErrorDisplay({
  error,
  context,
  dataSaved,
  onRetry,
  onDismiss,
  className = ''
}: EnhancedErrorDisplayProps) {
  const errorInfo = formatError(error, context)
  const message = translateError(error, context)
  
  // Determine severity based on error type
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  const isCritical = errorMessage.includes('locked') || 
                     errorMessage.includes('disabled') ||
                     errorMessage.includes('unauthorized') ||
                     errorMessage.includes('not authenticated')
  
  // Use neutral tones unless critical
  const cardClass = isCritical 
    ? 'border-amber-200 bg-amber-50/50'
    : 'border-[var(--border)] bg-[var(--card)]'
  
  const titleColor = isCritical ? 'text-amber-900' : 'text-[var(--card-foreground)]'
  const textColor = isCritical ? 'text-amber-800' : 'text-[var(--foreground)]'
  const mutedColor = isCritical ? 'text-amber-700' : 'text-[var(--muted-foreground)]'

  return (
    <Card className={`${cardClass} ${className}`}>
      <CardHeader>
        <CardTitle className={`text-lg ${titleColor}`}>
          {isCritical ? 'Problema de Acceso' : 'Algo Salió Mal'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main error message */}
        <div>
          <p className={`text-sm ${textColor} mb-2`}>
            {message}
          </p>
          
          {/* Data save status */}
          {dataSaved !== undefined && (
            <div className={`mt-3 p-2 rounded text-xs ${dataSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {dataSaved 
                ? '✓ Tus datos se guardaron antes de que ocurriera este error.'
                : '⚠ Tus datos pueden no haberse guardado. Por favor verifica antes de intentar nuevamente.'}
            </div>
          )}
        </div>

        {/* Recovery steps */}
        {errorInfo.recoverySteps && errorInfo.recoverySteps.length > 0 && (
          <div className="pt-3 border-t border-[var(--border)]">
            <p className={`text-xs font-medium mb-2 ${mutedColor}`}>
              Qué hacer a continuación:
            </p>
            <ul className={`list-disc list-inside space-y-1 text-xs ${mutedColor}`}>
              {errorInfo.recoverySteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex-1"
            >
              Intentar Nuevamente
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="flex-1"
            >
              Descartar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

