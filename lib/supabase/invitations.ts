'use client'

import { supabase } from './client'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

export interface Invitation {
  id: string
  email: string
  status: InvitationStatus
  role_id: string
  role_name?: string
  expires_at: string | null
  created_at: string
  invited_by: string
  parish_id: string
  revoked_at?: string | null
}

export interface InvitationWithRole extends Invitation {
  role_name: string
}

/**
 * Fetch all invitations for the current user's parish (admin only)
 * Uses RLS-protected SELECT
 */
export async function fetchInvitations(): Promise<InvitationWithRole[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, status, role_id, expires_at, created_at, invited_by, parish_id, revoked_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch invitations: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Fetch all role IDs
  const roleIds = [...new Set(data.map(inv => inv.role_id))]
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name')
    .in('id', roleIds)

  if (rolesError) {
    throw new Error(`Failed to fetch roles: ${rolesError.message}`)
  }

  // Create a map of role_id to role_name
  const roleMap = new Map((roles || []).map(r => [r.id, r.name]))

  // Transform invitations with role names
  return data.map(invitation => ({
    id: invitation.id,
    email: invitation.email,
    status: invitation.status as InvitationStatus,
    role_id: invitation.role_id,
    role_name: roleMap.get(invitation.role_id) || 'Unknown',
    expires_at: invitation.expires_at,
    created_at: invitation.created_at,
    invited_by: invitation.invited_by,
    parish_id: invitation.parish_id,
    revoked_at: invitation.revoked_at || null,
  }))
}

/**
 * Resend an invitation via RPC
 * Only works for pending invitations
 */
export async function resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string; data?: any }> {
  const { data, error } = await supabase.rpc('resend_invitation', {
    invitation_id: invitationId
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  if (!data || !data.success) {
    return {
      success: false,
      error: data?.error || 'Failed to resend invitation'
    }
  }

  return {
    success: true,
    data
  }
}

/**
 * Revoke an invitation via RPC
 * Only works for pending invitations
 */
export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('revoke_invitation', {
    invitation_id: invitationId
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  if (!data || !data.success) {
    return {
      success: false,
      error: data?.error || 'Failed to revoke invitation'
    }
  }

  return {
    success: true
  }
}

/**
 * Accept an invitation via RPC
 * Requires authentication and email match
 */
export async function acceptInvitation(invitationId: string): Promise<{ success: boolean; error?: string; data?: any }> {
  const { data, error } = await supabase.rpc('accept_invitation', {
    invite_id: invitationId
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  if (!data || !data.success) {
    return {
      success: false,
      error: data?.error || 'Failed to accept invitation'
    }
  }

  return {
    success: true,
    data
  }
}

/**
 * Get invitation by ID (for acceptance flow)
 * Uses RLS - users can only see invitations for their email
 */
export async function getInvitationById(invitationId: string): Promise<InvitationWithRole | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, status, role_id, expires_at, created_at, invited_by, parish_id, revoked_at')
    .eq('id', invitationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch invitation: ${error.message}`)
  }

  if (!data) {
    return null
  }

  // Fetch role name
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', data.role_id)
    .single()

  if (roleError || !roleData) {
    // Role not found, but invitation exists - use 'Unknown'
    return {
      id: data.id,
      email: data.email,
      status: data.status as InvitationStatus,
      role_id: data.role_id,
      role_name: 'Unknown',
      expires_at: data.expires_at,
      created_at: data.created_at,
      invited_by: data.invited_by,
      parish_id: data.parish_id,
      revoked_at: data.revoked_at || null,
    }
  }

  return {
    id: data.id,
    email: data.email,
    status: data.status as InvitationStatus,
    role_id: data.role_id,
    role_name: roleData.name,
    expires_at: data.expires_at,
    created_at: data.created_at,
    invited_by: data.invited_by,
    parish_id: data.parish_id,
    revoked_at: data.revoked_at || null,
  }
}

