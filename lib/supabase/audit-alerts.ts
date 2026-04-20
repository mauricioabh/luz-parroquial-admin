/**
 * Audit Alerts Helper Functions
 * 
 * Provides utilities for viewing and managing audit alerts
 */

import { supabase } from './client'

export interface AuditAlert {
  id: string
  alert_type: string
  alert_severity: 'low' | 'medium' | 'high' | 'critical'
  alert_message: string
  audit_log_id: string | null
  parish_id: string | null
  actor_user_id: string | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  metadata: Record<string, any> | null
  created_at: string
}

/**
 * Get audit alerts for a parish
 * Only priests and secretaries can read audit alerts
 */
export async function getAuditAlerts(
  parishId?: string,
  resolved: boolean = false,
  limit: number = 100
): Promise<AuditAlert[] | null> {
  let query = supabase
    .from('audit_alerts')
    .select('*')
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (parishId) {
    query = query.eq('parish_id', parishId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching audit alerts:', error)
    return null
  }

  return data as AuditAlert[]
}

/**
 * Get unresolved audit alerts by severity
 */
export async function getUnresolvedAlertsBySeverity(
  parishId?: string
): Promise<{
  critical: AuditAlert[]
  high: AuditAlert[]
  medium: AuditAlert[]
  low: AuditAlert[]
} | null> {
  const alerts = await getAuditAlerts(parishId, false, 1000)
  if (!alerts) return null

  return {
    critical: alerts.filter((a) => a.alert_severity === 'critical'),
    high: alerts.filter((a) => a.alert_severity === 'high'),
    medium: alerts.filter((a) => a.alert_severity === 'medium'),
    low: alerts.filter((a) => a.alert_severity === 'low'),
  }
}

/**
 * Resolve an audit alert
 * Only priests and secretaries can resolve audit alerts
 */
export async function resolveAuditAlert(
  alertId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('resolve_audit_alert', {
    p_alert_id: alertId,
    p_notes: notes || null,
  })

  if (error) {
    console.error('Error resolving audit alert:', error)
    return { success: false, error: error.message }
  }

  return { success: data?.success ?? false }
}

/**
 * Get count of unresolved alerts by severity
 */
export async function getUnresolvedAlertCounts(
  parishId?: string
): Promise<{
  critical: number
  high: number
  medium: number
  low: number
  total: number
} | null> {
  const alerts = await getUnresolvedAlertsBySeverity(parishId)
  if (!alerts) return null

  return {
    critical: alerts.critical.length,
    high: alerts.high.length,
    medium: alerts.medium.length,
    low: alerts.low.length,
    total:
      alerts.critical.length +
      alerts.high.length +
      alerts.medium.length +
      alerts.low.length,
  }
}

