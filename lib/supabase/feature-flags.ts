/**
 * Feature Flags Helper Functions
 * 
 * Provides utilities to check and manage feature flags (global and per-parish)
 */

import { supabase } from './client'

export interface FeatureFlag {
  id: string
  flag_name: string
  flag_value: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export interface ParishFeatureFlag {
  id: string
  parish_id: string
  flag_name: string
  flag_value: boolean
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * Check if a feature is enabled for a parish
 * Uses RPC function that checks parish-specific flag first, then global flag
 */
export async function isFeatureEnabled(
  parishId: string,
  flagName: 'donations' | 'emails' | 'sacraments' | string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_parish_id: parishId,
    p_flag_name: flagName,
  })

  if (error) {
    console.error('Error checking feature flag:', error)
    // Default to false on error for safety
    return false
  }

  return data ?? false
}

/**
 * Set a parish-specific feature flag
 * Only priests and secretaries can set feature flags
 */
export async function setParishFeatureFlag(
  parishId: string,
  flagName: 'donations' | 'emails' | 'sacraments' | string,
  flagValue: boolean,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('set_parish_feature_flag', {
    p_parish_id: parishId,
    p_flag_name: flagName,
    p_flag_value: flagValue,
    p_description: description || null,
  })

  if (error) {
    console.error('Error setting feature flag:', error)
    return { success: false, error: error.message }
  }

  return { success: data?.success ?? false }
}

/**
 * Get all feature flags for a parish (parish-specific + global)
 */
export async function getParishFeatureFlags(
  parishId: string
): Promise<{
  global: FeatureFlag[]
  parish: ParishFeatureFlag[]
} | null> {
  // Get global flags (read-only for non-service-role users)
  const { data: globalFlags, error: globalError } = await supabase
    .from('feature_flags')
    .select('*')
    .order('flag_name')

  if (globalError) {
    console.error('Error fetching global feature flags:', globalError)
    return null
  }

  // Get parish-specific flags
  const { data: parishFlags, error: parishError } = await supabase
    .from('parish_feature_flags')
    .select('*')
    .eq('parish_id', parishId)
    .order('flag_name')

  if (parishError) {
    console.error('Error fetching parish feature flags:', parishError)
    return null
  }

  return {
    global: globalFlags || [],
    parish: parishFlags || [],
  }
}

/**
 * Get effective feature flag value for a parish
 * Returns the parish-specific value if set, otherwise global value
 */
export async function getEffectiveFeatureFlag(
  parishId: string,
  flagName: 'donations' | 'emails' | 'sacraments' | string
): Promise<boolean | null> {
  const flags = await getParishFeatureFlags(parishId)
  if (!flags) return null

  // Check parish-specific flag first
  const parishFlag = flags.parish.find((f) => f.flag_name === flagName)
  if (parishFlag) {
    return parishFlag.flag_value
  }

  // Check global flag
  const globalFlag = flags.global.find((f) => f.flag_name === flagName)
  if (globalFlag) {
    return globalFlag.flag_value
  }

  // Default to true if flag doesn't exist (backward compatibility)
  return true
}

