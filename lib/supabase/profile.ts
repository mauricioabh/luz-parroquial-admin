'use client'

import { supabase } from './client'
import type { RoleName } from './roles'

export interface UserProfile {
  id: string
  role_id: string
  role_name: RoleName
  parish_id: string | null
  diocese_id: string | null
  full_name: string
}

export interface ProfileWithCreatedAt {
  id: string
  role_id: string
  role_name: RoleName
  parish_id: string
  full_name: string
  created_at: string
}

export interface ProfileWithEmail {
  id: string
  role_id: string
  role_name: RoleName
  parish_id: string
  full_name: string
  email: string | null
  created_at: string
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Fetch profile with role_id
  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('id, role_id, parish_id, diocese_id, full_name')
    .eq('id', user.id)
    .single()

  if (error) {
    // Check for RLS recursion error (profile doesn't exist)
    if (error.message?.includes('infinite recursion') || error.message?.includes('recursion')) {
      // Profile doesn't exist - return null instead of throwing
      return null
    }
    throw error
  }

  if (!profileData) {
    return null
  }

  // Fetch role name separately
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', profileData.role_id)
    .single()

  if (roleError || !roleData) {
    throw new Error('Role not found for profile')
  }

  return {
    id: profileData.id,
    role_id: profileData.role_id,
    role_name: roleData.name as RoleName,
    parish_id: profileData.parish_id,
    diocese_id: profileData.diocese_id || null,
    full_name: profileData.full_name
  }
}

export async function getParishMembers(parishId: string): Promise<UserProfile[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, role_id, parish_id, full_name')
    .eq('parish_id', parishId)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  if (!profiles || profiles.length === 0) {
    return []
  }

  // Fetch all role IDs
  const roleIds = [...new Set(profiles.map(p => p.role_id))]
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name')
    .in('id', roleIds)

  if (rolesError) {
    throw rolesError
  }

  // Create a map of role_id to role_name
  const roleMap = new Map((roles || []).map(r => [r.id, r.name as RoleName]))

  // Transform profiles with role names
  return profiles.map(profile => ({
    id: profile.id,
    role_id: profile.role_id,
    role_name: roleMap.get(profile.role_id) || 'parishioner' as RoleName,
    parish_id: profile.parish_id,
    full_name: profile.full_name
  }))
}

export async function getParishProfiles(parishId: string): Promise<ProfileWithCreatedAt[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, role_id, parish_id, full_name, created_at')
    .eq('parish_id', parishId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!profiles || profiles.length === 0) {
    return []
  }

  // Fetch all role IDs
  const roleIds = [...new Set(profiles.map(p => p.role_id))]
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name')
    .in('id', roleIds)

  if (rolesError) {
    throw rolesError
  }

  // Create a map of role_id to role_name
  const roleMap = new Map((roles || []).map(r => [r.id, r.name as RoleName]))

  // Transform profiles with role names
  return profiles.map(profile => ({
    id: profile.id,
    role_id: profile.role_id,
    role_name: roleMap.get(profile.role_id) || 'parishioner' as RoleName,
    parish_id: profile.parish_id,
    full_name: profile.full_name,
    created_at: profile.created_at
  }))
}

export async function getParishProfilesWithEmail(parishId: string): Promise<ProfileWithEmail[]> {
  const { data, error } = await supabase
    .rpc('get_parish_profiles_with_email', { p_parish_id: parishId })

  if (error) {
    // Check if function doesn't exist (common error codes)
    if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
      throw new Error('Database function not found. Please run the migration: supabase/migrations/20250101120021_update_helper_functions_for_roles.sql')
    }
    
    throw new Error(error.message || error.details || error.hint || 'Failed to load profiles')
  }

  if (!data) {
    return []
  }

  // The RPC function now returns role_id and role_name, so we can use it directly
  return data.map(profile => ({
    id: profile.id,
    role_id: profile.role_id,
    role_name: profile.role_name as RoleName,
    parish_id: profile.parish_id,
    full_name: profile.full_name,
    email: profile.email,
    created_at: profile.created_at
  }))
}

