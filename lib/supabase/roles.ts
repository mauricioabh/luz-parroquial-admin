'use client'

import { supabase } from './client'

export interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type RoleName = 'priest' | 'secretary' | 'editor' | 'parishioner' | 'diocese_admin'

export const ADMIN_ROLES: RoleName[] = ['priest', 'secretary', 'editor']

// Cache for roles to avoid repeated queries
let rolesCache: Map<string, Role> | null = null

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get role by ID
 */
export async function getRoleById(roleId: string): Promise<Role | null> {
  // Check cache first
  if (rolesCache) {
    const cached = rolesCache.get(roleId)
    if (cached) return cached
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw error
  }

  return data
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: RoleName): Promise<Role | null> {
  // Check cache first
  if (rolesCache) {
    const cached = Array.from(rolesCache.values()).find(r => r.name === roleName)
    if (cached) return cached
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', roleName)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw error
  }

  return data
}

/**
 * Get role ID by name (helper function)
 */
export async function getRoleIdByName(roleName: RoleName): Promise<string | null> {
  const role = await getRoleByName(roleName)
  return role?.id || null
}

/**
 * Initialize roles cache (call this on app startup)
 */
export async function initializeRolesCache(): Promise<void> {
  const roles = await getAllRoles()
  rolesCache = new Map(roles.map(role => [role.id, role]))
}

/**
 * Clear roles cache (useful for testing or when roles are updated)
 */
export function clearRolesCache(): void {
  rolesCache = null
}

