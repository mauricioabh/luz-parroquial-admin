'use client'

import { supabase } from './client'

export type SacramentType = 'baptism' | 'first_communion' | 'confirmation' | 'marriage'
export type RequestStatus = 'submitted' | 'in_review' | 'approved' | 'rejected'

export interface SacramentRequest {
  id: string
  parish_id: string
  user_id: string
  sacrament_type: SacramentType
  applicant_name: string
  applicant_birthdate: string | null
  status: RequestStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SacramentRequestWithUser extends SacramentRequest {
  user_name?: string | null
}

export interface CreateSacramentRequestInput {
  sacrament_type: SacramentType
  applicant_name: string
  applicant_birthdate?: string | null
}

export interface UpdateSacramentRequestInput {
  status: RequestStatus
  notes?: string | null
}

/**
 * Create a new sacrament request
 * Only parishioners can create requests
 */
export async function createSacramentRequest(
  input: CreateSacramentRequestInput
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be authenticated to create a sacrament request')
  }

  // Get user's profile to get parish_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Failed to load your profile. Please try again.')
  }

  const { data, error } = await supabase
    .from('sacrament_requests')
    .insert({
      parish_id: profile.parish_id,
      user_id: user.id,
      sacrament_type: input.sacrament_type,
      applicant_name: input.applicant_name.trim(),
      applicant_birthdate: input.applicant_birthdate || null,
      status: 'submitted'
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create sacrament request')
  }

  return data.id
}

/**
 * Update sacrament request status and notes (admin only)
 */
export async function updateSacramentRequestStatus(
  requestId: string,
  input: UpdateSacramentRequestInput
): Promise<boolean> {
  const { error } = await supabase
    .from('sacrament_requests')
    .update({
      status: input.status,
      notes: input.notes || null
    })
    .eq('id', requestId)

  if (error) {
    throw new Error(error.message || 'Failed to update sacrament request')
  }

  return true
}

/**
 * Get all sacrament requests for the current user's parish (admin view)
 * Returns all requests in the parish with user information
 */
export async function getSacramentRequestsForParish(): Promise<SacramentRequestWithUser[]> {
  const { data, error } = await supabase
    .from('sacrament_requests')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch sacrament requests')
  }

  return (data || []).map((request: any) => ({
    id: request.id,
    parish_id: request.parish_id,
    user_id: request.user_id,
    sacrament_type: request.sacrament_type,
    applicant_name: request.applicant_name,
    applicant_birthdate: request.applicant_birthdate,
    status: request.status,
    notes: request.notes,
    created_at: request.created_at,
    updated_at: request.updated_at,
    user_name: (request.profiles as any)?.full_name || null,
  }))
}

/**
 * Get sacrament requests filtered by sacrament type and status (admin view)
 */
export async function getSacramentRequestsFiltered(
  filters: {
    sacrament_type?: SacramentType
    status?: RequestStatus
  }
): Promise<SacramentRequestWithUser[]> {
  let query = supabase
    .from('sacrament_requests')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)

  if (filters.sacrament_type) {
    query = query.eq('sacrament_type', filters.sacrament_type)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch sacrament requests')
  }

  return (data || []).map((request: any) => ({
    id: request.id,
    parish_id: request.parish_id,
    user_id: request.user_id,
    sacrament_type: request.sacrament_type,
    applicant_name: request.applicant_name,
    applicant_birthdate: request.applicant_birthdate,
    status: request.status,
    notes: request.notes,
    created_at: request.created_at,
    updated_at: request.updated_at,
    user_name: (request.profiles as any)?.full_name || null,
  }))
}

/**
 * Get sacrament requests for the current user (parishioner view)
 * Returns only the user's own requests
 */
export async function getMySacramentRequests(): Promise<SacramentRequest[]> {
  const { data, error } = await supabase
    .from('sacrament_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch sacrament requests')
  }

  // RLS policies ensure only user's own requests are returned
  return data || []
}

/**
 * Get sacrament display name (Spanish)
 */
export function getSacramentDisplayName(type: SacramentType): string {
  const names: Record<SacramentType, string> = {
    baptism: 'Bautismo',
    first_communion: 'Primera Comunión',
    confirmation: 'Confirmación',
    marriage: 'Matrimonio'
  }
  return names[type]
}

/**
 * Get status badge variant for UI
 */
export function getStatusBadgeVariant(status: RequestStatus): 'default' | 'success' | 'warning' | 'destructive' | 'info' {
  switch (status) {
    case 'submitted':
      return 'default'
    case 'in_review':
      return 'info'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get status display name (pastoral language for parishioners, Spanish)
 */
export function getStatusDisplayName(status: RequestStatus): string {
  const names: Record<RequestStatus, string> = {
    submitted: 'Recibido',
    in_review: 'En Revisión',
    approved: 'Programado',
    rejected: 'Requiere seguimiento'
  }
  return names[status]
}

/**
 * Get status message for parishioners (pastoral language)
 */
export function getStatusMessage(status: RequestStatus): string {
  switch (status) {
    case 'submitted':
      return 'Your request has been received. The parish office will review it and contact you with next steps.'
    case 'in_review':
      return 'Your request has been received and is being reviewed. The parish office will contact you soon.'
    case 'approved':
      return 'Your request has been scheduled. The parish office will contact you with details about preparation and timing.'
    case 'rejected':
      return 'The parish office needs to follow up with you. Please contact them to discuss your request further.'
    default:
      return ''
  }
}

