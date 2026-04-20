'use client'

import { supabase } from './client'

export interface MassSchedule {
  id: string
  parish_id: string
  title: string
  weekday: number // 0 = Sunday, 6 = Saturday
  time: string // HH:MM format
  location: string | null
  is_active: boolean
  created_at: string
}

export interface MassScheduleInsert {
  parish_id: string
  title: string
  weekday: number
  time: string
  location?: string | null
  is_active?: boolean
}

export interface MassScheduleUpdate {
  title?: string
  weekday?: number
  time?: string
  location?: string | null
  is_active?: boolean
}

export interface GenerateMassEventsResult {
  success: boolean
  schedule_id: string
  schedule_title: string
  start_date: string
  end_date: string
  events_created: number
  events_skipped: number
  total_processed: number
}

// Weekday names for display
export const WEEKDAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
] as const

export const WEEKDAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

// Get weekday display name
export function getWeekdayName(weekday: number, lang: 'es' | 'en' = 'es'): string {
  if (weekday < 0 || weekday > 6) {
    return 'Invalid'
  }
  return lang === 'es' ? WEEKDAY_NAMES[weekday] : WEEKDAY_NAMES_EN[weekday]
}

// Get all mass schedules for a parish
export async function getMassSchedules(parishId: string): Promise<MassSchedule[]> {
  const { data, error } = await supabase
    .from('mass_schedules')
    .select('*')
    .eq('parish_id', parishId)
    .order('weekday', { ascending: true })
    .order('time', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

// Get active mass schedules for a parish
export async function getActiveMassSchedules(parishId: string): Promise<MassSchedule[]> {
  const { data, error } = await supabase
    .from('mass_schedules')
    .select('*')
    .eq('parish_id', parishId)
    .eq('is_active', true)
    .order('weekday', { ascending: true })
    .order('time', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

// Get a single mass schedule by ID
export async function getMassSchedule(id: string): Promise<MassSchedule | null> {
  const { data, error } = await supabase
    .from('mass_schedules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Create a new mass schedule using RPC
export async function createMassSchedule(schedule: MassScheduleInsert): Promise<MassSchedule> {
  const { data, error } = await supabase.rpc('create_mass_schedule', {
    p_parish_id: schedule.parish_id,
    p_title: schedule.title,
    p_weekday: schedule.weekday,
    p_time: schedule.time,
    p_location: schedule.location ?? null,
    p_is_active: schedule.is_active ?? true
  })

  if (error) {
    throw error
  }

  // Fetch the created schedule
  const createdSchedule = await getMassSchedule(data)
  if (!createdSchedule) {
    throw new Error('Failed to fetch created schedule')
  }

  return createdSchedule
}

// Update a mass schedule using RPC
export async function updateMassSchedule(
  id: string,
  updates: MassScheduleUpdate
): Promise<MassSchedule> {
  const { data, error } = await supabase.rpc('update_mass_schedule', {
    p_schedule_id: id,
    p_title: updates.title ?? null,
    p_weekday: updates.weekday ?? null,
    p_time: updates.time ?? null,
    p_location: updates.location ?? null,
    p_is_active: updates.is_active ?? null
  })

  if (error) {
    throw error
  }

  // Fetch the updated schedule
  const updatedSchedule = await getMassSchedule(data)
  if (!updatedSchedule) {
    throw new Error('Failed to fetch updated schedule')
  }

  return updatedSchedule
}

// Delete a mass schedule using RPC
export async function deleteMassSchedule(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_mass_schedule', {
    p_schedule_id: id
  })

  if (error) {
    throw error
  }
}

// Generate mass events from a schedule
export async function generateMassEvents(
  scheduleId: string,
  startDate: string, // ISO date string (YYYY-MM-DD)
  endDate: string // ISO date string (YYYY-MM-DD)
): Promise<GenerateMassEventsResult> {
  const { data, error } = await supabase.rpc('generate_mass_events', {
    p_schedule_id: scheduleId,
    p_start_date: startDate,
    p_end_date: endDate
  })

  if (error) {
    throw error
  }

  return data as GenerateMassEventsResult
}
