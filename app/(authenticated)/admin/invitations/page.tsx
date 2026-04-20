'use client'

import { RoleGuard } from '../../RoleGuard'
import InvitationsManagement from './InvitationsManagement'

export default function InvitationsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <InvitationsManagement />
    </RoleGuard>
  )
}
