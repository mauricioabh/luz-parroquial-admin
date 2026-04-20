'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  getParishMembers,
  createMember,
  updateMember,
  deleteMember,
  Member,
  MemberInsert,
  MemberUpdate
} from '@/lib/supabase/members'
import MemberForm from './MemberForm'

export default function MembersPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <MembersContent />
    </RoleGuard>
  )
}

function MembersContent() {
  const { profile } = useProfile()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadMembers = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parishMembers = await getParishMembers(profile.parish_id)
      setMembers(parishMembers)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los miembros'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [profile])

  const handleCreate = () => {
    setEditingMember(null)
    setShowForm(true)
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este miembro?')) {
      return
    }

    setDeletingId(id)
    try {
      await deleteMember(id)
      await loadMembers()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el miembro'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleFormSubmit = async (data: MemberInsert | MemberUpdate) => {
    if (!profile?.parish_id) return

    try {
      if (editingMember) {
        await updateMember(editingMember.id, data as MemberUpdate)
      } else {
        await createMember({ ...data, parish_id: profile.parish_id } as MemberInsert)
      }
      setShowForm(false)
      setEditingMember(null)
      await loadMembers()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingMember ? 'actualizar' : 'crear'} el miembro`))
      throw err
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingMember(null)
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Miembros de la Parroquia
          </h1>
          {profile && (
            <p style={{
              fontSize: '14px',
              color: '#666'
            }}>
              Parroquia: {profile.parish_id}
            </p>
          )}
        </div>
        <button
          onClick={handleCreate}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          + Agregar Miembro
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error.message}
        </div>
      )}

      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '40px'
        }}>
          <p style={{ color: '#666' }}>Cargando miembros...</p>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '16px' }}>
            No se encontraron miembros en esta parroquia.
          </p>
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Agregar Primer Miembro
          </button>
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>
                  {member.first_name} {member.last_name}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  {member.email && <span>📧 {member.email}</span>}
                  {member.phone && <span>📞 {member.phone}</span>}
                  {member.birth_date && <span>🎂 {new Date(member.birth_date).toLocaleDateString('es-ES')}</span>}
                </div>
                {member.address && (
                  <div style={{
                    fontSize: '13px',
                    color: '#999',
                    marginTop: '4px'
                  }}>
                    {member.address}
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => handleEdit(member)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0f0f0',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  disabled={deletingId === member.id}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: deletingId === member.id ? '#ccc' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: deletingId === member.id ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deletingId === member.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <MemberForm
          member={editingMember}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}
