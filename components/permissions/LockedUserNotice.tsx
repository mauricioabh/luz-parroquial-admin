'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

interface LockedUserNoticeProps {
  reason?: string
  className?: string
}

/**
 * Notice shown when a user's account is locked
 * Explains what it means and who to contact
 */
export function LockedUserNotice({ reason, className = '' }: LockedUserNoticeProps) {
  return (
    <Card className={`border-amber-200 bg-amber-50/50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg text-amber-900">Acceso a la Cuenta Restringido</CardTitle>
        <CardDescription className="text-amber-800">
          El acceso a tu cuenta ha sido restringido temporalmente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-amber-900">
          {reason && (
            <div className="p-3 bg-amber-100 rounded-lg border border-amber-200">
              <p className="font-medium mb-1">Razón:</p>
              <p className="text-amber-800">{reason}</p>
            </div>
          )}
          <p>
            Esta restricción suele ser temporal. Para restaurar el acceso, por favor contacta a tu administrador parroquial.
          </p>
          <div className="pt-2 border-t border-amber-200">
            <p className="font-medium mb-1">Qué significa esto:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>No puedes acceder al sistema hasta que tu cuenta sea desbloqueada</li>
              <li>Tus datos permanecen seguros</li>
              <li>Solo un administrador parroquial puede desbloquear tu cuenta</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-amber-200">
            <p className="font-medium mb-1">Próximos pasos:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Contacta a tu oficina parroquial para solicitar la restauración de tu cuenta</li>
              <li>Proporciona tu nombre y dirección de correo electrónico al contactarlos</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

