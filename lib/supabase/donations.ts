import { supabase } from './client'

export type DonationPurpose = 'general' | 'mass_intention' | 'charity'
export type DonationStatus = 'pending' | 'completed' | 'failed'

export interface Donation {
  id: string
  parish_id: string
  user_id: string | null
  amount: number // in cents
  purpose: DonationPurpose | null
  status: DonationStatus
  created_at: string
}

export interface CreateDonationInput {
  amount: number // in cents
  purpose: DonationPurpose
}

export interface DonationSummary {
  purpose: DonationPurpose | null
  month: string // YYYY-MM format
  total_amount: number // in cents
  total_count: number
}

/**
 * Create a donation (parishioner)
 * For now, automatically sets status to 'completed' (mock payment)
 */
export async function createDonation(input: CreateDonationInput): Promise<Donation> {
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

  // Create donation with status 'completed' (mock payment success)
  const { data, error } = await supabase
    .from('donations')
    .insert({
      parish_id: profile.parish_id,
      user_id: user.id,
      amount: input.amount,
      purpose: input.purpose,
      status: 'completed' // Mock payment success
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create donation: ${error.message}`)
  }

  return data
}

/**
 * Get donations for the current user (parishioner)
 */
export async function getUserDonations(): Promise<Donation[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch donations: ${error.message}`)
  }

  return data || []
}

/**
 * Get donation summaries for admin (aggregate by purpose & month)
 * Returns totals grouped by purpose and month
 */
export async function getDonationSummaries(): Promise<DonationSummary[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('purpose, amount, created_at, status')
    .eq('status', 'completed') // Only count completed donations
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch donation summaries: ${error.message}`)
  }

  // Group by purpose and month
  const summaries = new Map<string, DonationSummary>()

  for (const donation of data || []) {
    const date = new Date(donation.created_at)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const key = `${donation.purpose || 'null'}-${month}`

    if (!summaries.has(key)) {
      summaries.set(key, {
        purpose: donation.purpose as DonationPurpose | null,
        month,
        total_amount: 0,
        total_count: 0
      })
    }

    const summary = summaries.get(key)!
    summary.total_amount += donation.amount
    summary.total_count += 1
  }

  return Array.from(summaries.values()).sort((a, b) => {
    // Sort by month descending, then by purpose
    if (a.month !== b.month) {
      return b.month.localeCompare(a.month)
    }
    return (a.purpose || '').localeCompare(b.purpose || '')
  })
}

/**
 * Get total donations for admin dashboard
 */
export async function getDonationTotals(): Promise<{
  total_amount: number // in cents
  total_count: number
  by_purpose: Record<DonationPurpose | 'null', { amount: number; count: number }>
}> {
  const { data, error } = await supabase
    .from('donations')
    .select('purpose, amount, status')
    .eq('status', 'completed')

  if (error) {
    throw new Error(`Failed to fetch donation totals: ${error.message}`)
  }

  let total_amount = 0
  let total_count = 0
  const by_purpose: Record<DonationPurpose | 'null', { amount: number; count: number }> = {
    general: { amount: 0, count: 0 },
    mass_intention: { amount: 0, count: 0 },
    charity: { amount: 0, count: 0 },
    null: { amount: 0, count: 0 }
  }

  for (const donation of data || []) {
    total_amount += donation.amount
    total_count += 1

    const purposeKey = (donation.purpose || 'null') as DonationPurpose | 'null'
    if (by_purpose[purposeKey]) {
      by_purpose[purposeKey].amount += donation.amount
      by_purpose[purposeKey].count += 1
    }
  }

  return {
    total_amount,
    total_count,
    by_purpose
  }
}


