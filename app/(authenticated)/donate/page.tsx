'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import { createDonation, type DonationPurpose } from '@/lib/supabase/donations'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500] // in dollars

export default function DonatePage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <DonateContent />
    </RoleGuard>
  )
}

function DonateContent() {
  const { profile } = useProfile()
  const router = useRouter()
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [purpose, setPurpose] = useState<DonationPurpose>('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setAmount(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Determine amount in dollars
    let amountInDollars: number
    if (amount !== null) {
      amountInDollars = amount
    } else if (customAmount) {
      const parsed = parseFloat(customAmount)
      if (isNaN(parsed) || parsed <= 0) {
        setError('Por favor ingresa un monto válido')
        return
      }
      amountInDollars = parsed
    } else {
      setError('Por favor selecciona o ingresa un monto')
      return
    }

    // Convert to cents
    const amountInCents = Math.round(amountInDollars * 100)

    setLoading(true)
    try {
      await createDonation({
        amount: amountInCents,
        purpose
      })

      // Show success message and redirect
      router.push('/donate/success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la donación')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--card-foreground)] mb-2">
          Hacer una Donación
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Tu contribución voluntaria apoya a nuestra comunidad parroquial. <strong>Las donaciones son completamente opcionales</strong> y muy apreciadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monto de la Donación</CardTitle>
          <CardDescription>
            Selecciona un monto preestablecido o ingresa un monto personalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preset Amounts */}
            <div>
              <label className="block text-sm font-medium text-[var(--card-foreground)] mb-3">
                Selección Rápida
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_AMOUNTS.map((presetAmount) => (
                  <Button
                    key={presetAmount}
                    type="button"
                    variant={amount === presetAmount ? 'primary' : 'outline'}
                    onClick={() => handlePresetClick(presetAmount)}
                    className="w-full"
                  >
                    ${presetAmount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label htmlFor="customAmount" className="block text-sm font-medium text-[var(--card-foreground)] mb-2">
                O Ingresa un Monto Personalizado
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">$</span>
                <Input
                  id="customAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>

            {/* Purpose Selection */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-[var(--card-foreground)] mb-2">
                Propósito (Opcional)
              </label>
              <select
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as DonationPurpose)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="general">Donación General</option>
                <option value="mass_intention">Intención de Misa</option>
                <option value="charity">Caridad</option>
              </select>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Selecciona cómo te gustaría que se use tu donación
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (!amount && !customAmount)}
              className="w-full"
            >
              {loading ? 'Procesando...' : 'Completar Donación'}
            </Button>

            <p className="text-xs text-center text-[var(--muted-foreground)]">
              Tu donación se procesará inmediatamente. ¡Gracias por tu generosidad!
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


