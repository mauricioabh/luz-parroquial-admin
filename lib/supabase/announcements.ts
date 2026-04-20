'use client'

import { supabase } from './client'

export interface Announcement {
  id: string
  parish_id: string
  title: string
  body: string
  audience: 'all' | 'volunteers' | 'youth' | 'parents'
  publish_at: string
  expires_at: string | null
  is_published: boolean
  created_by: string
  created_at: string
}

export interface AnnouncementInsert {
  parish_id: string
  title: string
  body: string
  audience: 'all' | 'volunteers' | 'youth' | 'parents'
  publish_at: string
  expires_at?: string | null
  is_published?: boolean
}

export interface AnnouncementUpdate {
  title?: string
  body?: string
  audience?: 'all' | 'volunteers' | 'youth' | 'parents'
  publish_at?: string
  expires_at?: string | null
  is_published?: boolean
}

// Get all announcements for a parish (admin view - includes drafts and scheduled)
export async function getParishAnnouncements(parishId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('parish_id', parishId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

// Get published announcements for a parish (parishioner view)
// Only shows announcements where publish_at <= now() and (expires_at is null or expires_at > now())
export async function getPublishedAnnouncements(parishId: string): Promise<Announcement[]> {
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('parish_id', parishId)
    .eq('is_published', true)
    .lte('publish_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('publish_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

// Get a single announcement by ID
export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Create a new announcement using RPC
export async function createAnnouncement(announcement: AnnouncementInsert): Promise<Announcement> {
  const { data, error } = await supabase.rpc('schedule_announcement', {
    p_parish_id: announcement.parish_id,
    p_title: announcement.title,
    p_body: announcement.body,
    p_audience: announcement.audience,
    p_publish_at: announcement.publish_at,
    p_expires_at: announcement.expires_at ?? null,
    p_is_published: announcement.is_published ?? false,
    p_announcement_id: null
  })

  if (error) {
    throw error
  }

  // Fetch the created announcement
  const createdAnnouncement = await getAnnouncement(data)
  if (!createdAnnouncement) {
    throw new Error('Failed to fetch created announcement')
  }

  return createdAnnouncement
}

// Update an announcement using RPC
export async function updateAnnouncement(
  id: string, 
  announcement: AnnouncementUpdate,
  parishId: string
): Promise<Announcement> {
  // First get the current announcement to preserve fields not being updated
  const current = await getAnnouncement(id)
  if (!current) {
    throw new Error('Announcement not found')
  }

  const { data, error } = await supabase.rpc('schedule_announcement', {
    p_parish_id: parishId,
    p_title: announcement.title ?? current.title,
    p_body: announcement.body ?? current.body,
    p_audience: announcement.audience ?? current.audience,
    p_publish_at: announcement.publish_at ?? current.publish_at,
    p_expires_at: announcement.expires_at !== undefined ? announcement.expires_at : current.expires_at,
    p_is_published: announcement.is_published !== undefined ? announcement.is_published : current.is_published,
    p_announcement_id: id
  })

  if (error) {
    throw error
  }

  // Fetch the updated announcement
  const updatedAnnouncement = await getAnnouncement(data)
  if (!updatedAnnouncement) {
    throw new Error('Failed to fetch updated announcement')
  }

  return updatedAnnouncement
}

// Publish/unpublish an announcement using RPC
export async function publishAnnouncement(id: string, isPublished: boolean): Promise<Announcement> {
  const { data, error } = await supabase.rpc('publish_announcement', {
    p_announcement_id: id,
    p_is_published: isPublished
  })

  if (error) {
    throw error
  }

  // Fetch the updated announcement
  const updatedAnnouncement = await getAnnouncement(data)
  if (!updatedAnnouncement) {
    throw new Error('Failed to fetch updated announcement')
  }

  return updatedAnnouncement
}

// Expire an announcement using RPC
export async function expireAnnouncement(id: string): Promise<Announcement> {
  const { data, error } = await supabase.rpc('expire_announcement', {
    p_announcement_id: id
  })

  if (error) {
    throw error
  }

  // Fetch the updated announcement
  const updatedAnnouncement = await getAnnouncement(data)
  if (!updatedAnnouncement) {
    throw new Error('Failed to fetch updated announcement')
  }

  return updatedAnnouncement
}

// Delete an announcement
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

// Helper function to get audience badge variant
export function getAudienceBadgeVariant(audience: string): 'default' | 'success' | 'warning' | 'info' {
  switch (audience) {
    case 'all':
      return 'default'
    case 'volunteers':
      return 'success'
    case 'youth':
      return 'warning'
    case 'parents':
      return 'info'
    default:
      return 'default'
  }
}

// Helper function to format audience label
export function formatAudience(audience: string): string {
  switch (audience) {
    case 'all':
      return 'Everyone'
    case 'volunteers':
      return 'Volunteers'
    case 'youth':
      return 'Youth'
    case 'parents':
      return 'Parents'
    default:
      return audience
  }
}

