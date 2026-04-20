import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Update offering status to completed
      const { error } = await supabaseAdmin
        .from('offerings')
        .update({
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent as string || null,
        })
        .eq('stripe_checkout_session_id', session.id)

      if (error) {
        console.error('Error updating offering status:', error)
        // Don't fail the webhook, but log the error
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Update offering status to failed
      const { error } = await supabaseAdmin
        .from('offerings')
        .update({
          status: 'failed',
        })
        .eq('stripe_checkout_session_id', session.id)

      if (error) {
        console.error('Error updating offering status to failed:', error)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing for webhook route
// Next.js App Router automatically parses the body, but we need raw body for webhook signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

