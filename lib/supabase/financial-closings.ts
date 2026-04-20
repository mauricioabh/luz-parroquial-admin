'use client'

import { supabase } from './client'

export interface FinancialClosing {
  id: string
  parish_id: string
  period_start: string // ISO date string
  period_end: string // ISO date string
  total_stripe: number // Amount in cents
  total_cash: number // Amount in cents
  total_manual: number // Amount in cents
  closed_by: string
  closed_at: string
  notes: string | null
  created_at: string
  closing_type?: 'daily' | 'monthly' // Type of closing
}

export interface CloseFinancialPeriodResponse {
  success: boolean
  closing_id: string
  parish_id: string
  period_start: string
  period_end: string
  total_stripe: number
  total_cash: number
  total_manual: number
  total_all: number
  closed_by: string
  closed_at: string
}

export interface CreateDailyClosingResponse {
  success: boolean
  closing_id: string
  parish_id: string
  date: string // ISO date string
  total_stripe: number
  total_cash: number
  total_manual: number
  total_all: number
  closed_by: string
  closed_at: string
}

/**
 * Get all financial closings for the current parish
 * Admin only (priest/secretary) - RLS enforced
 */
export async function getFinancialClosings(): Promise<FinancialClosing[]> {
  const { data, error } = await supabase
    .from('financial_closings')
    .select('*')
    .order('closed_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch financial closings: ${error.message}`)
  }

  return data || []
}

/**
 * Close a financial period
 * Admin only (priest/secretary) - RLS enforced
 */
export async function closeFinancialPeriod(
  fromDate: string,
  toDate: string,
  notes?: string
): Promise<CloseFinancialPeriodResponse> {
  const { data, error } = await supabase.rpc('close_financial_period', {
    p_from_date: fromDate,
    p_to_date: toDate,
    p_notes: notes || null,
  })

  if (error) {
    throw new Error(`Failed to close financial period: ${error.message}`)
  }

  return data as CloseFinancialPeriodResponse
}

/**
 * Format amount for display (cents to dollars)
 */
export function formatAmount(cents: number | null): string {
  if (!cents || cents === 0) {
    return '$0.00'
  }
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format date range for display
 */
export function formatPeriod(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const end = new Date(periodEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${start} - ${end}`
}

/**
 * Create a daily closing for today
 * Priest-only - RLS enforced
 */
export async function createDailyClosing(
  notes?: string
): Promise<CreateDailyClosingResponse> {
  const { data, error } = await supabase.rpc('create_daily_closing', {
    p_notes: notes || null,
  })

  if (error) {
    throw new Error(`Failed to create daily closing: ${error.message}`)
  }

  return data as CreateDailyClosingResponse
}

/**
 * Check if today is already closed
 * Returns true if a daily closing exists for today
 */
export async function isTodayClosed(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_today_closed')

  if (error) {
    throw new Error(`Failed to check if today is closed: ${error.message}`)
  }

  return data === true
}
