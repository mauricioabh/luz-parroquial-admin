'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getMassSchedules,
  createMassSchedule,
  updateMassSchedule,
  deleteMassSchedule,
  generateMassEvents,
  MassSchedule,
  MassScheduleInsert,
  MassScheduleUpdate,
  getWeekdayName,
  WEEKDAY_NAMES
} from '@/lib/supabase/mass-schedules'
import MassScheduleForm from './MassScheduleForm'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

export default function AdminMassSchedulesPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AdminMassSchedulesContent />
    </RoleGuard>
  )
}

function AdminMassSchedulesContent() {
  const { profile } = useProfile()
  const [schedules, setSchedules] = useState<MassSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<MassSchedule | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateWeeks, setGenerateWeeks] = useState(4)
  const [generateResult, setGenerateResult] = useState<string | null>(null)

  const loadSchedules = async () => {
    if (!profile?.parish_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parishSchedules = await getMassSchedules(profile.parish_id)
      setSchedules(parishSchedules)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar los horarios de misa'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [profile])

  const handleCreate = () => {
    setEditingSchedule(null)
    setShowForm(true)
  }

  const handleEdit = (schedule: MassSchedule) => {
    setEditingSchedule(schedule)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este horario de Misa? Esta acción no se puede deshacer.')) {
      return
    }

    setDeletingId(id)
    try {
      await deleteMassSchedule(id)
      await loadSchedules()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar el horario'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleGenerate = (schedule: MassSchedule) => {
    setEditingSchedule(schedule)
    setShowGenerateModal(true)
    setGenerateWeeks(4)
    setGenerateResult(null)
  }

  const handleGenerateSubmit = async () => {
    if (!editingSchedule) return

    setGeneratingId(editingSchedule.id)
    setGenerateResult(null)
    try {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + generateWeeks * 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const result = await generateMassEvents(editingSchedule.id, startDate, endDate)
      setGenerateResult(
        `Se crearon ${result.events_created} eventos. ${result.events_skipped > 0 ? `${result.events_skipped} eventos ya existían y se omitieron.` : ''}`
      )
      
      // Reload schedules after a short delay to show the result
      setTimeout(() => {
        setShowGenerateModal(false)
        setEditingSchedule(null)
        setGenerateResult(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al generar los eventos'))
      setGenerateResult(null)
    } finally {
      setGeneratingId(null)
    }
  }

  const handleFormSubmit = async (data: MassScheduleInsert | MassScheduleUpdate) => {
    if (!profile?.parish_id) return

    try {
      if (editingSchedule) {
        await updateMassSchedule(editingSchedule.id, data as MassScheduleUpdate)
      } else {
        await createMassSchedule({ ...data, parish_id: profile.parish_id } as MassScheduleInsert)
      }
      setShowForm(false)
      setEditingSchedule(null)
      await loadSchedules()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingSchedule ? 'actualizar' : 'crear'} el horario`))
      throw err
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingSchedule(null)
  }

  const formatTime = (timeString: string) => {
    // timeString is in HH:MM format
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Cargando horarios de Misa...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Horarios de Misa Recurrentes</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Configure horarios recurrentes que generan automáticamente eventos de Misa
          </p>
        </div>
        <Button onClick={handleCreate}>Agregar Horario</Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error.message}
        </div>
      )}

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-[var(--muted-foreground)]">
            No hay horarios de Misa configurados. Cree uno para comenzar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">
                        {schedule.title}
                      </h3>
                      {schedule.is_active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                      <div>
                        <strong>Día:</strong> {getWeekdayName(schedule.weekday)}
                      </div>
                      <div>
                        <strong>Hora:</strong> {formatTime(schedule.time)}
                      </div>
                      {schedule.location && (
                        <div>
                          <strong>Ubicación:</strong> {schedule.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerate(schedule)}
                      disabled={!schedule.is_active || generatingId === schedule.id}
                    >
                      {generatingId === schedule.id ? 'Generando...' : 'Generar Eventos'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      disabled={deletingId === schedule.id}
                    >
                      {deletingId === schedule.id ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <MassScheduleForm
          schedule={editingSchedule}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {showGenerateModal && editingSchedule && (
        <Modal
          title={`Generar Eventos: ${editingSchedule.title}`}
          onClose={() => {
            setShowGenerateModal(false)
            setEditingSchedule(null)
            setGenerateResult(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                Generar eventos para las próximas semanas:
              </label>
              <Input
                type="number"
                min="1"
                max="52"
                value={generateWeeks}
                onChange={(e) => setGenerateWeeks(parseInt(e.target.value, 10) || 4)}
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Se generarán eventos para cada {getWeekdayName(editingSchedule.weekday)} a las {formatTime(editingSchedule.time)} en las próximas {generateWeeks} semanas.
              </p>
            </div>

            {generateResult && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {generateResult}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateModal(false)
                  setEditingSchedule(null)
                  setGenerateResult(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateSubmit}
                disabled={generatingId === editingSchedule.id}
              >
                {generatingId === editingSchedule.id ? 'Generando...' : 'Generar Eventos'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
