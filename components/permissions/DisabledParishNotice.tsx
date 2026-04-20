'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

interface DisabledParishNoticeProps {
  className?: string
}

/**
 * Calm notice shown when a parish is disabled
 * Explains what happened and who to contact
 */
export function DisabledParishNotice({ className = '' }: DisabledParishNoticeProps) {
  return (
    <Card className={`border-amber-200 bg-amber-50/50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg text-amber-900">Acceso Parroquial Temporalmente No Disponible</CardTitle>
        <CardDescription className="text-amber-800">
          El acceso de tu parroquia al sistema ha sido restringido temporalmente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-amber-900">
          <p>
            Esto suele ser una medida temporal y el acceso será restaurado pronto. 
            Si tienes preguntas o necesitas ayuda, por favor contacta directamente a tu oficina parroquial.
          </p>
          <div className="pt-2 border-t border-amber-200">
            <p className="font-medium mb-1">Qué puedes hacer:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Contacta a tu oficina parroquial para más información</li>
              <li>Vuelve a verificar más tarde ya que el acceso puede ser restaurado pronto</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

