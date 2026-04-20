'use client'

import { supabase } from './client'

export type PrayerIntentionVisibility = 'private' | 'parish'

export interface PrayerIntention {
  id: string
  parish_id: string
  user_id: string | null
  title: string
  description: string
  visibility: PrayerIntentionVisibility
  is_anonymous: boolean
  created_at: string
}

export interface PrayerIntentionWithUser extends PrayerIntention {
  user_name?: string | null
}

export interface CreatePrayerIntentionInput {
  title: string
  description: string
  visibility: PrayerIntentionVisibility
  is_anonymous?: boolean
}

/**
 * Create a new prayer intention using the RPC function
 */
export async function createPrayerIntention(
  input: CreatePrayerIntentionInput
): Promise<string> {
  const { data, error } = await supabase.rpc('create_prayer_intention', {
    p_title: input.title,
    p_description: input.description,
    p_visibility: input.visibility,
    p_is_anonymous: input.is_anonymous ?? false,
  })

  if (error) {
    throw new Error(error.message || 'Failed to create prayer intention')
  }

  return data
}

/**
 * Delete a prayer intention (admin only)
 */
export async function deletePrayerIntention(intentionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_prayer_intention', {
    p_intention_id: intentionId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to delete prayer intention')
  }

  return data === true
}

/**
 * Get all prayer intentions for the current user's parish (admin view)
 * Returns all intentions including private ones
 */
export async function getAllPrayerIntentionsForParish(): Promise<PrayerIntention[]> {
  const { data, error } = await supabase
    .from('prayer_intentions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch prayer intentions')
  }

  return data || []
}

/**
 * Get prayer intentions visible to parishioners
 * Returns only parish-visible intentions and user's own private intentions
 * RLS policies handle the filtering automatically
 */
export async function getVisiblePrayerIntentions(): Promise<PrayerIntention[]> {
  const { data, error } = await supabase
    .from('prayer_intentions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch prayer intentions')
  }

  // RLS policies ensure only visible intentions are returned
  // This includes:
  // - All parish-visible intentions (visibility = 'parish')
  // - User's own private intentions (user_id = auth.uid())
  return data || []
}

/**
 * Get prayer intentions with user information (for admin view)
 * Only shows user name for non-anonymous intentions
 * Uses a join to fetch user names efficiently
 */
export async function getPrayerIntentionsWithUsers(): Promise<PrayerIntentionWithUser[]> {
  const { data, error } = await supabase
    .from('prayer_intentions')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch prayer intentions')
  }

  return (data || []).map((intention: any) => ({
    id: intention.id,
    parish_id: intention.parish_id,
    user_id: intention.user_id,
    title: intention.title,
    description: intention.description,
    visibility: intention.visibility,
    is_anonymous: intention.is_anonymous,
    created_at: intention.created_at,
    user_name: intention.is_anonymous || !intention.user_id 
      ? null 
      : (intention.profiles as any)?.full_name || null,
  }))
}

