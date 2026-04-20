'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from './RoleGuard'
import { ParishContext } from '@/components/ParishContext'
import { fetchInvitations } from '@/lib/supabase/invitations'
import { getSacramentRequestsForParish } from '@/lib/supabase/sacrament-requests'
import { getMassIntentionsFiltered } from '@/lib/supabase/mass-intentions'

interface DashboardStats {
  pendingInvitations: number
  pendingSacramentRequests: number
  upcomingMassIntentions: number
}

function DashboardContent() {
  const { profile } = useProfile()
  const [stats, setStats] = useState<DashboardStats>({
    pendingInvitations: 0,
    pendingSacramentRequests: 0,
    upcomingMassIntentions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      if (!profile) {
        setLoading(false)
        return
      }

      try {
        // Get today's date range for upcoming mass intentions (next 7 days)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)
        
        // Load all stats in parallel
        const [invitations, sacramentRequests, massIntentions] = await Promise.all([
          fetchInvitations(),
          getSacramentRequestsForParish(),
          getMassIntentionsFiltered({
            startDate: today.toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
            status: undefined, // Get all statuses
          }),
        ])

        // Calculate stats
        const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length
        const pendingSacramentRequests = sacramentRequests.filter(
          req => req.status === 'submitted' || req.status === 'in_review'
        ).length
        const upcomingMassIntentions = massIntentions.filter(intention => {
          const massDate = new Date(intention.mass_date)
          return massDate >= today
        }).length

        setStats({
          pendingInvitations,
          pendingSacramentRequests,
          upcomingMassIntentions,
        })
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando panel...</p>
        </div>
      </div>
    )
  }

  return (
    <ParishContext>
      <div className="space-y-12">
        {/* Welcome Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-serif text-[var(--foreground)] mb-2">
            Este es tu panel parroquial.
          </h1>
          <p className="text-[var(--muted-foreground)] text-lg leading-relaxed max-w-3xl">
            Desde aquí puedes gestionar los aspectos esenciales de tu parroquia. A continuación encontrarás acceso rápido a invitaciones, intenciones de misa, sacramentos y citas. Cada sección te ayuda a mantenerte organizado y responder a las necesidades de los feligreses.
          </p>
        </div>

        {/* Dashboard Sections Overview */}
        <div className="space-y-6 pb-6 border-b border-[var(--border)]">
          <h2 className="text-2xl font-serif text-[var(--foreground)]">
            Resumen del Panel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-serif text-[var(--foreground)]">
                Invitaciones
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Envía invitaciones para agregar nuevos usuarios a tu sistema parroquial. Rastrea invitaciones pendientes, aceptadas y expiradas. Puedes reenviar o revocar invitaciones según sea necesario.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-serif text-[var(--foreground)]">
                Intenciones de Misa
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Revisa y programa solicitudes de intenciones de misa de los feligreses. Actualiza el estado a medida que las intenciones progresan de solicitadas a programadas a cumplidas.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-serif text-[var(--foreground)]">
                Sacramentos
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Gestiona solicitudes de sacramentos como Bautismo, Primera Comunión, Confirmación y Matrimonio. Revisa solicitudes enviadas, documentos y actualiza el estado mientras las procesas.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-serif text-[var(--foreground)]">
                Citas
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Ve y gestiona solicitudes de citas de los feligreses. Programa citas y rastrea su estado a medida que se confirman, completan o cancelan.
              </p>
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-serif text-[var(--foreground)] mb-6">Elementos Pendientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/admin/invitations">
                <div className="border-b border-[var(--border)] pb-6 hover:border-[var(--primary)] transition-colors cursor-pointer">
                  <div className="text-4xl font-serif text-[var(--foreground)] mb-1">
                    {stats.pendingInvitations}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    Invitaciones Pendientes
                  </div>
                </div>
              </Link>
              <Link href="/admin/sacrament-requests">
                <div className="border-b border-[var(--border)] pb-6 hover:border-[var(--primary)] transition-colors cursor-pointer">
                  <div className="text-4xl font-serif text-[var(--foreground)] mb-1">
                    {stats.pendingSacramentRequests}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    Solicitudes de Sacramentos Pendientes
                  </div>
                </div>
              </Link>
              <Link href="/admin/mass-intentions">
                <div className="border-b border-[var(--border)] pb-6 hover:border-[var(--primary)] transition-colors cursor-pointer">
                  <div className="text-4xl font-serif text-[var(--foreground)] mb-1">
                    {stats.upcomingMassIntentions}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    Intenciones de Misa Próximas
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ParishContext>
  )
}


export default function Home() {
  return (
    <RoleGuard requireAdmin={true}>
      <DashboardContent />
    </RoleGuard>
  )
}
