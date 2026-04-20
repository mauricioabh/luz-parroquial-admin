'use client'

import { getCurrentUserProfile, UserProfile } from './profile'
import { ADMIN_ROLES, type RoleName } from './roles'

export type UserRole = RoleName

export interface SessionBootstrap {
  profile: UserProfile
  role: UserRole
  parish_id: string | null
  diocese_id: string | null
  isAdmin: boolean
}

export async function bootstrapSession(): Promise<SessionBootstrap> {
  const profile = await getCurrentUserProfile()
  
  if (!profile) {
    throw new Error('Profile not found. Please contact your administrator.')
  }

  const isAdmin = ADMIN_ROLES.includes(profile.role_name)

  return {
    profile,
    role: profile.role_name,
    parish_id: profile.parish_id,
    diocese_id: profile.diocese_id,
    isAdmin,
  }
}

export function getRedirectPath(role: UserRole, customRedirect?: string): string {
  // If a custom redirect is provided (e.g., from invitation flow), use it
  if (customRedirect) {
    return customRedirect
  }
  
  if (role === 'parishioner') {
    return '/dashboard'
  }
  
  if (role === 'diocese_admin') {
    return '/diocese'
  }
  
  return '/'
}

