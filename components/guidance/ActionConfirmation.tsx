'use client'

import { Card, CardContent } from '@/components/ui/Card'

interface ActionConfirmationProps {
  title: string
  message: string
  affectedItems?: string[]
  nextSteps?: string
  isDestructive?: boolean
}

export function ActionConfirmation({
  title,
  message,
  affectedItems,
  nextSteps,
  isDestructive = false,
}: ActionConfirmationProps) {
  const bgColor = isDestructive 
    ? 'border-amber-200 bg-amber-50/80' 
    : 'border-emerald-200 bg-emerald-50/80'
  const textColor = isDestructive 
    ? 'text-amber-900' 
    : 'text-emerald-900'
  const textColorSecondary = isDestructive 
    ? 'text-amber-800' 
    : 'text-emerald-800'
  const textColorTertiary = isDestructive 
    ? 'text-amber-700' 
    : 'text-emerald-700'

  return (
    <Card className={bgColor}>
      <CardContent className="pt-6">
        <h4 className={`text-base font-serif ${textColor} mb-3`}>
          {title}
        </h4>
        <p className={`text-sm ${textColorSecondary} leading-relaxed mb-3`}>
          {message}
        </p>
        {affectedItems && affectedItems.length > 0 && (
          <div className={`mb-3 p-3 bg-white/50 rounded-md`}>
            <p className={`text-xs font-medium ${textColorTertiary} mb-2`}>
              Quién está afectado:
            </p>
            <ul className={`text-xs ${textColorSecondary} space-y-1`}>
              {affectedItems.map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
        {nextSteps && (
          <p className={`text-xs ${textColorTertiary} leading-relaxed`}>
            <span className="font-medium">Qué sucede a continuación:</span> {nextSteps}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

