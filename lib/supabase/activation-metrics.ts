'use client'

import { supabase } from './client'

export interface ActivationMetric {
  day: number
  date: string
  events_created: number
  announcements_published: number
  ministries_created: number
  users_invited: number
  active_users: number
  total_logins: number
  onboarding_completed: boolean
}

export interface ActivationSummary {
  parish_id: string
  metrics: ActivationMetric[]
  totals: {
    total_events: number
    total_announcements: number
    total_ministries: number
    total_users_invited: number
    max_active_users: number
    total_logins: number
    completed_on_day: number | null
  }
}

/**
 * Get 7-day activation summary for a parish
 */
export async function getActivationSummary(parishId: string): Promise<ActivationSummary | null> {
  const { data, error } = await supabase.rpc('get_activation_summary', {
    p_parish_id: parishId
  })

  if (error) {
    console.error('Error fetching activation summary:', error)
    return null
  }

  return data as ActivationSummary | null
}

/**
 * Calculate and update activation metrics for a specific day
 * (This should be called by a background job or scheduled task)
 */
export async function calculateActivationMetrics(
  parishId: string,
  day: number
): Promise<void> {
  const { error } = await supabase.rpc('calculate_activation_metrics', {
    p_parish_id: parishId,
    p_metric_day: day
  })

  if (error) {
    console.error('Error calculating activation metrics:', error)
    throw error
  }
}

/**
 * Initialize activation metrics for a parish
 * (Called automatically when parish is created)
 */
export async function initializeActivationMetrics(parishId: string): Promise<void> {
  const { error } = await supabase.rpc('initialize_activation_metrics', {
    p_parish_id: parishId
  })

  if (error) {
    console.error('Error initializing activation metrics:', error)
    throw error
  }
}

