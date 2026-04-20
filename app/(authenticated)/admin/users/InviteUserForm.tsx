'use client'

import { useState, FormEvent, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getAllRoles, type Role, type RoleName } from '@/lib/supabase/roles'

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
        // Set default to parishioner role if available
        const parishioner = allRoles.find(r => r.name === 'parishioner')
        if (parishioner) {
          setRoleId(parishioner.id)
        }
      } catch (err) {
        setError('Error al cargar los roles')
        console.error('Error loading roles:', err)
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
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('No autenticado')
      }

      // Call the API route
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

      // Success - reset form and call onSuccess
      setEmail('')
      const parishioner = roles.find(r => r.name === 'parishioner')
      setRoleId(parishioner?.id || '')
      setFullName('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar al usuario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '20px'
        }}>
          Invitar Usuario
        </h2>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Nombre completo *
            </label>
            <input
              type="text"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={submitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Role *
            </label>
            {loadingRoles ? (
              <div style={{ padding: '8px', color: '#666' }}>Cargando roles...</div>
            ) : (
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                disabled={submitting || roles.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
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

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: 'white',
                color: '#333',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                backgroundColor: submitting ? '#999' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Enviando...' : 'Enviar Invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

