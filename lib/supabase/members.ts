'use client'

import { supabase } from './client'

export interface Member {
  id: string
  parish_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  birth_date: string | null
  created_at: string
}

export interface MemberInsert {
  parish_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  birth_date?: string | null
}

export interface MemberUpdate {
  first_name?: string
  last_name?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  birth_date?: string | null
}

export async function getParishMembers(parishId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('parish_id', parishId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function createMember(member: MemberInsert): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert(member)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateMember(id: string, updates: MemberUpdate): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

