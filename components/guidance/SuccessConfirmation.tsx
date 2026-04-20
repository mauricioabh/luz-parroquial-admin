'use client'

import { Card, CardContent } from '@/components/ui/Card'

interface SuccessConfirmationProps {
  title: string
  message: string
  nextSteps?: string
  followUpTime?: string
}

export function SuccessConfirmation({
  title,
  message,
  nextSteps,
  followUpTime,
}: SuccessConfirmationProps) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/80">
      <CardContent className="pt-6">
        <h4 className="text-base font-serif text-emerald-900 mb-3">
          {title}
        </h4>
        <p className="text-sm text-emerald-800 leading-relaxed mb-3">
          {message}
        </p>
        {nextSteps && (
          <p className="text-xs text-emerald-700 leading-relaxed mb-2">
            <span className="font-medium">Qué sucede a continuación:</span> {nextSteps}
          </p>
        )}
        {followUpTime && (
          <p className="text-xs text-emerald-700 leading-relaxed">
            <span className="font-medium">Cuándo esperar seguimiento:</span> {followUpTime}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
