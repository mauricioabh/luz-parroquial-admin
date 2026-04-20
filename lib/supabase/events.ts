'use client'

import { supabase } from './client'

export interface Event {
  id: string
  parish_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  is_public: boolean
  created_by: string
  created_at: string
}

export interface EventInsert {
  parish_id: string
  title: string
  description?: string | null
  starts_at: string
  ends_at?: string | null
  location?: string | null
  is_public?: boolean
  max_intentions?: number // Maximum number of Mass intentions allowed (default 10)
}

export interface EventUpdate {
  title?: string
  description?: string | null
  starts_at?: string
  ends_at?: string | null
  location?: string | null
  is_public?: boolean
  max_intentions?: number // Maximum number of Mass intentions allowed
}

// Get all events for a parish (admin view - includes private events)
export async function getParishEvents(parishId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('parish_id', parishId)
    .order('starts_at', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

// Get upcoming public events for a parish (parishioner view)
export async function getUpcomingPublicEvents(parishId: string, limit?: number): Promise<Event[]> {
  const now = new Date().toISOString()
  
  let query = supabase
    .from('events')
    .select('*')
    .eq('parish_id', parishId)
    .eq('is_public', true)
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

// Get events for a specific date range
export async function getEventsInRange(
  parishId: string,
  startDate: string,
  endDate: string,
  includePrivate: boolean = false
): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('parish_id', parishId)
    .gte('starts_at', startDate)
    .lte('starts_at', endDate)
    .order('starts_at', { ascending: true })

  if (!includePrivate) {
    query = query.eq('is_public', true)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

// Get a single event by ID
export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Create a new event using RPC
export async function createEvent(event: EventInsert): Promise<Event> {
  const { data, error } = await supabase.rpc('create_event', {
    p_parish_id: event.parish_id,
    p_title: event.title,
    p_starts_at: event.starts_at,
    p_description: event.description ?? null,
    p_ends_at: event.ends_at ?? null,
    p_location: event.location ?? null,
    p_is_public: event.is_public ?? true
  })

  if (error) {
    throw error
  }

  // Fetch the created event
  const createdEvent = await getEvent(data)
  if (!createdEvent) {
    throw new Error('Failed to fetch created event')
  }

  return createdEvent
}

// Update an event using RPC
export async function updateEvent(id: string, updates: EventUpdate): Promise<Event> {
  const { data, error } = await supabase.rpc('update_event', {
    p_event_id: id,
    p_title: updates.title ?? null,
    p_description: updates.description ?? null,
    p_starts_at: updates.starts_at ?? null,
    p_ends_at: updates.ends_at ?? null,
    p_location: updates.location ?? null,
    p_is_public: updates.is_public ?? null,
    p_max_intentions: updates.max_intentions ?? null
  })

  if (error) {
    throw error
  }

  // Fetch the updated event
  const updatedEvent = await getEvent(data)
  if (!updatedEvent) {
    throw new Error('Failed to fetch updated event')
  }

  return updatedEvent
}

// Get event intention capacity (available slots)
export interface EventIntentionCapacity {
  event_id: string
  max_intentions: number
  current_count: number
  available_slots: number
  is_full: boolean
}

export async function getEventIntentionCapacity(eventId: string): Promise<EventIntentionCapacity> {
  const { data, error } = await supabase.rpc('get_event_intention_capacity', {
    p_event_id: eventId
  })

  if (error) {
    throw error
  }

  return data
}

// Publish/unpublish an event using RPC
export async function publishEvent(id: string, isPublic: boolean): Promise<Event> {
  const { data, error } = await supabase.rpc('publish_event', {
    p_event_id: id,
    p_is_public: isPublic
  })

  if (error) {
    throw error
  }

  // Fetch the updated event
  const updatedEvent = await getEvent(data)
  if (!updatedEvent) {
    throw new Error('Failed to fetch updated event')
  }

  return updatedEvent
}

// Delete an event using RPC
export async function deleteEvent(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_event', {
    p_event_id: id
  })

  if (error) {
    throw error
  }
}

// Get events with available capacity for promotion
// Returns events that have at least one available slot
export interface EventWithCapacity extends Event {
  max_intentions: number
  current_count: number
  available_slots: number
  is_full: boolean
}

export async function getEventsWithAvailableCapacity(parishId: string): Promise<EventWithCapacity[]> {
  // Get all upcoming events for the parish
  const now = new Date().toISOString()
  const events = await getParishEvents(parishId)
  
  // Filter to only upcoming events
  const upcomingEvents = events.filter(event => event.starts_at >= now)
  
  // Get capacity for each event
  const eventsWithCapacity: EventWithCapacity[] = []
  
  for (const event of upcomingEvents) {
    try {
      const capacity = await getEventIntentionCapacity(event.id)
      if (capacity.available_slots > 0) {
        eventsWithCapacity.push({
          ...event,
          max_intentions: capacity.max_intentions,
          current_count: capacity.current_count,
          available_slots: capacity.available_slots,
          is_full: capacity.is_full,
        })
      }
    } catch (error) {
      // Skip events that can't be accessed
      console.error(`Failed to get capacity for event ${event.id}:`, error)
    }
  }
  
  // Sort by date
  return eventsWithCapacity.sort((a, b) => 
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )
}



