'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { checkParishEnabled } from '@/lib/supabase/admin-controls'
import { supabase } from '@/lib/supabase/client'
import { DisabledParishNotice, LockedUserNotice } from '@/components/permissions'

/**
 * Page shown when user access is restricted (parish disabled or user locked)
 * Replaces the redirect to login with error parameter
 */
export default function AccessRestrictedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState<'disabled' | 'locked' | 'unknown'>('unknown')
  const [lockReason, setLockReason] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Check parish and user status
        const parishCheck = await checkParishEnabled()
        
        if (!parishCheck.enabled) {
          // Determine if it's parish disabled or user locked
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_locked, lock_reason')
            .eq('id', user.id)
            .single()

          if (profile?.is_locked) {
            setReason('locked')
            setLockReason(profile.lock_reason || null)
          } else {
            setReason('disabled')
          }
        } else {
          // Shouldn't be here if access is enabled
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Error checking access:', error)
        setReason('unknown')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-2xl">
        {reason === 'disabled' && <DisabledParishNotice />}
        {reason === 'locked' && <LockedUserNotice reason={lockReason || undefined} />}
        {reason === 'unknown' && (
          <div className="text-center">
            <p className="text-[var(--muted-foreground)]">
              No se pudo determinar el estado de acceso. Por favor contacta al administrador de tu parroquia.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

