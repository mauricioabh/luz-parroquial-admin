'use client'

import { supabase } from './client'
import type { Role } from './roles'

export interface RoleChange {
  id: string
  user_id: string
  user_full_name: string
  old_role_id: string
  old_role_name: string
  new_role_id: string
  new_role_name: string
  changed_by: string
  changed_by_full_name: string
  parish_id: string
  changed_at: string
  reverted_at: string | null
  can_revert: boolean
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string,
  roleId: string,
  accessToken: string
): Promise<{ success: boolean; old_role_name?: string; new_role_name?: string; message?: string; error?: string }> {
  const response = await fetch('/api/update-user-role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      user_id: userId,
      role_id: roleId
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update user role')
  }

  return data
}

/**
 * Revert a user's role change
 */
export async function revertUserRole(
  roleHistoryId: string,
  accessToken: string
): Promise<{ success: boolean; reverted_to_role_id?: string; reverted_from_role_id?: string; error?: string }> {
  const response = await fetch('/api/revert-user-role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      role_history_id: roleHistoryId
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to revert user role')
  }

  return data
}

/**
 * Get recent role changes for a user (or all users in parish)
 */
export async function getRecentRoleChanges(
  userId?: string | null,
  limit: number = 10
): Promise<RoleChange[]> {
  const { data, error } = await supabase.rpc('get_recent_role_changes', {
    p_user_id: userId || null,
    p_limit: limit
  })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get role descriptions for display
 */
export function getRoleDescription(roleName: string): string {
  const descriptions: Record<string, string> = {
    priest: 'Parish priest with full administrative access. Can manage all aspects of the parish including users, content, and settings.',
    secretary: 'Parish secretary with administrative access. Can manage users, content, and most parish settings.',
    editor: 'Content editor with limited administrative access. Can create and edit content, announcements, and events.',
    parishioner: 'Regular parish member with basic access. Can view content and submit requests for sacraments and ministries.'
  }
  return descriptions[roleName] || 'Unknown role'
}

