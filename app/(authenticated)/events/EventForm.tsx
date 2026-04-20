'use client'

import { useState, useEffect, FormEvent } from 'react'
import { Event, EventInsert, EventUpdate } from '@/lib/supabase/events'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface EventFormProps {
  event: Event | null
  onSubmit: (data: EventInsert | EventUpdate) => Promise<void>
  onCancel: () => void
}

export default function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [location, setLocation] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [maxIntentions, setMaxIntentions] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
      const startDate = new Date(event.starts_at)
      const startLocal = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setStartsAt(startLocal)
      
      if (event.ends_at) {
        const endDate = new Date(event.ends_at)
        const endLocal = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        setEndsAt(endLocal)
      } else {
        setEndsAt('')
      }
      
      setLocation(event.location || '')
      setIsPublic(event.is_public)
      setMaxIntentions(event.max_intentions || 10)
    } else {
      // Set default start time to next hour
      const now = new Date()
      now.setHours(now.getHours() + 1, 0, 0, 0)
      const defaultStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setStartsAt(defaultStart)
      
      setTitle('')
      setDescription('')
      setEndsAt('')
      setLocation('')
      setIsPublic(true)
    }
  }, [event])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Convert local datetime to ISO string
      const startsAtISO = new Date(startsAt).toISOString()
      const endsAtISO = endsAt ? new Date(endsAt).toISOString() : null

      // Validate end time is after start time
      if (endsAtISO && new Date(endsAtISO) <= new Date(startsAtISO)) {
        setError('La hora de fin debe ser posterior a la hora de inicio')
        setSubmitting(false)
        return
      }

      const data: EventInsert | EventUpdate = {
        title: title.trim(),
        description: description.trim() || null,
        starts_at: startsAtISO,
        ends_at: endsAtISO,
        location: location.trim() || null,
        is_public: isPublic,
        max_intentions: maxIntentions
      }
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el evento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={event ? 'Editar Evento' : 'Crear Evento'}
      size="lg"
    >
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
              Título *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="ej., Misa Dominical, Reunión Parroquial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
              Descripción
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Descripción opcional del evento..."
              className="font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                Fecha y Hora de Inicio *
              </label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
                Fecha y Hora de Fin
              </label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={startsAt}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
              Ubicación
            </label>
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej., Capilla Principal, Salón Parroquial"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
            />
            <label htmlFor="isPublic" className="text-sm text-[var(--card-foreground)] cursor-pointer">
              Hacer este evento público (visible para feligreses)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
              Máximo de Intenciones de Misa
            </label>
            <Input
              type="number"
              value={maxIntentions}
              onChange={(e) => setMaxIntentions(parseInt(e.target.value) || 10)}
              min={1}
              required
              placeholder="10"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Número máximo de intenciones de misa permitidas para este evento (por defecto: 10)
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
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
              {submitting ? 'Guardando...' : event ? 'Actualizar Evento' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}



