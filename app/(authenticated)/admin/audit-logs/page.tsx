'use client'

import { RoleGuard } from '../../RoleGuard'
import AuditLogView from './AuditLogView'

export default function AuditLogsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AuditLogView />
    </RoleGuard>
  )
}
