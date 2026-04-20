'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import { ParishContext } from '@/components/ParishContext'
import { getParishProfilesWithEmail, ProfileWithEmail } from '@/lib/supabase/profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import InviteUserForm from './InviteUserForm'
import { supabase } from '@/lib/supabase/client'
import { getAllRoles, type Role } from '@/lib/supabase/roles'
import { updateUserRole, revertUserRole, getRecentRoleChanges, getRoleDescription, type RoleChange } from '@/lib/supabase/roleManagement'

function AdminUsersContent() {
  const { profile } = useProfile()
  const [profiles, setProfiles] = useState<ProfileWithEmail[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [loadedParishId, setLoadedParishId] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; userName: string; oldRoleId: string; oldRoleName: string; newRoleId: string; newRoleName: string } | null>(null)
  const [changingRole, setChangingRole] = useState(false)
  const [roleChanges, setRoleChanges] = useState<RoleChange[]>([])
  const [loadingRoleChanges, setLoadingRoleChanges] = useState(false)
  const [selectedRoleForUser, setSelectedRoleForUser] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.parish_id) {
        setLoading(false)
        return
      }

      if (loadedParishId === profile.parish_id) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Load roles and profiles in parallel
        const [allRoles, parishProfiles] = await Promise.all([
          getAllRoles(),
          getParishProfilesWithEmail(profile.parish_id)
        ])
        
        setRoles(allRoles)
        setProfiles(parishProfiles)
        setLoadedParishId(profile.parish_id)
        
        // Initialize selected roles map
        const initialRoles: Record<string, string> = {}
        parishProfiles.forEach(p => {
          initialRoles[p.id] = p.role_id
        })
        setSelectedRoleForUser(initialRoles)
        
        // Load recent role changes
        loadRecentRoleChanges()
      } catch (err) {
        console.error('Error loading data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos'
        setError(new Error(errorMessage))
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.parish_id])

  const loadRecentRoleChanges = async () => {
    if (!profile) return
    
    setLoadingRoleChanges(true)
    try {
      const changes = await getRecentRoleChanges(null, 10)
      setRoleChanges(changes)
    } catch (err) {
      console.error('Error loading role changes:', err)
    } finally {
      setLoadingRoleChanges(false)
    }
  }

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    if (!profile) return

    const userProfile = profiles.find(p => p.id === userId)
    if (!userProfile) return

    const oldRole = roles.find(r => r.id === userProfile.role_id)
    const newRole = roles.find(r => r.id === newRoleId)
    
    if (!oldRole || !newRole) return

    // Update local state immediately for better UX
    setSelectedRoleForUser(prev => ({ ...prev, [userId]: newRoleId }))

    // Show confirmation modal
    setPendingRoleChange({
      userId,
      userName: userProfile.full_name,
      oldRoleId: userProfile.role_id,
      oldRoleName: oldRole.name,
      newRoleId,
      newRoleName: newRole.name
    })
  }

  const confirmRoleChange = async () => {
    if (!pendingRoleChange || !profile?.parish_id) return

    setChangingRole(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No autenticado')
      }

      await updateUserRole(pendingRoleChange.userId, pendingRoleChange.newRoleId, session.access_token)

      // Reload profiles and role changes
      const parishProfiles = await getParishProfilesWithEmail(profile.parish_id)
      setProfiles(parishProfiles)
      await loadRecentRoleChanges()

      setPendingRoleChange(null)
    } catch (err) {
      console.error('Error updating role:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el rol'
      setError(new Error(errorMessage))
      
      // Revert local state on error
      setSelectedRoleForUser(prev => ({
        ...prev,
        [pendingRoleChange.userId]: pendingRoleChange.oldRoleId
      }))
      
      setPendingRoleChange(null)
    } finally {
      setChangingRole(false)
    }
  }

  const handleRevertRole = async (roleHistoryId: string) => {
    if (!profile?.parish_id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No autenticado')
      }

      await revertUserRole(roleHistoryId, session.access_token)

      // Reload profiles and role changes
      const parishProfiles = await getParishProfilesWithEmail(profile.parish_id)
      setProfiles(parishProfiles)
      
      // Update selected roles
      const initialRoles: Record<string, string> = {}
      parishProfiles.forEach(p => {
        initialRoles[p.id] = p.role_id
      })
      setSelectedRoleForUser(initialRoles)
      
      await loadRecentRoleChanges()
    } catch (err) {
      console.error('Error reverting role:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al revertir el rol'
      setError(new Error(errorMessage))
    }
  }

  const handleInviteSuccess = async () => {
    setShowInviteForm(false)
    if (profile?.parish_id) {
      setLoading(true)
      setError(null)
      try {
        const [allRoles, parishProfiles] = await Promise.all([
          getAllRoles(),
          getParishProfilesWithEmail(profile.parish_id)
        ])
        setRoles(allRoles)
        setProfiles(parishProfiles)
        setLoadedParishId(profile.parish_id)
        
        // Update selected roles map
        const initialRoles: Record<string, string> = {}
        parishProfiles.forEach(p => {
          initialRoles[p.id] = p.role_id
        })
        setSelectedRoleForUser(initialRoles)
      } catch (err) {
        console.error('Error loading profiles:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar los perfiles'
        setError(new Error(errorMessage))
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <ParishContext>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">Usuarios</h1>
            <p className="text-[var(--muted-foreground)]">
              Gestiona los usuarios de tu parroquia
            </p>
          </div>
          <Button onClick={() => setShowInviteForm(true)} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invitar Usuario
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-[var(--muted-foreground)]">Cargando usuarios...</p>
            </div>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-sm text-red-700">{error.message}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && profiles.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-[var(--secondary)] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No se encontraron usuarios</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Comienza invitando un nuevo usuario a tu parroquia.
              </p>
              <Button onClick={() => setShowInviteForm(true)}>
                Invitar Usuario
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && profiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Usuarios de la Parroquia</CardTitle>
              <CardDescription>
                {profiles.length} usuario{profiles.length !== 1 ? 's' : ''} en tu parroquia
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--secondary)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Rol
                      </th>
                      {profile && (profile.role_name === 'priest' || profile.role_name === 'secretary') && (
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                          Acciones
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Correo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Se unió
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {profiles.map((userProfile) => (
                      <tr key={userProfile.id} className="hover:bg-[var(--secondary)] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {userProfile.full_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {profile && (profile.role_name === 'priest' || profile.role_name === 'secretary') && profile.id !== userProfile.id ? (
                            <Select
                              value={selectedRoleForUser[userProfile.id] || userProfile.role_id}
                              onChange={(e) => handleRoleChange(userProfile.id, e.target.value)}
                              className="min-w-[140px]"
                            >
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Badge variant="default" className="capitalize">
                              {userProfile.role_name}
                            </Badge>
                          )}
                        </td>
                        {profile && (profile.role_name === 'priest' || profile.role_name === 'secretary') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {profile.id !== userProfile.id && (
                              <div className="text-xs text-[var(--muted-foreground)]">
                                {roles.find(r => r.id === (selectedRoleForUser[userProfile.id] || userProfile.role_id))?.description ? (
                                  <span title={roles.find(r => r.id === (selectedRoleForUser[userProfile.id] || userProfile.role_id))?.description || ''}>
                                    {getRoleDescription(userProfile.role_name)}
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {profile.id === userProfile.id && (
                              <span className="text-xs text-[var(--muted-foreground)] italic">Tu rol</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                          {userProfile.email || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                          {new Date(userProfile.created_at).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Changes History */}
        {profile && (profile.role_name === 'priest' || profile.role_name === 'secretary') && roleChanges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cambios de Rol Recientes</CardTitle>
              <CardDescription>
                Cambios de rol de las últimas 24 horas que pueden deshacerse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roleChanges.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {change.user_full_name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Cambiado de <span className="font-medium capitalize">{change.old_role_name}</span> a{' '}
                        <span className="font-medium capitalize">{change.new_role_name}</span> por {change.changed_by_full_name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {new Date(change.changed_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                    {change.can_revert && !change.reverted_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertRole(change.id)}
                        disabled={changingRole}
                      >
                        Deshacer
                      </Button>
                    )}
                    {change.reverted_at && (
                      <span className="text-xs text-[var(--muted-foreground)] italic">
                        Revertido
                      </span>
                    )}
                    {!change.can_revert && !change.reverted_at && (
                      <span className="text-xs text-[var(--muted-foreground)] italic">
                        Expirado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Modal */}
        <Modal
          isOpen={pendingRoleChange !== null}
          onClose={() => {
            if (!changingRole) {
              // Revert local state if cancelled
              if (pendingRoleChange) {
                setSelectedRoleForUser(prev => ({
                  ...prev,
                  [pendingRoleChange.userId]: pendingRoleChange.oldRoleId
                }))
              }
              setPendingRoleChange(null)
            }
          }}
          title="Confirmar Cambio de Rol"
          size="md"
        >
          {pendingRoleChange && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--foreground)]">
                ¿Estás seguro de que deseas cambiar el rol de <strong>{pendingRoleChange.userName}</strong>?
              </p>
              <div className="p-4 bg-[var(--secondary)] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Rol Actual:</span>
                  <Badge variant="default" className="capitalize">
                    {pendingRoleChange.oldRoleName}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Nuevo Rol:</span>
                  <Badge variant="default" className="capitalize">
                    {pendingRoleChange.newRoleName}
                  </Badge>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-1">Descripción del Rol:</p>
                <p className="text-sm text-blue-800">
                  {getRoleDescription(pendingRoleChange.newRoleName)}
                </p>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Este cambio puede deshacerse dentro de 24 horas desde la sección de Cambios de Rol Recientes a continuación.
              </p>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!changingRole) {
                      setSelectedRoleForUser(prev => ({
                        ...prev,
                        [pendingRoleChange.userId]: pendingRoleChange.oldRoleId
                      }))
                      setPendingRoleChange(null)
                    }
                  }}
                  disabled={changingRole}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmRoleChange}
                  disabled={changingRole}
                >
                  {changingRole ? 'Actualizando...' : 'Confirmar Cambio'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={showInviteForm}
          onClose={() => setShowInviteForm(false)}
          title="Invitar Usuario"
          size="md"
        >
          <div className="p-6">
            <InviteUserForm
              onSuccess={handleInviteSuccess}
              onCancel={() => setShowInviteForm(false)}
            />
          </div>
        </Modal>
      </div>
    </ParishContext>
  )
}

export default function AdminUsersPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AdminUsersContent />
    </RoleGuard>
  )
}
