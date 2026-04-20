'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { getRedirectPath } from '@/lib/supabase/session'
import { ADMIN_ROLES } from '@/lib/supabase/roles'
import { PermissionDenied } from '@/components/permissions'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: Array<'priest' | 'secretary' | 'editor' | 'parishioner' | 'diocese_admin'>
  requireAdmin?: boolean
}

export function RoleGuard({ children, allowedRoles, requireAdmin = false }: RoleGuardProps) {
  const { profile, loading, error } = useProfile()
  const router = useRouter()

  // Mostrar loading solo cuando no tenemos perfil; si hay perfil (p.ej. de caché) mostrar contenido
  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)] p-4">
        <PermissionDenied
          title="Perfil No Encontrado"
          message={error?.message || 'No se pudo cargar tu perfil. Por favor contacta a tu administrador.'}
          action="/login"
          actionLabel="Volver al Inicio de Sesión"
        />
      </div>
    )
  }

  // Check role synchronously - no async state needed
  const accessDenied = requireAdmin
    ? !ADMIN_ROLES.includes(profile.role_name)
    : allowedRoles
    ? !allowedRoles.includes(profile.role_name)
    : false

  if (accessDenied) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)] p-4">
        <PermissionDenied
          title="Acceso Restringido"
          message="Esta acción es gestionada por la oficina parroquial."
          onAction={() => router.push(getRedirectPath(profile.role_name))}
          actionLabel="Ir al Panel"
        />
      </div>
    )
  }

  return <>{children}</>
}

