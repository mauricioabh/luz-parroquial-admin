'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { FeatureDisabledMessage } from './FeatureDisabledMessage'

interface FeatureFlagGuardProps {
  children: ReactNode
  featureName: 'donations' | 'emails' | 'sacraments' | string
  fallback?: ReactNode
  showMessage?: boolean
}

/**
 * Guard component that checks feature flags and shows disabled message if feature is off
 * Use this to wrap features that should be conditionally enabled
 */
export function FeatureFlagGuard({
  children,
  featureName,
  fallback,
  showMessage = true
}: FeatureFlagGuardProps) {
  const { profile } = useProfile()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkFeature = async () => {
      if (!profile?.parish_id) {
        setLoading(false)
        return
      }

      try {
        const isEnabled = await isFeatureEnabled(profile.parish_id, featureName)
        setEnabled(isEnabled)
      } catch (error) {
        console.error('Error checking feature flag:', error)
        // Default to disabled on error for safety
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    checkFeature()
  }, [profile?.parish_id, featureName])

  if (loading) {
    return null // Or a loading spinner
  }

  if (!enabled) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    if (showMessage) {
      return <FeatureDisabledMessage featureName={featureName} />
    }
    
    return null
  }

  return <>{children}</>
}

