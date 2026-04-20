'use client'

import { Badge } from '@/components/ui/Badge'
import { HTMLAttributes } from 'react'

interface ReadOnlyIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'badge' | 'text' | 'subtle'
  className?: string
}

/**
 * Subtle read-only indicator
 * Shows when data is view-only (no disabled buttons with no explanation)
 */
export function ReadOnlyIndicator({ 
  variant = 'badge',
  className = '',
  ...props 
}: ReadOnlyIndicatorProps) {
  if (variant === 'badge') {
    return (
      <Badge variant="info" className={`${className}`} {...props}>
        Read-only
      </Badge>
    )
  }

  if (variant === 'text') {
    return (
      <p className={`text-xs text-[var(--muted-foreground)] italic ${className}`} {...props}>
        Read-only
      </p>
    )
  }

  // Subtle variant - just a small icon/text hint
  return (
    <span className={`text-xs text-[var(--muted-foreground)] opacity-60 ${className}`} {...props}>
      Solo lectura
    </span>
  )
}

