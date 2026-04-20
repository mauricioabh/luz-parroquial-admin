'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface ParishData {
  id: string
  name: string
  diocese: string
  city: string
  country: string
  is_active: boolean
}

export default function AdminSettingsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <AdminSettingsContent />
    </RoleGuard>
  )
}

function AdminSettingsContent() {
  const { profile } = useProfile()
  const [parish, setParish] = useState<ParishData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    diocese: '',
    city: '',
    country: ''
  })

  useEffect(() => {
    const loadParish = async () => {
      if (!profile?.parish_id) return

      try {
        const { data, error: fetchError } = await supabase
          .from('parishes')
          .select('*')
          .eq('id', profile.parish_id)
          .single()

        if (fetchError) throw fetchError

        if (data) {
          setParish(data)
          setFormData({
            name: data.name || '',
            diocese: data.diocese || '',
            city: data.city || '',
            country: data.country || ''
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la información de la parroquia')
      } finally {
        setLoading(false)
      }
    }

    loadParish()
  }, [profile])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!parish) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('parishes')
        .update({
          name: formData.name.trim(),
          diocese: formData.diocese.trim(),
          city: formData.city.trim(),
          country: formData.country.trim()
        })
        .eq('id', parish.id)

      if (updateError) throw updateError

      setSuccess('¡Información parroquial actualizada exitosamente!')
      setParish({ ...parish, ...formData })
      
      // Refresh onboarding status (trigger will auto-update)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la información de la parroquia')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando información de la parroquia...</p>
        </div>
      </div>
    )
  }

  if (!parish) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)]">
              Información de la parroquia no encontrada. Por favor contacta al soporte.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Configuración de la Parroquia</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Actualiza la información de tu parroquia
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información de la Parroquia</CardTitle>
          <CardDescription>
            Completa todos los campos para terminar este paso de configuración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Nombre de la Parroquia *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="ej., Parroquia de Santa María"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Ciudad *
                </label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  placeholder="Ciudad"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  País *
                </label>
                <Input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  placeholder="País"
                />
              </div>
            </div>

            <div>
              <label htmlFor="diocese" className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Diócesis *
              </label>
              <Input
                id="diocese"
                type="text"
                value={formData.diocese}
                onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                required
                placeholder="ej., Arquidiócesis de Nueva York"
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>💡 Consejo:</strong> Asegúrate de que todos los campos estén completos. 
                Una vez guardado, este paso se marcará como completo en tu lista de configuración.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

