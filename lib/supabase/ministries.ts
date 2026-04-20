'use client'

import { supabase } from './client'

export interface Ministry {
  id: string
  parish_id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  member_count?: number
  is_member?: boolean
  user_role?: 'member' | 'leader' | null
  has_pending_request?: boolean
}

export interface MinistryWithMembers extends Ministry {
  members: MinistryMember[]
}

export interface MinistryMember {
  id: string
  ministry_id: string
  user_id: string
  role: 'member' | 'leader'
  joined_at: string
  profile?: {
    id: string
    full_name: string
    email?: string
  }
}

export interface MinistryInsert {
  parish_id: string
  name: string
  description?: string | null
  is_public?: boolean
}

export interface MinistryUpdate {
  name?: string
  description?: string | null
  is_public?: boolean
}

export interface MinistryJoinRequest {
  id: string
  parish_id: string
  ministry_id: string
  user_id: string
  status: 'submitted' | 'in_review' | 'approved' | 'rejected'
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  ministry?: {
    id: string
    name: string
  }
  profile?: {
    id: string
    full_name: string
    email?: string
  }
  reviewer?: {
    id: string
    full_name: string
  } | null
}

/**
 * Get all public ministries in a parish (for parishioners)
 */
export async function getPublicMinistries(parishId: string): Promise<Ministry[]> {
  const { data, error } = await supabase
    .from('ministries')
    .select('*')
    .eq('parish_id', parishId)
    .eq('is_public', true)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get member counts for all ministries
  const ministryIds = data.map((m) => m.id)
  const { data: memberCounts } = await supabase
    .from('ministry_members')
    .select('ministry_id')
    .in('ministry_id', ministryIds)

  // Count members per ministry
  const countMap = new Map<string, number>()
  if (memberCounts) {
    memberCounts.forEach((m: any) => {
      countMap.set(m.ministry_id, (countMap.get(m.ministry_id) || 0) + 1)
    })
  }

  // Check user membership
  const userId = (await supabase.auth.getUser()).data.user?.id
  let membershipMap = new Map<string, 'member' | 'leader'>()
  let pendingRequestsMap = new Map<string, boolean>()
  
  if (userId) {
    const { data: memberships } = await supabase
      .from('ministry_members')
      .select('ministry_id, role')
      .eq('user_id', userId)
      .in('ministry_id', ministryIds)

    if (memberships) {
      membershipMap = new Map(
        memberships.map((m: any) => [m.ministry_id, m.role])
      )
    }

    // Check for pending join requests
    const { data: pendingRequests } = await supabase
      .from('ministry_join_requests')
      .select('ministry_id')
      .eq('user_id', userId)
      .in('ministry_id', ministryIds)
      .in('status', ['submitted', 'in_review'])

    if (pendingRequests) {
      pendingRequestsMap = new Map(
        pendingRequests.map((r: any) => [r.ministry_id, true])
      )
    }
  }

  // Transform ministries with member counts, membership status, and pending requests
  return data.map((m: any) => ({
    ...m,
    member_count: countMap.get(m.id) || 0,
    is_member: membershipMap.has(m.id),
    user_role: membershipMap.get(m.id) || null,
    has_pending_request: pendingRequestsMap.has(m.id) || false,
  }))
}

/**
 * Get all ministries in a parish (admin view)
 */
export async function getParishMinistries(parishId: string): Promise<Ministry[]> {
  const { data, error } = await supabase
    .from('ministries')
    .select('*')
    .eq('parish_id', parishId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get member counts for all ministries
  const ministryIds = data.map((m) => m.id)
  const { data: memberCounts } = await supabase
    .from('ministry_members')
    .select('ministry_id')
    .in('ministry_id', ministryIds)

  // Count members per ministry
  const countMap = new Map<string, number>()
  if (memberCounts) {
    memberCounts.forEach((m: any) => {
      countMap.set(m.ministry_id, (countMap.get(m.ministry_id) || 0) + 1)
    })
  }

  // Transform to include member_count
  return data.map((m: any) => ({
    ...m,
    member_count: countMap.get(m.id) || 0,
  }))
}

/**
 * Get a single ministry by ID
 */
export async function getMinistry(id: string): Promise<Ministry | null> {
  const { data, error } = await supabase
    .from('ministries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Get ministry with members (admin/leader view)
 */
export async function getMinistryWithMembers(id: string): Promise<MinistryWithMembers | null> {
  const { data: ministry, error: ministryError } = await supabase
    .from('ministries')
    .select('*')
    .eq('id', id)
    .single()

  if (ministryError) {
    throw ministryError
  }

  if (!ministry) {
    return null
  }

  const { data: members, error: membersError } = await supabase
    .from('ministry_members')
    .select(`
      *,
      profiles:user_id(id, full_name)
    `)
    .eq('ministry_id', id)
    .order('role', { ascending: false }) // Leaders first
    .order('joined_at', { ascending: true })

  if (membersError) {
    throw membersError
  }

  // Transform members data
  const transformedMembers: MinistryMember[] = (members || []).map((m: any) => ({
    id: m.id,
    ministry_id: m.ministry_id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: m.profiles ? {
      id: m.profiles.id,
      full_name: m.profiles.full_name,
    } : undefined,
  }))

  return {
    ...ministry,
    member_count: transformedMembers.length,
    members: transformedMembers,
  }
}

/**
 * Transform join request data with relationships
 */
function transformJoinRequest(r: any): MinistryJoinRequest {
  return {
    ...r,
    profile: r.profiles ? {
      id: r.profiles.id,
      full_name: r.profiles.full_name,
    } : undefined,
    reviewer: null, // Will be populated separately if needed
    ministry: r.ministries ? {
      id: r.ministries.id,
      name: r.ministries.name,
    } : undefined,
  }
}

/**
 * Fetch reviewer profile for join requests
 */
async function enrichJoinRequestsWithReviewers(requests: MinistryJoinRequest[]): Promise<MinistryJoinRequest[]> {
  const reviewerIds = [...new Set(requests.filter(r => r.reviewed_by).map(r => r.reviewed_by!))]
  
  if (reviewerIds.length === 0) {
    return requests
  }

  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', reviewerIds)

  const reviewerMap = new Map((reviewers || []).map(r => [r.id, r]))

  return requests.map(r => ({
    ...r,
    reviewer: r.reviewed_by && reviewerMap.has(r.reviewed_by) ? {
      id: reviewerMap.get(r.reviewed_by)!.id,
      full_name: reviewerMap.get(r.reviewed_by)!.full_name,
    } : null,
  }))
}

/**
 * Create a new ministry
 */
export async function createMinistry(ministry: MinistryInsert): Promise<Ministry> {
  const { data, error } = await supabase
    .from('ministries')
    .insert(ministry)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update a ministry
 */
export async function updateMinistry(id: string, updates: MinistryUpdate): Promise<Ministry> {
  const { data, error } = await supabase
    .from('ministries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Delete a ministry
 */
export async function deleteMinistry(id: string): Promise<void> {
  const { error } = await supabase
    .from('ministries')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

/**
 * Request to join a ministry (creates a join request)
 */
export async function requestToJoinMinistry(ministryId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be authenticated to request to join a ministry')
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

  // Get ministry to verify it belongs to the same parish
  const { data: ministry, error: ministryError } = await supabase
    .from('ministries')
    .select('id, parish_id')
    .eq('id', ministryId)
    .single()

  if (ministryError || !ministry) {
    throw new Error('Ministry not found')
  }

  if (ministry.parish_id !== profile.parish_id) {
    throw new Error('Cannot request to join ministry from different parish')
  }

  // Create join request
  const { data, error } = await supabase
    .from('ministry_join_requests')
    .insert({
      parish_id: profile.parish_id,
      ministry_id: ministryId,
      user_id: user.id,
      status: 'submitted'
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create join request')
  }

  return data.id
}

/**
 * Join a ministry (RPC) - Legacy function, kept for backward compatibility
 * Note: This still works but should be replaced with requestToJoinMinistry for parishioners
 */
export async function joinMinistry(ministryId: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_ministry', {
    p_ministry_id: ministryId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to join ministry')
  }

  return data
}

/**
 * Leave a ministry (RPC)
 */
export async function leaveMinistry(ministryId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('leave_ministry', {
    p_ministry_id: ministryId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to leave ministry')
  }

  return data
}

/**
 * Assign a ministry leader (RPC)
 */
export async function assignMinistryLeader(
  ministryId: string,
  userId: string,
  isLeader: boolean
): Promise<boolean> {
  const { data, error } = await supabase.rpc('assign_ministry_leader', {
    p_ministry_id: ministryId,
    p_user_id: userId,
    p_is_leader: isLeader,
  })

  if (error) {
    throw new Error(error.message || 'Failed to assign ministry leader')
  }

  return data
}

/**
 * Remove a member from a ministry (admin only)
 */
export async function removeMinistryMember(
  ministryId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('ministry_members')
    .delete()
    .eq('ministry_id', ministryId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

/**
 * Get join requests for a ministry (admin only)
 */
export async function getMinistryJoinRequests(
  ministryId: string,
  status?: 'submitted' | 'in_review' | 'approved' | 'rejected'
): Promise<MinistryJoinRequest[]> {
  let query = supabase
    .from('ministry_join_requests')
    .select(`
      *,
      ministries:ministry_id(id, name),
      profiles:user_id(id, full_name)
    `)
    .eq('ministry_id', ministryId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const transformed = (data || []).map(transformJoinRequest)
  return enrichJoinRequestsWithReviewers(transformed)
}

/**
 * Get all join requests for a parish (admin only)
 */
export async function getParishJoinRequests(
  parishId: string,
  status?: 'submitted' | 'in_review' | 'approved' | 'rejected'
): Promise<MinistryJoinRequest[]> {
  let query = supabase
    .from('ministry_join_requests')
    .select(`
      *,
      ministries:ministry_id(id, name),
      profiles:user_id(id, full_name)
    `)
    .eq('parish_id', parishId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const transformed = (data || []).map(transformJoinRequest)
  return enrichJoinRequestsWithReviewers(transformed)
}

/**
 * Get user's own join requests
 */
export async function getUserJoinRequests(
  status?: 'submitted' | 'in_review' | 'approved' | 'rejected'
): Promise<MinistryJoinRequest[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be authenticated to view join requests')
  }

  let query = supabase
    .from('ministry_join_requests')
    .select(`
      *,
      ministries:ministry_id(id, name),
      profiles:user_id(id, full_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const transformed = (data || []).map(transformJoinRequest)
  return enrichJoinRequestsWithReviewers(transformed)
}

/**
 * Approve a ministry join request (admin only, RPC)
 */
export async function approveMinistryJoinRequest(requestId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('approve_ministry_join_request', {
    p_request_id: requestId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to approve join request')
  }

  return data
}

/**
 * Reject a ministry join request (admin only, RPC)
 */
export async function rejectMinistryJoinRequest(
  requestId: string,
  notes?: string | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc('reject_ministry_join_request', {
    p_request_id: requestId,
    p_notes: notes || null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to reject join request')
  }

  return data
}

