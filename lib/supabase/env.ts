/**
 * Supabase env helpers - use new publishable/secret keys with legacy fallbacks.
 * See: https://supabase.com/docs/guides/api/api-keys
 */

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  return key
}

export function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) {
    throw new Error('Missing SUPABASE_SECRET_KEY')
  }
  return key
}
