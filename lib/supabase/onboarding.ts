'use client'

import { supabase } from './client'

export interface OnboardingStatus {
  parish_id: string
  parish_info_completed: boolean
  mass_schedule_added: boolean
  admins_invited: boolean
  ministries_created: boolean
  completed_at: string | null
  progress: number
  is_complete: boolean
}

/**
 * Get onboarding status for a parish
 * Returns null if RPC fails (e.g. function not yet deployed)
 */
const DEFAULT_ONBOARDING: OnboardingStatus = {
  parish_id: '',
  parish_info_completed: false,
  mass_schedule_added: false,
  admins_invited: false,
  ministries_created: false,
  completed_at: null,
  progress: 0,
  is_complete: false,
}

export async function getOnboardingStatus(parishId: string): Promise<OnboardingStatus> {
  const { data, error } = await supabase.rpc('get_onboarding_status', {
    p_parish_id: parishId
  })

  if (error) {
    console.warn('get_onboarding_status RPC error:', error.message || error.code)
    return { ...DEFAULT_ONBOARDING, parish_id: parishId }
  }

  return (data as OnboardingStatus) ?? { ...DEFAULT_ONBOARDING, parish_id: parishId }
}

/**
 * Update onboarding status for a specific field
 */
export async function updateOnboardingStatus(
  parishId: string,
  field: 'parish_info_completed' | 'mass_schedule_added' | 'admins_invited' | 'ministries_created',
  value: boolean
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_onboarding_status', {
    p_parish_id: parishId,
    p_field: field,
    p_value: value
  })

  if (error) {
    throw error
  }

  return data as boolean
}

