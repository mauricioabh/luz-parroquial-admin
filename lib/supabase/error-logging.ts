/**
 * Error Logging Helper Functions
 * 
 * Provides utilities for logging errors to the database
 * Note: Error logs can only be inserted via service role (from Edge Functions/API routes)
 */

import { createClient } from '@supabase/supabase-js'

// Use service role client for error logging (only available server-side)
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SECRET_KEY not set - error logging will fail')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export type ErrorLevel = 'error' | 'warning' | 'critical'

export interface ErrorLogParams {
  errorLevel: ErrorLevel
  errorType: string
  errorMessage: string
  errorStack?: string
  userId?: string
  parishId?: string
  requestPath?: string
  requestMethod?: string
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, any>
}

/**
 * Log an error to the database
 * This function should be called from server-side code (API routes, Edge Functions)
 * Requires SUPABASE_SECRET_KEY environment variable
 */
export async function logError(params: ErrorLogParams): Promise<string | null> {
  const supabase = getServiceRoleClient()
  if (!supabase) {
    console.error('Cannot log error: Service role client not available')
    return null
  }

  const { data, error } = await supabase.rpc('log_error', {
    p_error_level: params.errorLevel,
    p_error_type: params.errorType,
    p_error_message: params.errorMessage,
    p_error_stack: params.errorStack || null,
    p_user_id: params.userId || null,
    p_parish_id: params.parishId || null,
    p_request_path: params.requestPath || null,
    p_request_method: params.requestMethod || null,
    p_user_agent: params.userAgent || null,
    p_ip_address: params.ipAddress || null,
    p_metadata: params.metadata || null,
  })

  if (error) {
    console.error('Error logging error to database:', error)
    return null
  }

  return data || null
}

/**
 * Helper to log errors from API routes
 */
export async function logApiError(
  error: Error | unknown,
  context: {
    requestPath?: string
    requestMethod?: string
    userId?: string
    parishId?: string
    userAgent?: string
    ipAddress?: string
    metadata?: Record<string, any>
  }
): Promise<string | null> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  return logError({
    errorLevel: 'error',
    errorType: 'api_error',
    errorMessage,
    errorStack,
    ...context,
  })
}

/**
 * Get error logs for a parish
 * Only priests and secretaries can read error logs
 */
export async function getErrorLogs(
  parishId?: string,
  limit: number = 100
): Promise<any[] | null> {
  const supabase = getServiceRoleClient()
  if (!supabase) {
    console.error('Cannot get error logs: Service role client not available')
    return null
  }

  let query = supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (parishId) {
    query = query.eq('parish_id', parishId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching error logs:', error)
    return null
  }

  return data
}

/**
 * Resolve an error log
 * Only priests and secretaries can resolve error logs
 */
export async function resolveErrorLog(
  errorLogId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // This uses regular client (authenticated user)
  const { createClient: createRegularClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseKey) {
    console.error('Missing publishable/anon key for resolveErrorLog')
    return { success: false, error: 'Configuration error' }
  }

  // Note: This requires an authenticated user with priest/secretary role
  const supabase = createRegularClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.rpc('resolve_error_log', {
    p_error_log_id: errorLogId,
    p_notes: notes || null,
  })

  if (error) {
    console.error('Error resolving error log:', error)
    return { success: false, error: error.message }
  }

  return { success: data?.success ?? false }
}

