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

    if (!parish.stripe_enabled || !parish.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe is not configured for this parish' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { amount, currency = 'USD', purpose } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Create Stripe Checkout Session
    // Note: For Stripe Connect, you would configure the account_id here
    // For now, using standard checkout. The parish can configure their Stripe account
    // in settings and we can route funds via Connect in a future update.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Offering to ${parish.name}`,
              description: purpose || 'Parish offering',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/offerings/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/offerings/cancel`,
      metadata: {
        user_id: user.id,
        parish_id: parish.id,
        purpose: purpose || '',
      },
    }

    // If Stripe Connect is configured, route funds directly to the parish account
    // This uses Stripe Connect to transfer funds directly to the parish's Stripe account
    if (parish.stripe_account_id) {
      sessionParams.payment_intent_data = {
        transfer_data: {
          destination: parish.stripe_account_id,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Create pending offering record
    const { error: offeringError } = await supabaseAdmin
      .from('offerings')
      .insert({
        parish_id: parish.id,
        user_id: user.id,
        amount: amount,
        currency: currency,
        purpose: purpose || null,
        stripe_checkout_session_id: session.id,
        status: 'pending',
      })

    if (offeringError) {
      console.error('Error creating offering record:', offeringError)
      // Still return the session URL, but log the error
    }

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (error) {
    console.error('Error in create-offering-checkout API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

