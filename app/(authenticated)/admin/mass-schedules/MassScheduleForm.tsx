'use client'

import { useState, useEffect } from 'react'
import {
  MassSchedule,
  MassScheduleInsert,
  MassScheduleUpdate,
  getWeekdayName,
  WEEKDAY_NAMES
} from '@/lib/supabase/mass-schedules'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface MassScheduleFormProps {
  schedule: MassSchedule | null
  onSubmit: (data: MassScheduleInsert | MassScheduleUpdate) => Promise<void>
  onCancel: () => void
}

export default function MassScheduleForm({
  schedule,
  onSubmit,
  onCancel
}: MassScheduleFormProps) {
  const [title, setTitle] = useState('')
  const [weekday, setWeekday] = useState(0)
  const [time, setTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title)
      setWeekday(schedule.weekday)
      setTime(schedule.time)
      setLocation(schedule.location || '')
      setIsActive(schedule.is_active)
    } else {
      setTitle('')
      setWeekday(0)
      setTime('10:00')
      setLocation('')
      setIsActive(true)
    }
    setError(null)
  }, [schedule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (schedule) {
        await onSubmit({
          title,
          weekday,
          time,
          location: location || null,
          is_active: isActive
        } as MassScheduleUpdate)
      } else {
        await onSubmit({
          title,
          weekday,
          time,
          location: location || null,
          is_active: isActive
        } as MassScheduleInsert)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el horario')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      title={schedule ? 'Editar Horario de Misa' : 'Crear Horario de Misa'}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Título *
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Misa Dominical, Misa de Semana"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Día de la Semana *
          </label>
          <Select
            value={weekday}
            onChange={(e) => setWeekday(parseInt(e.target.value, 10))}
            required
          >
            {WEEKDAY_NAMES.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Hora *
          </label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
            Ubicación
          </label>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Capilla Principal, Salón Parroquial"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-sm text-[var(--foreground)]">
            Horario activo (solo los horarios activos generan eventos)
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : schedule ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
