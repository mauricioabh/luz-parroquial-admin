'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../RoleGuard'
import { supabase } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500]

export default function OfferingsPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <OfferingsContent />
    </RoleGuard>
  )
}

function OfferingsContent() {
  const { profile } = useProfile()
  const [amount, setAmount] = useState<number | ''>('')
  const [customAmount, setCustomAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    if (value) {
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && numValue > 0) {
        setAmount(numValue)
      } else {
        setAmount('')
      }
    } else {
      setAmount('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!amount || amount <= 0) {
      setError('Por favor selecciona o ingresa un monto')
      return
    }

    setLoading(true)

    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No autenticado')
      }

      // Call the API to create checkout session
      const response = await fetch('/api/create-offering-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount,
          currency: 'USD',
          purpose: purpose.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la sesión de pago')
      }

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error('No se recibió la URL de pago')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la ofrenda')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--card-foreground)] mb-2">
          Hacer una Ofrenda
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Apoya a tu parroquia con una ofrenda digital. Tu contribución ayuda a sostener nuestra comunidad y misión.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monto de la Ofrenda</CardTitle>
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
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Purpose/Intention Note */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-[var(--card-foreground)] mb-2">
                Nota de Intención (Opcional)
              </label>
              <Textarea
                id="purpose"
                placeholder="e.g., For the intentions of..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Nota opcional para acompañar tu ofrenda
              </p>
            </div>

            {/* Selected Amount Display */}
            {amount && (
              <div className="p-4 bg-[var(--secondary)] rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[var(--card-foreground)]">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-[var(--card-foreground)]">
                    ${typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!amount || amount <= 0 || loading}
              className="w-full"
            >
              {loading ? 'Procesando...' : 'Continuar al Pago'}
            </Button>

            <p className="text-xs text-center text-[var(--muted-foreground)]">
              You will be redirected to Stripe Checkout to complete your payment securely.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

