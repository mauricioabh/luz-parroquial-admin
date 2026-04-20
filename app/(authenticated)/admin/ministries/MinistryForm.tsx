'use client'

import { useState, useEffect, FormEvent } from 'react'
import { Ministry, MinistryInsert, MinistryUpdate } from '@/lib/supabase/ministries'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface MinistryFormProps {
  ministry: Ministry | null
  onSubmit: (data: MinistryInsert | MinistryUpdate) => Promise<void>
  onCancel: () => void
}

export default function MinistryForm({ ministry, onSubmit, onCancel }: MinistryFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [is_public, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ministry) {
      setName(ministry.name)
      setDescription(ministry.description || '')
      setIsPublic(ministry.is_public)
    } else {
      setName('')
      setDescription('')
      setIsPublic(true)
    }
  }, [ministry])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const data: MinistryInsert | MinistryUpdate = {
        name: name.trim(),
        description: description.trim() || null,
        is_public: is_public,
      }
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el ministerio')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={ministry ? 'Editar Ministerio' : 'Crear Ministerio'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
            Nombre *
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ej., Coro, Grupo de Jóvenes, Monaguillos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
            Descripción
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe el propósito y las actividades de este ministerio..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            checked={is_public}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
          />
          <label htmlFor="is_public" className="ml-2 text-sm text-[var(--foreground)]">
            Público (los feligreses pueden descubrir y unirse)
          </label>
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
            {submitting ? 'Guardando...' : ministry ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

