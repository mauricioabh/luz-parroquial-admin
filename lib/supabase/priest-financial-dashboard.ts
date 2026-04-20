'use client'

import { supabase } from './client'

export interface PaymentRecord {
  id: string
  date: string // ISO date string
  amount: number // Amount in cents
  status: string
  source: 'Stripe' | 'Cash' | 'Manual'
  created_at: string
}

export interface DailySnapshot {
  totalToday: number // Amount in cents
  stripeTotal: number // Amount in cents (En línea)
  cashTransferTotal: number // Amount in cents (Efectivo / Transferencia)
  paymentCount: number
  lastPaymentTime: string | null // ISO timestamp
}

export interface DailyClosingRecord {
  id: string
  date: string // ISO date string (period_start for daily closings)
  total: number // Amount in cents (total_stripe + total_cash + total_manual)
  notes: string | null
  closed_at: string // ISO timestamp
}

export interface FinancialDashboardData {
  todayTotal: number // Amount in cents
  monthTotal: number // Amount in cents
  lastClosingAmount: number | null // Amount in cents
  recentPayments: PaymentRecord[]
  monthStatus: 'OPEN' | 'CLOSED'
  dailySnapshot: DailySnapshot
  dailyClosingsHistory: DailyClosingRecord[]
}

/**
 * Get total collected today (from offerings and stripe_payments)
 * Includes both offerings and mass intention payments
 */
export async function getTodayTotal(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const todayEndStr = todayEnd.toISOString()

  // Get offerings completed today
  const { data: offerings, error: offeringsError } = await supabase
    .from('offerings')
    .select('amount')
    .eq('status', 'completed')
    .gte('created_at', todayStart)
    .lte('created_at', todayEndStr)

  if (offeringsError) {
    throw new Error(`Failed to fetch today's offerings: ${offeringsError.message}`)
  }

  // Get stripe_payments succeeded today
  const { data: stripePayments, error: stripeError } = await supabase
    .from('stripe_payments')
    .select('amount')
    .eq('status', 'succeeded')
    .gte('created_at', todayStart)
    .lte('created_at', todayEndStr)

  if (stripeError) {
    throw new Error(`Failed to fetch today's stripe payments: ${stripeError.message}`)
  }

  // Get cash/manual payments from mass_intentions today
  // These are mass intentions with offering_status = 'paid_cash' or 'paid_transfer' created today
  const { data: massIntentions, error: massError } = await supabase
    .from('mass_intentions')
    .select('offering_amount, offering_status')
    .in('offering_status', ['paid_cash', 'paid_transfer'])
    .not('offering_amount', 'is', null)
    .gte('created_at', todayStart)
    .lte('created_at', todayEndStr)

  if (massError) {
    throw new Error(`Failed to fetch today's mass intention payments: ${massError.message}`)
  }

  // Sum all amounts (offerings are in numeric, stripe_payments and mass_intentions are in cents)
  const offeringsTotal = (offerings || []).reduce((sum, o) => sum + Number(o.amount || 0), 0) * 100 // Convert to cents
  const stripeTotal = (stripePayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
  const massTotal = (massIntentions || []).reduce((sum, m) => sum + (m.offering_amount || 0), 0)

  return offeringsTotal + stripeTotal + massTotal
}

/**
 * Get total collected this month (from offerings and stripe_payments)
 */
export async function getMonthTotal(): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartStr = monthStart.toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)
  const monthEndStr = monthEnd.toISOString()

  // Get offerings completed this month
  const { data: offerings, error: offeringsError } = await supabase
    .from('offerings')
    .select('amount')
    .eq('status', 'completed')
    .gte('created_at', monthStartStr)
    .lte('created_at', monthEndStr)

  if (offeringsError) {
    throw new Error(`Failed to fetch month's offerings: ${offeringsError.message}`)
  }

  // Get stripe_payments succeeded this month
  const { data: stripePayments, error: stripeError } = await supabase
    .from('stripe_payments')
    .select('amount')
    .eq('status', 'succeeded')
    .gte('created_at', monthStartStr)
    .lte('created_at', monthEndStr)

  if (stripeError) {
    throw new Error(`Failed to fetch month's stripe payments: ${stripeError.message}`)
  }

  // Get cash/manual payments from mass_intentions this month
  const { data: massIntentions, error: massError } = await supabase
    .from('mass_intentions')
    .select('offering_amount, offering_status')
    .in('offering_status', ['paid_cash', 'paid_transfer'])
    .not('offering_amount', 'is', null)
    .gte('created_at', monthStartStr)
    .lte('created_at', monthEndStr)

  if (massError) {
    throw new Error(`Failed to fetch month's mass intention payments: ${massError.message}`)
  }

  // Sum all amounts
  const offeringsTotal = (offerings || []).reduce((sum, o) => sum + Number(o.amount || 0), 0) * 100 // Convert to cents
  const stripeTotal = (stripePayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
  const massTotal = (massIntentions || []).reduce((sum, m) => sum + (m.offering_amount || 0), 0)

  return offeringsTotal + stripeTotal + massTotal
}

/**
 * Get the last financial closing amount
 */
export async function getLastClosingAmount(): Promise<number | null> {
  const { data, error } = await supabase
    .from('financial_closings')
    .select('total_stripe, total_cash, total_manual')
    .order('closed_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(`Failed to fetch last closing: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return (data.total_stripe || 0) + (data.total_cash || 0) + (data.total_manual || 0)
}

/**
 * Get last 10 payments (from offerings, stripe_payments, and mass_intentions)
 * Combines all payment sources into a unified list
 */
export async function getRecentPayments(limit: number = 10): Promise<PaymentRecord[]> {
  const payments: PaymentRecord[] = []

  // Get recent offerings
  const { data: offerings, error: offeringsError } = await supabase
    .from('offerings')
    .select('id, amount, status, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (offeringsError) {
    throw new Error(`Failed to fetch offerings: ${offeringsError.message}`)
  }

  // Add offerings to payments list
  if (offerings) {
    for (const offering of offerings) {
      payments.push({
        id: offering.id,
        date: offering.created_at,
        amount: Math.round(Number(offering.amount || 0) * 100), // Convert to cents
        status: offering.status,
        source: 'Stripe', // Offerings are Stripe-based
        created_at: offering.created_at,
      })
    }
  }

  // Get recent stripe_payments
  const { data: stripePayments, error: stripeError } = await supabase
    .from('stripe_payments')
    .select('id, amount, status, created_at')
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (stripeError) {
    throw new Error(`Failed to fetch stripe payments: ${stripeError.message}`)
  }

  // Add stripe_payments to payments list
  if (stripePayments) {
    for (const payment of stripePayments) {
      payments.push({
        id: payment.id,
        date: payment.created_at,
        amount: payment.amount || 0,
        status: payment.status,
        source: 'Stripe',
        created_at: payment.created_at,
      })
    }
  }

  // Get recent cash/manual payments from mass_intentions
  const { data: massIntentions, error: massError } = await supabase
    .from('mass_intentions')
    .select('id, offering_amount, offering_status, created_at')
    .in('offering_status', ['paid_cash', 'paid_transfer'])
    .not('offering_amount', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (massError) {
    throw new Error(`Failed to fetch mass intention payments: ${massError.message}`)
  }

  // Add mass_intentions payments to payments list
  if (massIntentions) {
    for (const intention of massIntentions) {
      payments.push({
        id: intention.id,
        date: intention.created_at,
        amount: intention.offering_amount || 0,
        status: intention.offering_status,
        source: intention.offering_status === 'paid_cash' ? 'Cash' : 'Manual',
        created_at: intention.created_at,
      })
    }
  }

  // Sort by date (most recent first) and limit
  payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return payments.slice(0, limit)
}

/**
 * Check if current month is closed (has a financial closing)
 */
export async function checkMonthStatus(): Promise<'OPEN' | 'CLOSED'> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { data, error } = await supabase
    .from('financial_closings')
    .select('id')
    .eq('period_start', monthStart.toISOString().split('T')[0])
    .eq('period_end', monthEnd.toISOString().split('T')[0])
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - month is open
      return 'OPEN'
    }
    throw new Error(`Failed to check month status: ${error.message}`)
  }

  return data ? 'CLOSED' : 'OPEN'
}

/**
 * Get daily financial snapshot (today's summary)
 * Returns breakdown by source, payment count, and last payment time
 */
export async function getDailySnapshot(): Promise<DailySnapshot> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const todayEndStr = todayEnd.toISOString()

  // Get offerings completed today (Stripe)
  const { data: offerings, error: offeringsError } = await supabase
    .from('offerings')
    .select('amount, created_at')
    .eq('status', 'completed')
    .gte('created_at', todayStart)
    .lte('created_at', todayEndStr)
    .order('created_at', { ascending: false })

  if (offeringsError) {
    throw new Error(`Failed to fetch today's offerings: ${offeringsError.message}`)
  }

  // Get stripe_payments succeeded today
  const { data: stripePayments, error: stripeError } = await supabase
    .from('stripe_payments')
    .select('amount, created_at')
    .eq('status', 'succeeded')
    .gte('created_at', todayStart)
    .lte('created_at', todayEndStr)
    .order('created_at', { ascending: false })

  if (stripeError) {
    throw new Error(`Failed to fetch today's stripe payments: ${stripeError.message}`)
  }

  // Get cash/manual payments from mass_intentions today
  const { data: massIntentions, error: massError } = await supabase
    .from('mass_intentions')
    .select('offering_amount, offering_status, created_at')
    .in('offering_status', ['paid_cash', 'paid_transfer'])
    .not('offering_amount', 'is', null)
    .gte('created_at', todayStart)
    .lte('created_at', todayEndStr)
    .order('created_at', { ascending: false })

  if (massError) {
    throw new Error(`Failed to fetch today's mass intention payments: ${massError.message}`)
  }

  // Calculate Stripe total (En línea)
  const offeringsTotal = (offerings || []).reduce((sum, o) => sum + Number(o.amount || 0), 0) * 100 // Convert to cents
  const stripePaymentsTotal = (stripePayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
  const stripeTotal = offeringsTotal + stripePaymentsTotal

  // Calculate cash/transfer total (Efectivo / Transferencia)
  const cashTransferTotal = (massIntentions || []).reduce((sum, m) => sum + (m.offering_amount || 0), 0)

  // Count payments
  const paymentCount = (offerings?.length || 0) + (stripePayments?.length || 0) + (massIntentions?.length || 0)

  // Find last payment time (most recent created_at from all sources)
  const allTimestamps: string[] = []
  if (offerings && offerings.length > 0) {
    allTimestamps.push(...offerings.map((o) => o.created_at))
  }
  if (stripePayments && stripePayments.length > 0) {
    allTimestamps.push(...stripePayments.map((p) => p.created_at))
  }
  if (massIntentions && massIntentions.length > 0) {
    allTimestamps.push(...massIntentions.map((m) => m.created_at))
  }

  const lastPaymentTime =
    allTimestamps.length > 0
      ? allTimestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null

  return {
    totalToday: stripeTotal + cashTransferTotal,
    stripeTotal,
    cashTransferTotal,
    paymentCount,
    lastPaymentTime,
  }
}

/**
 * Get daily closings history (last 30 records)
 * Returns daily closings ordered by date DESC
 */
export async function getDailyClosingsHistory(): Promise<DailyClosingRecord[]> {
  const { data, error } = await supabase
    .from('financial_closings')
    .select('id, period_start, total_stripe, total_cash, total_manual, notes, closed_at')
    .eq('closing_type', 'daily')
    .order('period_start', { ascending: false })
    .limit(30)

  if (error) {
    throw new Error(`Failed to fetch daily closings history: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((closing) => ({
    id: closing.id,
    date: closing.period_start,
    total: (closing.total_stripe || 0) + (closing.total_cash || 0) + (closing.total_manual || 0),
    notes: closing.notes,
    closed_at: closing.closed_at,
  }))
}

/**
 * Get all financial dashboard data
 */
export async function getFinancialDashboardData(): Promise<FinancialDashboardData> {
  const [todayTotal, monthTotal, lastClosingAmount, recentPayments, monthStatus, dailySnapshot, dailyClosingsHistory] =
    await Promise.all([
      getTodayTotal(),
      getMonthTotal(),
      getLastClosingAmount(),
      getRecentPayments(10),
      checkMonthStatus(),
      getDailySnapshot(),
      getDailyClosingsHistory(),
    ])

  return {
    todayTotal,
    monthTotal,
    lastClosingAmount,
    recentPayments,
    monthStatus,
    dailySnapshot,
    dailyClosingsHistory,
  }
}

/**
 * Format amount for display (cents to currency)
 */
export function formatAmount(cents: number | null): string {
  if (!cents || cents === 0) {
    return '$0.00'
  }
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format time for display (HH:MM)
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
