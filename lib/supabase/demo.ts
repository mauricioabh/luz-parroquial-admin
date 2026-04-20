'use client'

import { supabase } from './client'

export interface DemoStatus {
  success: boolean
  parish_id?: string
  parish_name?: string
  is_demo?: boolean
  is_active?: boolean
  data_counts?: {
    members: number
    ministries: number
    events: number
    announcements: number
    posts: number
    mass_intentions: number
    prayer_intentions: number
    donations: number
  }
  error?: string
}

export interface SeedResult {
  success: boolean
  parish_id?: string
  parish_name?: string
  seeded?: {
    members: number
    ministries: number
    events: number
    announcements: number
    posts: number
    mass_intentions: number
    prayer_intentions: number
    donations: number
  }
  error?: string
}

export interface ResetResult {
  success: boolean
  parish_id?: string
  parish_name?: string
  message?: string
  seeded?: {
    members: number
    ministries: number
    events: number
    announcements: number
    posts: number
    mass_intentions: number
    prayer_intentions: number
    donations: number
  }
  error?: string
}

/**
 * Check if a parish is in demo mode
 */
export async function isParishInDemoMode(parishId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_demo_parish', {
    p_parish_id: parishId,
  })

  if (error) {
    console.error('Error checking demo mode:', error)
    return false
  }

  return data === true
}

/**
 * Get demo status and data counts for a parish
 */
export async function getParishDemoStatus(parishId: string): Promise<DemoStatus> {
  const { data, error } = await supabase.rpc('get_parish_demo_status', {
    p_parish_id: parishId,
  })

  if (error) {
    console.error('Error getting demo status:', error)
    return { success: false, error: error.message }
  }

  return data as DemoStatus
}

/**
 * Seed demo data for a parish (parish must already have is_demo = true)
 */
export async function seedDemoData(parishId: string): Promise<SeedResult> {
  const { data, error } = await supabase.rpc('seed_demo_data', {
    p_parish_id: parishId,
  })

  if (error) {
    console.error('Error seeding demo data:', error)
    return { success: false, error: error.message }
  }

  return data as SeedResult
}

/**
 * Reset demo data for a parish (deletes all data and re-seeds)
 */
export async function resetDemoData(parishId: string): Promise<ResetResult> {
  const { data, error } = await supabase.rpc('reset_demo_data', {
    p_parish_id: parishId,
  })

  if (error) {
    console.error('Error resetting demo data:', error)
    return { success: false, error: error.message }
  }

  return data as ResetResult
}

/**
 * Toggle demo mode for a parish (admin only)
 */
export async function toggleDemoMode(parishId: string, isDemoMode: boolean): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('parishes')
    .update({ is_demo: isDemoMode })
    .eq('id', parishId)

  if (error) {
    console.error('Error toggling demo mode:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Create a new demo parish with demo data
 */
export async function createDemoParish(
  name: string,
  diocese: string,
  city: string,
  country: string
): Promise<{ success: boolean; parish_id?: string; error?: string }> {
  // First create the parish with is_demo = true
  const { data: parish, error: createError } = await supabase
    .from('parishes')
    .insert({
      name,
      diocese,
      city,
      country,
      is_demo: true,
      is_active: true,
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating demo parish:', createError)
    return { success: false, error: createError.message }
  }

  // Seed demo data
  const seedResult = await seedDemoData(parish.id)

  if (!seedResult.success) {
    return { success: false, parish_id: parish.id, error: seedResult.error }
  }

  return { success: true, parish_id: parish.id }
}

