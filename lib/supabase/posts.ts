'use client'

import { supabase } from './client'

export interface Post {
  id: string
  parish_id: string
  title: string
  body: string
  published: boolean
  created_by: string
  created_at: string
}

export interface PostInsert {
  parish_id: string
  title: string
  body: string
  published?: boolean
}

export interface PostUpdate {
  title?: string
  body?: string
  published?: boolean
}

// Get all posts for a parish (admin view - includes drafts)
export async function getParishPosts(parishId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('parish_id', parishId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

// Get published posts for a parish (parishioner view)
export async function getPublishedPosts(parishId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('parish_id', parishId)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

// Get a single post by ID
export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Create a new post using RPC
export async function createPost(post: PostInsert): Promise<Post> {
  const { data, error } = await supabase.rpc('create_post', {
    p_parish_id: post.parish_id,
    p_title: post.title,
    p_body: post.body,
    p_published: post.published ?? false
  })

  if (error) {
    throw error
  }

  // Fetch the created post
  const createdPost = await getPost(data)
  if (!createdPost) {
    throw new Error('Failed to fetch created post')
  }

  return createdPost
}

// Update a post using RPC
export async function updatePost(id: string, updates: PostUpdate): Promise<Post> {
  const { data, error } = await supabase.rpc('update_post', {
    p_post_id: id,
    p_title: updates.title ?? null,
    p_body: updates.body ?? null,
    p_published: updates.published ?? null
  })

  if (error) {
    throw error
  }

  // Fetch the updated post
  const updatedPost = await getPost(data)
  if (!updatedPost) {
    throw new Error('Failed to fetch updated post')
  }

  return updatedPost
}

// Publish/unpublish a post using RPC
export async function publishPost(id: string, published: boolean): Promise<Post> {
  const { data, error } = await supabase.rpc('publish_post', {
    p_post_id: id,
    p_published: published
  })

  if (error) {
    throw error
  }

  // Fetch the updated post
  const updatedPost = await getPost(data)
  if (!updatedPost) {
    throw new Error('Failed to fetch updated post')
  }

  return updatedPost
}

// Delete a post
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

