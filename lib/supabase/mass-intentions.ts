'use client'

import { supabase } from './client'

export type MassIntentionStatus = 
  | 'requested'      // Initial request (legacy)
  | 'scheduled'      // Scheduled (legacy)
  | 'fulfilled'      // Completed (legacy)
  | 'confirmed'       // Confirmed and ready for payment
  | 'waitlist'       // On waitlist, waiting for promotion
  | 'promoted'       // Promoted from waitlist to a Mass (not yet confirmed)
  | 'cancelled'      // Cancelled by user or admin
  | 'rejected'       // Rejected by admin

export type OfferingStatus = 'pending' | 'paid_cash' | 'paid_transfer' | 'paid_stripe' | 'waived'

export interface MassIntention {
  id: string
  parish_id: string
  user_id: string
  intention: string
  event_id: string | null // Optional reference to events table
  mass_date: string | null // ISO date string (legacy, required when event_id is NULL)
  mass_time: string | null // HH:MM format (legacy, required when event_id is NULL)
  status: MassIntentionStatus
  offering_amount: number | null // Amount in cents
  offering_status: OfferingStatus // Status of the offering/stipend
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MassIntentionWithUser extends MassIntention {
  user_name?: string | null
}

export interface CreateMassIntentionInput {
  intention: string
  event_id: string // Required: Event ID for the Mass
  offering_amount?: number | null // Amount in cents, optional
}

export interface UpdateMassIntentionStatusInput {
  status: MassIntentionStatus
  notes?: string | null
}

/**
 * Create a new mass intention using the RPC function
 * Only parishioners can create mass intentions
 * Requires event_id (capacity-based reservations)
 */
export async function createMassIntention(
  input: CreateMassIntentionInput
): Promise<string> {
  const { data, error } = await supabase.rpc('create_mass_intention', {
    p_intention: input.intention,
    p_event_id: input.event_id,
    p_offering_amount: input.offering_amount ?? null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to create mass intention')
  }

  return data
}

/**
 * Update mass intention status (admin only)
 * Validates status transitions and logs changes
 */
export async function updateMassIntentionStatus(
  intentionId: string,
  input: UpdateMassIntentionStatusInput
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_mass_intention_status', {
    p_intention_id: intentionId,
    p_new_status: input.status,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to update mass intention status')
  }

  return data === true
}

/**
 * Update mass intention offering status (admin only)
 * Used to mark offering as received or waived
 */
export async function updateMassIntentionOfferingStatus(
  intentionId: string,
  offeringStatus: OfferingStatus
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_mass_intention_offering_status', {
    p_intention_id: intentionId,
    p_new_status: offeringStatus,
  })

  if (error) {
    throw new Error(error.message || 'Failed to update offering status')
  }

  return data === true
}

/**
 * Get all mass intentions for the current user's parish (admin view)
 * Returns all intentions in the parish
 */
export async function getAllMassIntentionsForParish(): Promise<MassIntention[]> {
  const { data, error } = await supabase
    .from('mass_intentions')
    .select('*')
    .order('mass_date', { ascending: true })
    .order('mass_time', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch mass intentions')
  }

  return data || []
}

/**
 * Get mass intentions for the current user (parishioner view)
 * Returns only the user's own intentions
 */
export async function getMyMassIntentions(): Promise<MassIntention[]> {
  const { data, error } = await supabase
    .from('mass_intentions')
    .select('*')
    .order('mass_date', { ascending: true })
    .order('mass_time', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch mass intentions')
  }

  // RLS policies ensure only user's own intentions are returned
  return data || []
}

/**
 * Get mass intentions with user information (for admin view)
 * Includes user names for display
 */
export async function getMassIntentionsWithUsers(): Promise<MassIntentionWithUser[]> {
  const { data, error } = await supabase
    .from('mass_intentions')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .order('mass_date', { ascending: true })
    .order('mass_time', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch mass intentions')
  }

  return (data || []).map((intention: any) => ({
    id: intention.id,
    parish_id: intention.parish_id,
    user_id: intention.user_id,
    intention: intention.intention,
    event_id: intention.event_id,
    mass_date: intention.mass_date,
    mass_time: intention.mass_time,
    status: intention.status,
    offering_amount: intention.offering_amount,
    offering_status: intention.offering_status,
    notes: intention.notes,
    created_at: intention.created_at,
    updated_at: intention.updated_at,
    user_name: (intention.profiles as any)?.full_name || null,
  }))
}

/**
 * Get mass intentions filtered by date range and status
 */
export async function getMassIntentionsFiltered(
  filters: {
    startDate?: string
    endDate?: string
    status?: MassIntentionStatus
  }
): Promise<MassIntentionWithUser[]> {
  let query = supabase
    .from('mass_intentions')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)

  if (filters.startDate) {
    query = query.gte('mass_date', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('mass_date', filters.endDate)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
    .order('mass_date', { ascending: true })
    .order('mass_time', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch mass intentions')
  }

  return (data || []).map((intention: any) => ({
    id: intention.id,
    parish_id: intention.parish_id,
    user_id: intention.user_id,
    intention: intention.intention,
    event_id: intention.event_id,
    mass_date: intention.mass_date,
    mass_time: intention.mass_time,
    status: intention.status,
    offering_amount: intention.offering_amount,
    offering_status: intention.offering_status,
    notes: intention.notes,
    created_at: intention.created_at,
    updated_at: intention.updated_at,
    user_name: (intention.profiles as any)?.full_name || null,
  }))
}

/**
 * Get mass intentions for a specific event (by event_id)
 * Returns all intentions linked to the event with user information
 */
export async function getMassIntentionsByEventId(eventId: string): Promise<MassIntentionWithUser[]> {
  const { data, error } = await supabase
    .from('mass_intentions')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch mass intentions for event')
  }

  return (data || []).map((intention: any) => ({
    id: intention.id,
    parish_id: intention.parish_id,
    user_id: intention.user_id,
    intention: intention.intention,
    event_id: intention.event_id,
    mass_date: intention.mass_date,
    mass_time: intention.mass_time,
    status: intention.status,
    offering_amount: intention.offering_amount,
    offering_status: intention.offering_status,
    notes: intention.notes,
    created_at: intention.created_at,
    updated_at: intention.updated_at,
    user_name: (intention.profiles as any)?.full_name || null,
  }))
}

/**
 * Format offering amount for display (cents to dollars)
 */
export function formatOfferingAmount(cents: number | null): string {
  if (cents === null || cents === 0) {
    return 'No offering'
  }
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format offering status for display (Spanish)
 */
export function formatOfferingStatus(status: OfferingStatus): string {
  const statusMap: Record<OfferingStatus, string> = {
    pending: 'Pendiente',
    paid_cash: 'Pagado en efectivo',
    paid_transfer: 'Pagado por transferencia',
    paid_stripe: 'Pagado por Stripe',
    waived: 'Exento',
  }
  return statusMap[status]
}

/**
 * Get offering status badge variant for UI
 */
export function getOfferingStatusBadgeVariant(status: OfferingStatus): 'default' | 'info' | 'success' {
  switch (status) {
    case 'pending':
      return 'default'
    case 'paid_cash':
    case 'paid_transfer':
    case 'paid_stripe':
      return 'success'
    case 'waived':
      return 'info'
    default:
      return 'default'
  }
}

/**
 * Format date for display
 */
export function formatMassDate(dateString: string | null | undefined): string {
  if (!dateString) return '--'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format time for display
 */
export function formatMassTime(timeString: string | null | undefined): string {
  if (!timeString || typeof timeString !== 'string') return '--:--'
  const parts = timeString.split(':')
  if (parts.length < 2) return '--:--'
  const [hours, minutes] = parts
  const hour = parseInt(hours, 10)
  if (isNaN(hour)) return '--:--'
  const date = new Date()
  date.setHours(hour, parseInt(minutes || '0', 10), 0, 0)
  return date.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Get status badge variant for UI
 */
export function getStatusBadgeVariant(status: MassIntentionStatus): 'default' | 'info' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'requested':
      return 'default'
    case 'scheduled':
      return 'info'
    case 'fulfilled':
      return 'success'
    case 'confirmed':
      return 'success'
    case 'waitlist':
      return 'warning'
    case 'promoted':
      return 'info'
    case 'cancelled':
      return 'default'
    case 'rejected':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get status display name (pastoral language for parishioners)
 */
export function getStatusDisplayName(status: MassIntentionStatus): string {
  const names: Record<MassIntentionStatus, string> = {
    requested: 'Recibida',
    scheduled: 'Programada',
    fulfilled: 'Cumplida',
    confirmed: 'Confirmada',
    waitlist: 'En Espera',
    promoted: 'Promovida',
    cancelled: 'Cancelada',
    rejected: 'Rechazada'
  }
  return names[status]
}

/**
 * Get status message for parishioners (pastoral language)
 */
export function getStatusMessage(status: MassIntentionStatus): string {
  switch (status) {
    case 'requested':
      return 'Tu solicitud de intención de misa ha sido recibida. La oficina parroquial la revisará y confirmará la programación.'
    case 'scheduled':
      return 'Tu intención de misa ha sido programada. Será ofrecida en la misa especificada.'
    case 'fulfilled':
      return 'Tu intención de misa ha sido cumplida. Que Dios te bendiga a ti y a tus intenciones.'
    default:
      return ''
  }
}

/**
 * Mark all mass intentions for an event as fulfilled (admin only)
 * Updates all intentions linked to the event to status 'fulfilled'
 * @param eventId - The event ID
 * @param notes - Optional notes to add to all intentions
 * @returns Result object with success status and count of updated intentions
 */
export async function markMassIntentionsFulfilled(
  eventId: string,
  notes?: string | null
): Promise<{ success: boolean; event_id: string; event_title: string; intentions_updated: number }> {
  const { data, error } = await supabase.rpc('mark_mass_intentions_fulfilled', {
    p_event_id: eventId,
    p_notes: notes ?? null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to mark mass intentions as fulfilled')
  }

  return data
}

/**
 * Promote a mass intention from waitlist to a specific Mass event (admin only)
 * Only priests and secretaries can promote intentions
 * Validates that intention is in waitlist status and event has capacity
 * @param intentionId - The mass intention ID
 * @param eventId - The event ID to promote to
 * @param notes - Optional pastoral notes
 * @returns Result object with success status and event details
 */
export async function promoteMassIntention(
  intentionId: string,
  eventId: string,
  notes?: string | null
): Promise<{
  success: boolean
  intention_id: string
  event_id: string
  event_title: string
  event_date: string
  status: string
  available_slots_remaining: number
  message: string
}> {
  const { data, error } = await supabase.rpc('promote_mass_intention', {
    p_intention_id: intentionId,
    p_event_id: eventId,
    p_notes: notes ?? null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to promote mass intention')
  }

  return data
}

/**
 * Get all mass intentions with waitlist status (admin view)
 * Returns intentions that are waiting for promotion
 */
export async function getWaitlistMassIntentions(): Promise<MassIntentionWithUser[]> {
  const { data, error } = await supabase
    .from('mass_intentions')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .eq('status', 'waitlist')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch waitlist mass intentions')
  }

  return (data || []).map((intention: any) => ({
    id: intention.id,
    parish_id: intention.parish_id,
    user_id: intention.user_id,
    intention: intention.intention,
    event_id: intention.event_id,
    mass_date: intention.mass_date,
    mass_time: intention.mass_time,
    status: intention.status,
    offering_amount: intention.offering_amount,
    offering_status: intention.offering_status,
    notes: intention.notes,
    created_at: intention.created_at,
    updated_at: intention.updated_at,
    user_name: (intention.profiles as any)?.full_name || null,
  }))
}

/**
 * Get all mass intentions with promoted status (admin view)
 * Returns intentions that are pending confirmation
 */
export async function getPromotedMassIntentions(): Promise<MassIntentionWithUser[]> {
  const { data, error } = await supabase
    .from('mass_intentions')
    .select(`
      *,
      profiles:user_id (
        full_name
      ),
      events:event_id (
        title,
        starts_at
      )
    `)
    .eq('status', 'promoted')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch promoted mass intentions')
  }

  return (data || []).map((intention: any) => ({
    id: intention.id,
    parish_id: intention.parish_id,
    user_id: intention.user_id,
    intention: intention.intention,
    event_id: intention.event_id,
    mass_date: intention.mass_date,
    mass_time: intention.mass_time,
    status: intention.status,
    offering_amount: intention.offering_amount,
    offering_status: intention.offering_status,
    notes: intention.notes,
    created_at: intention.created_at,
    updated_at: intention.updated_at,
    user_name: (intention.profiles as any)?.full_name || null,
  }))
}

/**
 * Confirm a mass intention and record stipend information (admin only)
 * Only priests and secretaries can confirm intentions
 * @param intentionId - The mass intention ID
 * @param offeringAmount - Stipend amount in cents (optional)
 * @param offeringStatus - Payment method: pending, paid_cash, paid_transfer, waived
 * @param notes - Optional pastoral notes
 * @returns Result object with success status and intention details
 */
export async function confirmMassIntention(
  intentionId: string,
  offeringAmount: number | null,
  offeringStatus: OfferingStatus,
  notes?: string | null
): Promise<{
  success: boolean
  intention_id: string
  status: string
  offering_amount: number | null
  offering_status: string
  event_id: string | null
  event_title: string | null
  message: string
}> {
  const { data, error } = await supabase.rpc('confirm_mass_intention', {
    p_intention_id: intentionId,
    p_offering_amount: offeringAmount,
    p_offering_status: offeringStatus,
    p_notes: notes ?? null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to confirm mass intention')
  }

  return data
}

/**
 * Get Stripe payment information for a mass intention
 * Returns the stripe_payment record if it exists
 */
export async function getMassIntentionStripePayment(
  intentionId: string
): Promise<{
  id: string
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  amount: number
  status: string
} | null> {
  const { data, error } = await supabase
    .from('stripe_payments')
    .select('id, stripe_session_id, stripe_payment_intent_id, amount, status')
    .eq('mass_intention_id', intentionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(error.message || 'Failed to fetch Stripe payment')
  }

  return data
}

/**
 * Create a Stripe Checkout session for a mass intention payment
 * Calls the RPC function to validate and create payment record, then creates Stripe session
 * @param intentionId - The mass intention ID
 * @returns Checkout URL and session details
 */
export async function createMassIntentionCheckout(
  intentionId: string
): Promise<{
  checkout_url: string
  session_id: string
  payment_id: string
}> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/create-mass-intention-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      intention_id: intentionId,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout session')
  }

  return data
}

/**
 * Generate receipt path in storage
 * Format: {parish_id}/{year}/{month}/{receipt_id}.pdf
 */
function generateReceiptPath(parishId: string, intentionId: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${parishId}/${year}/${month}/${intentionId}.pdf`
}

/**
 * Check if a receipt exists for a mass intention
 * @param intentionId - The mass intention ID
 * @returns True if receipt exists, false otherwise
 */
export async function receiptExists(intentionId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return false
  }

  // Get user's parish_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return false
  }

  const receiptPath = generateReceiptPath(profile.parish_id, intentionId)
  const pathParts = receiptPath.split('/')
  const folderPath = pathParts.slice(0, -1).join('/')
  const fileName = pathParts[pathParts.length - 1]

  const { data: files } = await supabase.storage
    .from('receipts')
    .list(folderPath, {
      search: fileName
    })

  return files !== null && files.length > 0
}

/**
 * Get signed URL for downloading a receipt
 * @param intentionId - The mass intention ID
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL or null if receipt doesn't exist
 */
export async function getReceiptDownloadUrl(
  intentionId: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's parish_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Profile not found')
  }

  const receiptPath = generateReceiptPath(profile.parish_id, intentionId)

  const { data: signedUrlData, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(receiptPath, expiresIn)

  if (error) {
    if (error.message.includes('not found')) {
      return null // Receipt doesn't exist
    }
    throw new Error(error.message || 'Failed to generate download URL')
  }

  return signedUrlData.signedUrl
}

/**
 * Generate a receipt for a mass intention (admin only: priest/secretary)
 * @param intentionId - The mass intention ID
 * @returns Receipt path and signed URL
 */
export async function generateReceipt(intentionId: string): Promise<{
  receipt_path: string
  signed_url: string
  expires_in: number
  message: string
}> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`/api/mass-intention-receipt?intention_id=${intentionId}&action=generate`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate receipt')
  }

  return data
}

/**
 * Download a receipt for a mass intention
 * @param intentionId - The mass intention ID
 * @returns Blob URL for downloading the PDF
 */
export async function downloadReceipt(intentionId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`/api/mass-intention-receipt?intention_id=${intentionId}&action=download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to download receipt')
  }

  // Get PDF blob
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  
  // Trigger download
  const a = document.createElement('a')
  a.href = url
  a.download = `receipt-${intentionId}.pdf`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)

  return url
}

