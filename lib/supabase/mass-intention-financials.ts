'use client'

import { supabase } from './client'

export interface MassIntentionFinancial {
  mass_intention_id: string
  parish_id: string
  event_id: string | null
  mass_date: string | null // ISO date string
  offering_amount: number | null // Amount in cents
  offering_status: string
  payment_method: 'stripe' | 'cash' | 'manual' | null
  created_at: string
}

export interface MassIntentionFinancialReportSummary {
  total_collected: number // Amount in cents
  total_pending: number // Amount in cents
  total_refunded: number // Amount in cents (not implemented yet)
  count_paid: number
  count_pending: number
}

export interface MassIntentionFinancialFilters {
  fromDate?: string // ISO date string
  toDate?: string // ISO date string
  offeringStatus?: string
}

/**
 * Get financial report summary for mass intentions
 * Admin only (priest/secretary) - RLS enforced
 */
export async function getMassIntentionFinancialReport(
  fromDate: string,
  toDate: string
): Promise<MassIntentionFinancialReportSummary> {
  const { data, error } = await supabase.rpc('get_mass_intention_financial_report', {
    p_from_date: fromDate,
    p_to_date: toDate,
  })

  if (error) {
    throw new Error(`Failed to fetch financial report: ${error.message}`)
  }

  return data as MassIntentionFinancialReportSummary
}

/**
 * Get financial data from the view
 * Admin only (priest/secretary) - RLS enforced
 */
export async function getMassIntentionFinancials(
  filters?: MassIntentionFinancialFilters
): Promise<MassIntentionFinancial[]> {
  let query = supabase
    .from('mass_intention_financials')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply date filters
  if (filters?.fromDate) {
    query = query.gte('mass_date', filters.fromDate)
  }

  if (filters?.toDate) {
    query = query.lte('mass_date', filters.toDate)
  }

  // Apply offering_status filter
  if (filters?.offeringStatus) {
    query = query.eq('offering_status', filters.offeringStatus)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch financial data: ${error.message}`)
  }

  return data || []
}

/**
 * Format offering amount for display (cents to dollars)
 */
export function formatOfferingAmount(cents: number | null): string {
  if (!cents || cents === 0) {
    return '$0.00'
  }
  return `$${(cents / 100).toFixed(2)}`
}
