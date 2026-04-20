'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import {
  getParishPosts,
  createPost,
  updatePost,
  publishPost,
  deletePost,
  Post,
  PostInsert,
  PostUpdate
} from '@/lib/supabase/posts'
import PostForm from './PostForm'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function ContentPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <ContentContent />
    </RoleGuard>
  )
}

function ContentContent() {
  const { profile } = useProfile()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const loadPosts = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parishPosts = await getParishPosts(profile.parish_id)
      setPosts(parishPosts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar las publicaciones'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [profile])

  const handleCreate = () => {
    setEditingPost(null)
    setShowForm(true)
  }

  const handleEdit = (post: Post) => {
    setEditingPost(post)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) {
      return
    }

    setDeletingId(id)
    try {
      await deletePost(id)
      await loadPosts()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al eliminar la publicación'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublish = async (post: Post) => {
    setPublishingId(post.id)
    try {
      await publishPost(post.id, !post.published)
      await loadPosts()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al actualizar la publicación'))
    } finally {
      setPublishingId(null)
    }
  }

  const handleFormSubmit = async (data: PostInsert | PostUpdate) => {
    if (!profile) return

    try {
      if (editingPost) {
        await updatePost(editingPost.id, data as PostUpdate)
      } else {
        await createPost({ ...data, parish_id: profile.parish_id } as PostInsert)
      }
      setShowForm(false)
      setEditingPost(null)
      await loadPosts()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Error al ${editingPost ? 'actualizar' : 'crear'} la publicación`))
      throw err
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingPost(null)
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 text-[var(--foreground)]">
            Anuncios
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Crea y gestiona anuncios parroquiales
          </p>
        </div>
        <Button onClick={handleCreate}>
          + Crear Publicación
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando publicaciones...</p>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">
              Aún no hay publicaciones. Crea tu primer anuncio para comenzar.
            </p>
            <Button onClick={handleCreate}>
              Crear Primera Publicación
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                      {post.published ? (
                        <Badge variant="success">Publicado</Badge>
                      ) : (
                        <Badge variant="warning">Borrador</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(post)}
                      disabled={publishingId === post.id}
                    >
                      {publishingId === post.id
                        ? '...'
                        : post.published
                        ? 'Despublicar'
                        : 'Publicar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(post)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                    >
                      {deletingId === post.id ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-[var(--card-foreground)] whitespace-pre-wrap leading-relaxed">
                    {post.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <PostForm
          post={editingPost}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}
