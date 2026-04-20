'use client'

import { useDemoMode } from '@/contexts/DemoModeContext'
import { useState } from 'react'

export function DemoModeBanner() {
  const { isDemo, loading } = useDemoMode()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if loading, not in demo mode, or dismissed
  if (loading || !isDemo || dismissed) {
    return null
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-30 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <span className="font-bold text-sm uppercase tracking-wide">Modo Demo</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">
              This is a demo parish. Emails and payments are disabled.
            </p>
          </div>
          <div className="sm:hidden">
            <p className="text-xs">Demo parish - emails disabled</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Cerrar banner"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

