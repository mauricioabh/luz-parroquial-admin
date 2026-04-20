'use client'

import { useState, FormEvent, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getAllRoles, type Role } from '@/lib/supabase/roles'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { translateError } from '@/lib/errors'

interface InviteUserFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function InviteUserForm({ onSuccess, onCancel }: InviteUserFormProps) {
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState<string>('')
  const [roles, setRoles] = useState<Role[]>([])
  const [full_name, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingRoles, setLoadingRoles] = useState(true)

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const allRoles = await getAllRoles()
        setRoles(allRoles)
        const parishioner = allRoles.find(r => r.name === 'parishioner')
        if (parishioner) {
          setRoleId(parishioner.id)
        }
      } catch (err) {
        setError(translateError(err, { action: 'load roles', resource: 'roles' }))
      } finally {
        setLoadingRoles(false)
      }
    }
    loadRoles()
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('No autenticado')
      }

      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          role_id: roleId,
          full_name
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al invitar usuario')
      }

      setEmail('')
      const parishioner = roles.find(r => r.name === 'parishioner')
      setRoleId(parishioner?.id || '')
      setFullName('')
      onSuccess()
    } catch (err) {
      setError(translateError(err, { action: 'invite user', resource: 'user invitation' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
          Dirección de correo electrónico *
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
          placeholder="usuario@ejemplo.com"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium text-[var(--foreground)]">
          Nombre completo *
        </label>
        <Input
          id="full_name"
          type="text"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={submitting}
          placeholder="Juan Pérez"
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium text-[var(--foreground)]">
          Rol *
        </label>
        {loadingRoles ? (
          <div className="p-3 rounded-lg bg-[var(--secondary)] text-sm text-[var(--muted-foreground)]">
            Cargando roles...
          </div>
        ) : (
          <select
            id="role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
            disabled={submitting || roles.length === 0}
            className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {roles.length === 0 && <option value="">No hay roles disponibles</option>}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Enviando invitación...' : 'Enviar invitación'}
        </Button>
      </div>
    </form>
  )
}

