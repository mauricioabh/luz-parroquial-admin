'use client'

import { useDemoMode } from '@/contexts/DemoModeContext'
import { Card } from '@/components/ui/Card'
import { ResetDemoButton } from './ResetDemoButton'

export function DemoModeCard() {
  const { isDemo, demoStatus, loading } = useDemoMode()

  // Don't show if not in demo mode
  if (!isDemo || loading) {
    return null
  }

  const counts = demoStatus?.data_counts

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg
                className="w-6 h-6 text-white"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Modo Demo Activo
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {demoStatus?.parish_name || 'Demo Parish'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
              Demo Features
            </h4>
            <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Emails disabled (no real messages sent)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Payments disabled (no real charges)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Realistic sample data included
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                One-click data reset available
              </li>
            </ul>
          </div>

          {counts && (
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                Demo Data Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {counts.members}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Members</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {counts.events}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Events</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {counts.ministries}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Ministries</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {counts.donations}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Donations</div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <ResetDemoButton variant="default" size="md" />
          </div>
        </div>
      </div>
    </Card>
  )
}

