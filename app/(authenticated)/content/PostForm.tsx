'use client'

import { useState, useEffect, FormEvent } from 'react'
import { Post, PostInsert, PostUpdate } from '@/lib/supabase/posts'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface PostFormProps {
  post: Post | null
  onSubmit: (data: PostInsert | PostUpdate) => Promise<void>
  onCancel: () => void
}

export default function PostForm({ post, onSubmit, onCancel }: PostFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [published, setPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (post) {
      setTitle(post.title)
      setBody(post.body)
      setPublished(post.published)
    } else {
      setTitle('')
      setBody('')
      setPublished(false)
    }
  }, [post])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const data: PostInsert | PostUpdate = {
        title: title.trim(),
        body: body.trim(),
        published
      }
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la publicación')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={post ? 'Editar Publicación' : 'Crear Publicación'}
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
              placeholder="Ingresa el título de la publicación"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--card-foreground)]">
              Contenido *
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={8}
              placeholder="Escribe tu anuncio aquí..."
              className="font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
            />
            <label htmlFor="published" className="text-sm text-[var(--card-foreground)] cursor-pointer">
              Publicar inmediatamente
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
              {submitting ? 'Guardando...' : post ? 'Actualizar Publicación' : 'Crear Publicación'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

