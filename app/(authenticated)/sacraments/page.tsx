'use client'

import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export default function SacramentsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <SacramentsContent />
    </RoleGuard>
  )
}

function SacramentsContent() {
  const { profile } = useProfile()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
          Sacramentos
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Gestiona registros y solicitudes de sacramentos
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Sacramentos</CardTitle>
            <CardDescription>
              Revisa y gestiona solicitudes de los feligreses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/sacrament-requests">
              <Button variant="primary" className="w-full">
                Ver Solicitudes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registros de Sacramentos</CardTitle>
            <CardDescription>
              Registros históricos de sacramentos completados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">
              Próximamente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

