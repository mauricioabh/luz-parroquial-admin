import { supabase } from './client'

export interface Offering {
  id: string
  parish_id: string
  user_id: string
  amount: number
  currency: string
  purpose: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export interface OfferingWithUser extends Offering {
  user: {
    id: string
    full_name: string
  } | null
}

export interface CreateOfferingInput {
  amount: number
  currency?: string
  purpose?: string
}

export interface OfferingTotals {
  total_amount: number
  total_count: number
  currency: string
}

/**
 * Get all offerings for the current user's parish (admin view)
 */
export async function getOfferingsForParish(): Promise<OfferingWithUser[]> {
  const { data: offerings, error } = await supabase
    .from('offerings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch offerings: ${error.message}`)
  }

  // Fetch user profiles for each offering
  const userIds = [...new Set((offerings || []).map(o => o.user_id).filter(Boolean))]
  
  let userProfiles: Record<string, { id: string; full_name: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    
    if (profiles) {
      userProfiles = profiles.reduce((acc, profile) => {
        acc[profile.id] = { id: profile.id, full_name: profile.full_name }
        return acc
      }, {} as Record<string, { id: string; full_name: string }>)
    }
  }

  return (offerings || []).map((offering) => ({
    ...offering,
    user: offering.user_id ? (userProfiles[offering.user_id] || null) : null
  }))
}

/**
 * Get offerings for the current user
 */
export async function getUserOfferings(): Promise<Offering[]> {
  const { data, error } = await supabase
    .from('offerings')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user offerings: ${error.message}`)
  }

  return data || []
}

/**
 * Get offering totals for the current user's parish
 */
export async function getOfferingTotals(): Promise<OfferingTotals[]> {
  const { data, error } = await supabase
    .from('offerings')
    .select('amount, currency, status')
    .eq('status', 'completed')

  if (error) {
    throw new Error(`Failed to fetch offering totals: ${error.message}`)
  }

  // Group by currency and sum amounts
  const totals = new Map<string, { total_amount: number; total_count: number }>()
  
  for (const offering of data || []) {
    const currency = offering.currency || 'USD'
    const existing = totals.get(currency) || { total_amount: 0, total_count: 0 }
    totals.set(currency, {
      total_amount: existing.total_amount + Number(offering.amount),
      total_count: existing.total_count + 1
    })
  }

  return Array.from(totals.entries()).map(([currency, totals]) => ({
    currency,
    ...totals
  }))
}

/**
 * Create a pending offering record
 */
export async function createOffering(
  input: CreateOfferingInput,
  stripeCheckoutSessionId: string
): Promise<Offering> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get user's profile to get parish_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Profile not found')
  }

  const { data, error } = await supabase
    .from('offerings')
    .insert({
      parish_id: profile.parish_id,
      user_id: user.id,
      amount: input.amount,
      currency: input.currency || 'USD',
      purpose: input.purpose || null,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create offering: ${error.message}`)
  }

  return data
}

/**
 * Update offering status (typically called by webhook)
 */
export async function updateOfferingStatus(
  stripeCheckoutSessionId: string,
  status: 'completed' | 'failed',
  stripePaymentIntentId?: string
): Promise<void> {
  const { error } = await supabase
    .from('offerings')
    .update({
      status,
      stripe_payment_intent_id: stripePaymentIntentId || null
    })
    .eq('stripe_checkout_session_id', stripeCheckoutSessionId)

  if (error) {
    throw new Error(`Failed to update offering status: ${error.message}`)
  }
}

