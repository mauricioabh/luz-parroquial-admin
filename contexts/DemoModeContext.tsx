'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useProfile } from './ProfileContext'
import { 
  isParishInDemoMode, 
  getParishDemoStatus, 
  resetDemoData, 
  DemoStatus, 
  ResetResult 
} from '@/lib/supabase/demo'

interface DemoModeContextType {
  isDemo: boolean
  demoStatus: DemoStatus | null
  loading: boolean
  error: string | null
  refreshStatus: () => Promise<void>
  resetDemo: () => Promise<ResetResult>
  isResetting: boolean
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const [isDemo, setIsDemo] = useState(false)
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (!profile?.parish_id) {
      setIsDemo(false)
      setDemoStatus(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Quick check if parish is in demo mode
      const isDemoMode = await isParishInDemoMode(profile.parish_id)
      setIsDemo(isDemoMode)

      if (isDemoMode) {
        // Get full demo status with data counts
        const status = await getParishDemoStatus(profile.parish_id)
        if (status.success) {
          setDemoStatus(status)
        } else {
          setError(status.error || 'Failed to get demo status')
        }
      } else {
        setDemoStatus(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check demo mode')
      setIsDemo(false)
      setDemoStatus(null)
    } finally {
      setLoading(false)
    }
  }, [profile?.parish_id])

  const resetDemo = useCallback(async (): Promise<ResetResult> => {
    if (!profile?.parish_id || !isDemo) {
      return { success: false, error: 'Not in demo mode or no parish' }
    }

    setIsResetting(true)

    try {
      const result = await resetDemoData(profile.parish_id)
      
      if (result.success) {
        // Refresh the status after reset
        await refreshStatus()
      }

      return result
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Reset failed' }
    } finally {
      setIsResetting(false)
    }
  }, [profile?.parish_id, isDemo, refreshStatus])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  return (
    <DemoModeContext.Provider
      value={{
        isDemo,
        demoStatus,
        loading,
        error,
        refreshStatus,
        resetDemo,
        isResetting,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}

