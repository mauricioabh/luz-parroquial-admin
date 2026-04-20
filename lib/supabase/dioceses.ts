'use client'

import { supabase } from './client'

export interface Diocese {
  id: string
  name: string
  created_at: string
}

export interface Parish {
  id: string
  name: string
  diocese: string
  diocese_id: string | null
  city: string
  country: string
  is_active: boolean
  created_at: string
}

export interface DioceseUsageStats {
  total_parishes: number
  active_parishes: number
  total_profiles: number
  total_members: number
  total_intentions: number
  total_donations: number
  intentions_this_month: number
  sacrament_requests_total: number
  sacrament_requests_pending: number
  donations_total_amount: number
  donations_this_month: number
}

export interface DioceseReportData {
  diocese: Diocese
  parishes: Parish[]
  stats: DioceseUsageStats
  monthly_intentions: Array<{
    month: string
    count: number
  }>
  parish_details: Array<{
    id: string
    name: string
    city: string
    is_active: boolean
    intentions_count: number
    sacrament_requests_count: number
    donations_total: number
  }>
}

/**
 * Get the current user's diocese (for diocese admins)
 */
export async function getCurrentUserDiocese(): Promise<Diocese | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('diocese_id')
    .eq('id', user.id)
    .single()

  if (error || !profileData || !profileData.diocese_id) {
    return null
  }

  const { data: dioceseData, error: dioceseError } = await supabase
    .from('dioceses')
    .select('*')
    .eq('id', profileData.diocese_id)
    .single()

  if (dioceseError || !dioceseData) {
    return null
  }

  return dioceseData
}

/**
 * Get all parishes in a diocese
 */
export async function getParishesInDiocese(dioceseId: string): Promise<Parish[]> {
  const { data, error } = await supabase
    .from('parishes')
    .select('*')
    .eq('diocese_id', dioceseId)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch parishes: ${error.message}`)
  }

  return data || []
}

/**
 * Get usage statistics for a diocese (counts only)
 */
export async function getDioceseUsageStats(dioceseId: string): Promise<DioceseUsageStats> {
  // Get all parish IDs in the diocese
  const { data: parishes, error: parishesError } = await supabase
    .from('parishes')
    .select('id, is_active')
    .eq('diocese_id', dioceseId)

  if (parishesError) {
    throw new Error(`Failed to fetch parishes: ${parishesError.message}`)
  }

  const parishIds = (parishes || []).map(p => p.id)
  const activeParishes = (parishes || []).filter(p => p.is_active).length

  if (parishIds.length === 0) {
    return {
      total_parishes: 0,
      active_parishes: 0,
      total_profiles: 0,
      total_members: 0,
      total_intentions: 0,
      total_donations: 0,
      intentions_this_month: 0,
      sacrament_requests_total: 0,
      sacrament_requests_pending: 0,
      donations_total_amount: 0,
      donations_this_month: 0,
    }
  }

  // Get current month boundaries
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Get counts for each table
  const [
    profilesResult,
    membersResult,
    intentionsResult,
    donationsResult,
    intentionsThisMonthResult,
    sacramentRequestsResult,
    sacramentRequestsPendingResult,
    donationsAmountResult,
    donationsThisMonthResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds),
    supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds),
    supabase
      .from('intentions')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds),
    supabase
      .from('donations')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds),
    supabase
      .from('intentions')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds)
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString()),
    supabase
      .from('sacrament_requests')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds),
    supabase
      .from('sacrament_requests')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds)
      .eq('status', 'submitted'),
    supabase
      .from('donations')
      .select('amount')
      .in('parish_id', parishIds)
      .eq('status', 'completed'),
    supabase
      .from('donations')
      .select('amount')
      .in('parish_id', parishIds)
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString()),
  ])

  // Calculate total donation amount (amounts are in cents)
  const donationsTotalAmount = (donationsAmountResult.data || []).reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  )
  const donationsThisMonthAmount = (donationsThisMonthResult.data || []).reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  )

  return {
    total_parishes: parishes?.length || 0,
    active_parishes: activeParishes,
    total_profiles: profilesResult.count || 0,
    total_members: membersResult.count || 0,
    total_intentions: intentionsResult.count || 0,
    total_donations: donationsResult.count || 0,
    intentions_this_month: intentionsThisMonthResult.count || 0,
    sacrament_requests_total: sacramentRequestsResult.count || 0,
    sacrament_requests_pending: sacramentRequestsPendingResult.count || 0,
    donations_total_amount: donationsTotalAmount,
    donations_this_month: donationsThisMonthAmount,
  }
}

/**
 * Get detailed report data for diocese (for exports)
 */
export async function getDioceseReportData(dioceseId: string): Promise<DioceseReportData> {
  const diocese = await getCurrentUserDiocese()
  if (!diocese || diocese.id !== dioceseId) {
    throw new Error('Diocese not found or access denied')
  }

  const parishes = await getParishesInDiocese(dioceseId)
  const stats = await getDioceseUsageStats(dioceseId)

  const parishIds = parishes.map(p => p.id)

  // Get monthly intentions for last 12 months
  const monthlyIntentions: Array<{ month: string; count: number }> = []
  const now = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    const { count } = await supabase
      .from('intentions')
      .select('id', { count: 'exact', head: true })
      .in('parish_id', parishIds)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    monthlyIntentions.push({
      month: monthLabel,
      count: count || 0,
    })
  }

  // Get parish-level details
  const parishDetails = await Promise.all(
    parishes.map(async (parish) => {
      const [intentionsResult, sacramentRequestsResult, donationsResult] = await Promise.all([
        supabase
          .from('intentions')
          .select('id', { count: 'exact', head: true })
          .eq('parish_id', parish.id),
        supabase
          .from('sacrament_requests')
          .select('id', { count: 'exact', head: true })
          .eq('parish_id', parish.id),
        supabase
          .from('donations')
          .select('amount')
          .eq('parish_id', parish.id)
          .eq('status', 'completed'),
      ])

      const donationsTotal = (donationsResult.data || []).reduce(
        (sum, d) => sum + (d.amount || 0),
        0
      )

      return {
        id: parish.id,
        name: parish.name,
        city: parish.city,
        is_active: parish.is_active,
        intentions_count: intentionsResult.count || 0,
        sacrament_requests_count: sacramentRequestsResult.count || 0,
        donations_total: donationsTotal,
      }
    })
  )

  return {
    diocese,
    parishes,
    stats,
    monthly_intentions: monthlyIntentions,
    parish_details: parishDetails,
  }
}

