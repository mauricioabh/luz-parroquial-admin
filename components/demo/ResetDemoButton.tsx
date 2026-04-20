'use client'

import { useDemoMode } from '@/contexts/DemoModeContext'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

interface ResetDemoButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export function ResetDemoButton({ className = '', variant = 'outline', size = 'md' }: ResetDemoButtonProps) {
  const { isDemo, resetDemo, isResetting, demoStatus } = useDemoMode()
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

  // Don't show if not in demo mode
  if (!isDemo) {
    return null
  }

  const handleReset = async () => {
    setResult(null)
    const resetResult = await resetDemo()
    
    if (resetResult.success) {
      setResult({ success: true, message: 'Demo data has been reset successfully!' })
      setShowConfirm(false)
    } else {
      setResult({ success: false, message: resetResult.error || 'Error al restablecer datos de demo' })
    }

    // Clear result message after 5 seconds
    setTimeout(() => setResult(null), 5000)
  }

  if (showConfirm) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-sm text-[var(--muted-foreground)]">¿Restablecer todos los datos de demostración?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Resetting...
            </>
          ) : (
            'Sí, Restablecer'
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isResetting}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="inline-flex items-center gap-3">
        <Button
          variant={variant}
          size={size}
          onClick={() => setShowConfirm(true)}
          className="gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Restablecer Datos de Demo
        </Button>
        {demoStatus?.data_counts && (
          <span className="text-xs text-[var(--muted-foreground)]">
            {demoStatus.data_counts.members} members, {demoStatus.data_counts.events} events
          </span>
        )}
      </div>
      {result && (
        <div
          className={`mt-2 text-sm px-3 py-2 rounded ${
            result.success
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}

