'use client'

import { supabase } from './client'

export interface MassIntentionsReportRow {
  parish_id: string
  event_id: string
  event_date: string // ISO date string
  mass_title: string
  total_intentions: number
  fulfilled_intentions: number
  pending_intentions: number
  total_offering_amount: number // Amount in cents
}

export interface MassIntentionsReportFilters {
  startDate?: string // ISO date string
  endDate?: string // ISO date string
  status?: 'fulfilled' | 'pending' // Filter by status
}

export interface MassIntentionsReportSummary {
  total_masses: number
  total_intentions: number
  fulfilled_intentions: number
  pending_intentions: number
  total_offering_amount: number // Amount in cents
}

/**
 * Get mass intentions report data from the VIEW
 * Admin only (priest/secretary) - RLS enforced
 */
export async function getMassIntentionsReport(
  filters?: MassIntentionsReportFilters
): Promise<MassIntentionsReportRow[]> {
  let query = supabase
    .from('mass_intentions_report')
    .select('*')
    .order('event_date', { ascending: false })

  // Apply date filters
  if (filters?.startDate) {
    query = query.gte('event_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('event_date', filters.endDate)
  }

  // Apply status filter
  if (filters?.status === 'fulfilled') {
    query = query.gt('fulfilled_intentions', 0)
  } else if (filters?.status === 'pending') {
    query = query.gt('pending_intentions', 0)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch mass intentions report: ${error.message}`)
  }

  return data || []
}

/**
 * Calculate summary statistics from report data
 */
export function calculateReportSummary(
  reportData: MassIntentionsReportRow[]
): MassIntentionsReportSummary {
  return reportData.reduce(
    (summary, row) => ({
      total_masses: summary.total_masses + 1,
      total_intentions: summary.total_intentions + row.total_intentions,
      fulfilled_intentions: summary.fulfilled_intentions + row.fulfilled_intentions,
      pending_intentions: summary.pending_intentions + row.pending_intentions,
      total_offering_amount: summary.total_offering_amount + row.total_offering_amount,
    }),
    {
      total_masses: 0,
      total_intentions: 0,
      fulfilled_intentions: 0,
      pending_intentions: 0,
      total_offering_amount: 0,
    }
  )
}

/**
 * Format offering amount for display (cents to dollars)
 */
export function formatOfferingAmount(cents: number): string {
  if (cents === 0) {
    return '$0.00'
  }
  return `$${(cents / 100).toFixed(2)}`
}
