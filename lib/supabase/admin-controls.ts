/**
 * Admin Controls Helper Functions
 * 
 * Provides utilities for admin controls: disable parish, lock user access
 */

import { supabase } from './client'

/**
 * Disable or enable a parish
 * Only priests and secretaries can disable/enable parishes
 */
export async function setParishStatus(
  parishId: string,
  disabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('set_parish_status', {
    p_parish_id: parishId,
    p_disabled: disabled,
  })

  if (error) {
    console.error('Error setting parish status:', error)
    return { success: false, error: error.message }
  }

  return { success: data?.success ?? false }
}

/**
 * Check if a parish is disabled
 */
export async function isParishDisabled(parishId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_parish_disabled', {
    p_parish_id: parishId,
  })

  if (error) {
    console.error('Error checking parish status:', error)
    // Default to false on error (assume enabled)
    return false
  }

  return data ?? false
}

/**
 * Lock or unlock a user's access
 * Only priests and secretaries can lock/unlock users
 */
export async function setUserLockStatus(
  userId: string,
  locked: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('set_user_lock_status', {
    p_user_id: userId,
    p_locked: locked,
    p_reason: reason || null,
  })

  if (error) {
    console.error('Error setting user lock status:', error)
    return { success: false, error: error.message }
  }

  return { success: data?.success ?? false }
}

/**
 * Check if current user's parish is disabled
 * Useful for middleware/route protection
 */
export async function checkParishEnabled(): Promise<{
  enabled: boolean
  error?: string
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { enabled: false, error: 'User not authenticated' }
  }

  // Get user's parish_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('parish_id, is_locked')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { enabled: false, error: 'Profile not found' }
  }

  // Check if user is locked
  if (profile.is_locked) {
    return { enabled: false, error: 'User access is locked' }
  }

  // Check if parish is disabled
  const disabled = await isParishDisabled(profile.parish_id)
  if (disabled) {
    return { enabled: false, error: 'Parish is disabled' }
  }

  return { enabled: true }
}

