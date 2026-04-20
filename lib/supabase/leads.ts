'use client'

import { supabase } from './client'

export type LeadStatus = 'contacted' | 'demoed' | 'trial' | 'converted'

export interface Lead {
  id: string
  parish_name: string
  diocese: string
  contact_email: string
  status: LeadStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadInsert {
  parish_name: string
  diocese: string
  contact_email: string
  status?: LeadStatus
  notes?: string | null
}

export interface LeadUpdate {
  parish_name?: string
  diocese?: string
  contact_email?: string
  status?: LeadStatus
  notes?: string | null
}

/**
 * Get all leads with optional status filter
 */
export async function getLeads(status?: LeadStatus): Promise<Lead[]> {
  let query = supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get a single lead by ID
 */
export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Create a new lead
 */
export async function createLead(lead: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...lead,
      status: lead.status || 'contacted'
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update a lead
 */
export async function updateLead(id: string, updates: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Delete a lead
 */
export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

/**
 * Update lead status
 */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  return updateLead(id, { status })
}

/**
 * Add or update notes for a lead
 */
export async function updateLeadNotes(id: string, notes: string | null): Promise<Lead> {
  return updateLead(id, { notes })
}

/**
 * Get status badge variant for UI
 */
export function getStatusBadgeVariant(status: LeadStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'contacted':
      return 'outline'
    case 'demoed':
      return 'secondary'
    case 'trial':
      return 'default'
    case 'converted':
      return 'default'
    default:
      return 'outline'
  }
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: LeadStatus): string {
  switch (status) {
    case 'contacted':
      return 'Contacted'
    case 'demoed':
      return 'Demoed'
    case 'trial':
      return 'Trial'
    case 'converted':
      return 'Converted'
    default:
      return status
  }
}

/**
 * Get leads count by status
 */
export async function getLeadsCountByStatus(): Promise<Record<LeadStatus, number>> {
  const { data, error } = await supabase
    .from('leads')
    .select('status')

  if (error) {
    throw error
  }

  const counts: Record<LeadStatus, number> = {
    contacted: 0,
    demoed: 0,
    trial: 0,
    converted: 0
  }

  if (data) {
    data.forEach((lead) => {
      const status = lead.status as LeadStatus
      if (status in counts) {
        counts[status]++
      }
    })
  }

  return counts
}

