'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface ParishInfo {
  id: string
  name: string
  city: string
  diocese: string
  country: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [parish, setParish] = useState<ParishInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadParishInfo = async () => {
      if (!profile?.parish_id) return

      try {
        const { data: parishData, error: parishError } = await supabase
          .from('parishes')
          .select('id, name, city, diocese, country')
          .eq('id', profile.parish_id)
          .single()

        if (!parishError && parishData) {
          setParish(parishData)
        }
      } catch (err) {
        console.error('Error loading parish:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!profileLoading && profile) {
      // Redirect non-parishioners
      if (profile.role_name !== 'parishioner') {
        router.push('/')
        return
      }
      loadParishInfo()
    } else if (!profileLoading && !profile) {
      setLoading(false)
    }
  }, [profile, profileLoading, router])

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-[var(--muted-foreground)]">
              No se pudo cargar tu perfil. Por favor contacta a tu administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const parishSubtitle = parish
    ? [parish.city, parish.diocese].filter(Boolean).join(', ')
    : ''

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      {/* Parish Identity */}
      <div className="space-y-2 text-center pt-4 lg:pt-8">
        {parish && (
          <>
            <h1 className="text-4xl lg:text-5xl font-serif text-[var(--foreground)] tracking-tight">
              {parish.name}
            </h1>
            {parishSubtitle && (
              <p className="text-base text-[var(--muted-foreground)] font-sans">
                {parishSubtitle}
              </p>
            )}
          </>
        )}
      </div>

      {/* Primary Actions */}
      <div className="space-y-4">
        <Link href="/prayer" className="block w-full">
          <Card className="hover:shadow-md transition-all duration-300 cursor-pointer">
            <CardContent className="p-6 lg:p-8">
              <div className="space-y-2">
                <h2 className="text-xl font-serif text-[var(--foreground)]">
                  Enviar Intención de Oración
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Comparte tus intenciones de oración con la comunidad parroquial.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/mass-intentions" className="block w-full">
          <Card className="hover:shadow-md transition-all duration-300 cursor-pointer">
            <CardContent className="p-6 lg:p-8">
              <div className="space-y-2">
                <h2 className="text-xl font-serif text-[var(--foreground)]">
                  Solicitar Intención de Misa
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Solicita una intención de misa para una misa específica.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sacrament-request/status" className="block w-full">
          <Card className="hover:shadow-md transition-all duration-300 cursor-pointer">
            <CardContent className="p-6 lg:p-8">
              <div className="space-y-2">
                <h2 className="text-xl font-serif text-[var(--foreground)]">
                  Ver Sacramentos y Citas
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Rastrea tus solicitudes de sacramentos y ve tus citas.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
