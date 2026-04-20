'use client'

import { supabase } from './client'

export interface SubscriptionPlan {
  id: string
  name: string
  monthly_price: number // Price in cents
  features: {
    max_members?: number
    features: string[]
  }
  created_at: string
}

export interface ParishSubscription {
  id: string
  parish_id: string
  plan_id: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled'
  started_at: string
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface SubscriptionWithPlan extends ParishSubscription {
  plan: SubscriptionPlan
}

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('monthly_price', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get the current subscription for a parish
 */
export async function getParishSubscription(
  parishId: string
): Promise<SubscriptionWithPlan | null> {
  const { data, error } = await supabase
    .from('parish_subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('parish_id', parishId)
    .single()

  if (error) {
    // If no subscription found, return null (not an error)
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  if (!data) {
    return null
  }

  return {
    ...data,
    plan: data.plan as SubscriptionPlan
  }
}

/**
 * Format price in cents to dollar string
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ParishSubscription['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'trial':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

