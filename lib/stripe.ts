import Stripe from 'stripe'

/**
 * Inicialización perezosa del cliente Stripe.
 * Evita que `new Stripe(undefined)` reviente el módulo en build (Next.js
 * evalúa los módulos de las API routes durante "Collecting page data").
 */
let cachedStripe: Stripe | null = null

export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe

  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('Missing env.STRIPE_SECRET_KEY')
  }

  cachedStripe = new Stripe(apiKey, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  })
  return cachedStripe
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing env.STRIPE_WEBHOOK_SECRET')
  }
  return secret
}
