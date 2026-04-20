'use client'

import { supabase } from './client'

export type AuditAction = 'invite_created' | 'invite_revoked' | 'invite_resend' | 'invite_accepted' | 'role_changed' | 'financial_monthly_closing_created' | 'financial_daily_closing_created' | 'financial_write_blocked_post_closing'
export type AuditTargetType = 'invitation' | 'user' | 'parish' | 'financial_closing' | 'financial_data'

export interface AuditLog {
  id: string
  actor_user_id: string
  actor_email?: string
  actor_name?: string
  action: AuditAction
  target_type: AuditTargetType
  target_id: string
  parish_id: string
  metadata: Record<string, any> | null
  created_at: string
}

export interface AuditLogWithActor extends AuditLog {
  actor_email: string
  actor_name: string
}

export interface AuditLogFilters {
  action?: AuditAction
  target_type?: AuditTargetType
  actor_user_id?: string
  start_date?: string
  end_date?: string
  parish_id?: string
}

/**
 * Fetch audit logs with optional filters
 * Uses RLS-protected SELECT (admin only)
 */
export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLogWithActor[]> {
  let query = supabase
    .from('audit_logs')
    .select('id, actor_user_id, action, target_type, target_id, parish_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(1000) // Reasonable limit

  // Apply filters
  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.target_type) {
    query = query.eq('target_type', filters.target_type)
  }

  if (filters?.actor_user_id) {
    query = query.eq('actor_user_id', filters.actor_user_id)
  }

  if (filters?.start_date) {
    query = query.gte('created_at', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('created_at', filters.end_date)
  }

  if (filters?.parish_id) {
    query = query.eq('parish_id', filters.parish_id)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Fetch all actor profiles
  const actorIds = [...new Set(data.map(log => log.actor_user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', actorIds)

  // Fetch emails from auth.users (we'll need to use RPC or handle separately)
  // For now, we'll get emails via a separate approach if needed
  // Note: We can't directly query auth.users from the client, so we'll use profiles only

  if (profilesError) {
    // If profiles query fails, continue without actor names
    console.warn('Failed to fetch actor profiles:', profilesError)
  }

  // Create a map of actor_id to profile
  const profileMap = new Map((profiles || []).map(p => [p.id, p]))

  // Transform the data with actor information
  return data.map((log) => {
    const profile = profileMap.get(log.actor_user_id)
    return {
      id: log.id,
      actor_user_id: log.actor_user_id,
      actor_email: 'N/A', // Can't access auth.users from client
      actor_name: profile?.full_name || 'Unknown',
      action: log.action as AuditAction,
      target_type: log.target_type as AuditTargetType,
      target_id: log.target_id,
      parish_id: log.parish_id,
      metadata: log.metadata,
      created_at: log.created_at,
    }
  })
}

/**
 * Get available audit actions for filtering
 */
export function getAuditActions(): AuditAction[] {
  return ['invite_created', 'invite_revoked', 'invite_resend', 'invite_accepted', 'role_changed', 'financial_monthly_closing_created', 'financial_daily_closing_created', 'financial_write_blocked_post_closing']
}

/**
 * Get available target types for filtering
 */
export function getAuditTargetTypes(): AuditTargetType[] {
  return ['invitation', 'user', 'parish', 'financial_closing', 'financial_data']
}

