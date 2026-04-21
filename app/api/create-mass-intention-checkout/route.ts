import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
})

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify the token by creating a client with the user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    // Verify the user's identity
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { intention_id } = body

    if (!intention_id) {
      return NextResponse.json(
        { error: 'Mass intention ID is required' },
        { status: 400 }
      )
    }

    // Get the user's profile to get parish_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('parish_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get parish with Stripe configuration
    const { data: parish, error: parishError } = await supabaseAdmin
      .from('parishes')
      .select('id, name, stripe_account_id, stripe_enabled')
      .eq('id', profile.parish_id)
      .single()

    if (parishError || !parish) {
      return NextResponse.json(
        { error: 'Parish not found' },
        { status: 404 }
      )
    }

    if (!parish.stripe_enabled) {
      return NextResponse.json(
        { error: 'Stripe payments are not enabled for this parish' },
        { status: 400 }
      )
    }

    // Call RPC function to create payment record and validate intention
    const { data: paymentData, error: paymentError } = await supabase.rpc(
      'create_mass_intention_payment',
      { p_intention_id: intention_id }
    )

    if (paymentError) {
      return NextResponse.json(
        { error: paymentError.message || 'Failed to create payment record' },
        { status: 400 }
      )
    }

    if (!paymentData || !paymentData.success) {
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    const paymentId = paymentData.payment_id
    const amount = paymentData.amount

    // Get mass intention details for product description
    const { data: intention, error: intentionError } = await supabaseAdmin
      .from('mass_intentions')
      .select('intention, mass_date, mass_time')
      .eq('id', intention_id)
      .single()

    if (intentionError || !intention) {
      return NextResponse.json(
        { error: 'Mass intention not found' },
        { status: 404 }
      )
    }

    // Format intention text for product description (truncate if too long)
    const intentionText = intention.intention.length > 100
      ? intention.intention.substring(0, 100) + '...'
      : intention.intention

    // Create Stripe Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn', // Mexican Pesos
            product_data: {
              name: `Estipendio de Intención de Misa`,
              description: intentionText,
            },
            unit_amount: amount, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/mass-intentions/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/mass-intentions/payment/cancel`,
      metadata: {
        user_id: user.id,
        parish_id: parish.id,
        mass_intention_id: intention_id,
        payment_id: paymentId,
      },
    }

    // If Stripe Connect is configured, route funds directly to the parish account
    if (parish.stripe_account_id) {
      sessionParams.payment_intent_data = {
        transfer_data: {
          destination: parish.stripe_account_id,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Update stripe_payment record with session_id
    const { error: updateError } = await supabaseAdmin
      .from('stripe_payments')
      .update({
        stripe_session_id: session.id,
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error updating stripe_payment with session_id:', updateError)
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
      payment_id: paymentId,
    })
  } catch (error) {
    console.error('Error in create-mass-intention-checkout API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
