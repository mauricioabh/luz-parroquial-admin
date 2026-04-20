'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface FirstTimeHintProps {
  storageKey: string
  title: string
  description: string
  onDismiss?: () => void
}

export function FirstTimeHint({
  storageKey,
  title,
  description,
  onDismiss,
}: FirstTimeHintProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(`hint_dismissed_${storageKey}`)
      if (!dismissed) {
        setIsVisible(true)
      }
    }
  }, [storageKey])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`hint_dismissed_${storageKey}`, 'true')
      setIsVisible(false)
      onDismiss?.()
    }
  }

  if (!isVisible) return null

  return (
    <Card className="border-blue-200 bg-blue-50/50 mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-serif text-[var(--foreground)] mb-2">
              {title}
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 text-xs"
          >
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
