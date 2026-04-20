'use client'

import { supabase } from './client'

export interface PushSubscription {
  id: string
  user_id: string
  parish_id: string
  platform: 'web' | 'ios' | 'android'
  endpoint: string
  p256dh: string
  auth: string
  enabled: boolean
  created_at: string
}

export interface PushSubscriptionInput {
  platform: 'web' | 'ios' | 'android'
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Get all push subscriptions for the current user
 */
export async function getUserPushSubscriptions(): Promise<PushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Register a new push subscription
 */
export async function registerPushSubscription(
  subscription: PushSubscriptionInput
): Promise<PushSubscription> {
  // Get current user profile to get parish_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: user.id,
      parish_id: profile.parish_id,
      platform: subscription.platform,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      enabled: true,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update a push subscription (enable/disable)
 */
export async function updatePushSubscription(
  subscriptionId: string,
  updates: { enabled?: boolean }
): Promise<PushSubscription> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Delete a push subscription
 */
export async function deletePushSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('id', subscriptionId)

  if (error) {
    throw error
  }
}

/**
 * Request browser permission for push notifications and register subscription
 * This is a helper function for web push notifications
 */
export async function requestPushNotificationPermission(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported in this browser')
  }

  // Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Push notification permission denied')
  }

  // Register service worker (if not already registered)
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
  } catch (error) {
    // Service worker might already be registered
    registration = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.ready
  }

  // Subscribe to push service
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    ),
  })

  // Convert subscription to format needed for database
  const subscriptionData: PushSubscriptionInput = {
    platform: 'web',
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
    auth: arrayBufferToBase64(subscription.getKey('auth')!),
  }

  // Register in database
  return await registerPushSubscription(subscriptionData)
}

/**
 * Helper function to convert VAPID key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Helper function to convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

