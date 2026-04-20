'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  updateLeadStatus,
  updateLeadNotes,
  Lead,
  LeadInsert,
  LeadUpdate,
  LeadStatus,
  getStatusBadgeVariant,
  getStatusDisplayName,
  getLeadsCountByStatus
} from '@/lib/supabase/leads'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'

export default function AdminLeadsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AdminLeadsContent />
    </RoleGuard>
  )
}

function AdminLeadsContent() {
  const { profile } = useProfile()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [sendingEmailType, setSendingEmailType] = useState<'demo_invite' | 'follow_up' | null>(null)
  const [counts, setCounts] = useState<Record<LeadStatus, number>>({
    contacted: 0,
    demoed: 0,
    trial: 0,
    converted: 0
  })

  const loadLeads = async () => {
    setLoading(true)
    setError(null)

    try {
      const status = selectedStatus === 'all' ? undefined : selectedStatus
      const leadsData = await getLeads(status)
      setLeads(leadsData)
      
      // Load counts
      const statusCounts = await getLeadsCountByStatus()
      setCounts(statusCounts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los leads'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [selectedStatus])

  const handleCreate = () => {
    setEditingLead(null)
    setShowForm(true)
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este lead? Esta acción no se puede deshacer. Toda la información sobre este lead será eliminada permanentemente.')) {
      return
    }

    try {
      await deleteLead(id)
      await loadLeads()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el lead'))
    }
  }

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await updateLeadStatus(id, status)
      await loadLeads()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al actualizar el estado del lead'))
    }
  }

  const handleEditNotes = (lead: Lead) => {
    setEditingNotesId(lead.id)
    setNotesText(lead.notes || '')
  }

  const handleSaveNotes = async (id: string) => {
    try {
      await updateLeadNotes(id, notesText || null)
      setEditingNotesId(null)
      setNotesText('')
      await loadLeads()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al actualizar las notas'))
    }
  }

  const handleSendEmail = async (lead: Lead, emailType: 'demo_invite' | 'follow_up') => {
    setSendingEmailId(lead.id)
    setSendingEmailType(emailType)

    try {
      // Get auth token from supabase client
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No autenticado')
      }

      const response = await fetch('/api/send-lead-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          emailType,
          leadId: lead.id,
          customMessage: emailType === 'follow_up' ? `I wanted to follow up on our conversation about Luz Parroquial for ${lead.parish_name}.` : undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar el correo')
      }

      // Reload leads to update status if changed
      await loadLeads()
      
      // Show success message (you can add a toast notification here)
      alert(result.message || 'Email sent successfully!')
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al enviar el correo'))
    } finally {
      setSendingEmailId(null)
      setSendingEmailType(null)
    }
  }

  const handleFormSubmit = async (data: LeadInsert | LeadUpdate) => {
    try {
      if (editingLead) {
        await updateLead(editingLead.id, data as LeadUpdate)
      } else {
        await createLead(data as LeadInsert)
      }
      setShowForm(false)
      setEditingLead(null)
      await loadLeads()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingLead ? 'actualizar' : 'crear'} lead`))
      throw err
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingLead(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalLeads = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 text-[var(--foreground)]">
            Canal de Ventas
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Gestiona leads de parroquias y rastrea el progreso de alcance
          </p>
        </div>
        <Button onClick={handleCreate}>
          + Agregar Lead
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{totalLeads}</div>
              <div className="text-sm text-[var(--muted-foreground)]">Total de Leads</div>
            </div>
          </CardContent>
        </Card>
        {(['contacted', 'demoed', 'trial', 'converted'] as LeadStatus[]).map((status) => (
          <Card
            key={status}
            className={selectedStatus === status ? 'ring-2 ring-[var(--primary)]' : ''}
            onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
            style={{ cursor: 'pointer' }}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--foreground)]">{counts[status]}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{getStatusDisplayName(status)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as LeadStatus | 'all')}
        >
          <option value="all">Todos los Leads</option>
          {(['contacted', 'demoed', 'trial', 'converted'] as LeadStatus[]).map((status) => (
            <option key={status} value={status}>
              {getStatusDisplayName(status)} ({counts[status]})
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando leads...</p>
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">
              No se encontraron leads. Agrega tu primer lead para comenzar.
            </p>
            <Button onClick={handleCreate}>
              Agregar Primer Lead
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && leads.length > 0 && (
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-xl">{lead.parish_name}</CardTitle>
                      <Badge variant={getStatusBadgeVariant(lead.status)}>
                        {getStatusDisplayName(lead.status)}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-[var(--muted-foreground)]">
                      <p>
                        <strong>Diócesis:</strong> {lead.diocese}
                      </p>
                      <p>
                        <strong>Correo:</strong>{' '}
                        <a
                          href={`mailto:${lead.contact_email}`}
                          className="text-[var(--primary)] hover:underline"
                        >
                          {lead.contact_email}
                        </a>
                      </p>
                      <p>
                        <strong>Creado:</strong> {formatDate(lead.created_at)}
                      </p>
                      <p>
                        <strong>Actualizado:</strong> {formatDate(lead.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="min-w-[140px]"
                    >
                      {(['contacted', 'demoed', 'trial', 'converted'] as LeadStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {getStatusDisplayName(status)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(lead, 'demo_invite')}
                      disabled={sendingEmailId === lead.id && sendingEmailType === 'demo_invite'}
                    >
                      {sendingEmailId === lead.id && sendingEmailType === 'demo_invite' ? 'Enviando...' : 'Enviar Invitación Demo'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(lead, 'follow_up')}
                      disabled={sendingEmailId === lead.id && sendingEmailType === 'follow_up'}
                    >
                      {sendingEmailId === lead.id && sendingEmailType === 'follow_up' ? 'Enviando...' : 'Seguimiento'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditNotes(lead)}
                    >
                      {editingNotesId === lead.id ? 'Cancelar' : lead.notes ? 'Editar Notas' : 'Agregar Notas'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(lead)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(lead.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingNotesId === lead.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Agrega notas sobre este lead..."
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveNotes(lead.id)}
                      >
                        Guardar Notas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingNotesId(null)
                          setNotesText('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold mb-2">Notas:</h4>
                    <p className="text-[var(--muted-foreground)] whitespace-pre-wrap">
                      {lead.notes || 'Aún no hay notas. Haz clic en "Agregar Notas" para agregar información sobre este lead.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <LeadForm
          lead={editingLead}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}

interface LeadFormProps {
  lead: Lead | null
  onSubmit: (data: LeadInsert | LeadUpdate) => Promise<void>
  onCancel: () => void
}

function LeadForm({ lead, onSubmit, onCancel }: LeadFormProps) {
  const [parishName, setParishName] = useState(lead?.parish_name || '')
  const [diocese, setDiocese] = useState(lead?.diocese || '')
  const [contactEmail, setContactEmail] = useState(lead?.contact_email || '')
  const [status, setStatus] = useState<LeadStatus>(lead?.status || 'contacted')
  const [notes, setNotes] = useState(lead?.notes || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await onSubmit({
        parish_name: parishName,
        diocese,
        contact_email: contactEmail,
        status,
        notes: notes || null
      })
    } catch (err) {
      // Error is handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={lead ? 'Editar Lead' : 'Agregar Lead'}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Nombre de la Parroquia *
          </label>
          <Input
            value={parishName}
            onChange={(e) => setParishName(e.target.value)}
            required
            placeholder="Parroquia de Santa María"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Diócesis *
          </label>
          <Input
            value={diocese}
            onChange={(e) => setDiocese(e.target.value)}
            required
            placeholder="Diócesis de Los Ángeles"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Correo de Contacto *
          </label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            placeholder="contacto@parroquia.org"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Estado *
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            required
          >
            {(['contacted', 'demoed', 'trial', 'converted'] as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {getStatusDisplayName(s)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Notas
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agrega notas sobre este lead..."
            rows={4}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
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
            {submitting ? 'Guardando...' : lead ? 'Actualizar Lead' : 'Crear Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

