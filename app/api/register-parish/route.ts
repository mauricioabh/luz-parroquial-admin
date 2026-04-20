import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, parish_name, diocese, city, country, privacy_policy_accepted, terms_accepted } = body

    // Validate required fields
    if (!email || !password || !full_name || !parish_name || !diocese || !city || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate consent
    if (!privacy_policy_accepted || !terms_accepted) {
      return NextResponse.json(
        { error: 'You must accept the Privacy Policy and Terms of Use to create an account' },
        { status: 400 }
      )
    }

    // Current consent version (update when policies change)
    const consentVersion = '1.0'

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (existingUser?.user) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for self-registration
      user_metadata: {
        full_name
      }
    })

    if (userError || !newUser?.user) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { error: userError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Get priest role ID
    const { data: priestRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'priest')
      .single()

    if (roleError || !priestRole) {
      // Clean up user if role not found
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Failed to find priest role' },
        { status: 500 }
      )
    }

    // Create parish
    const { data: parish, error: parishError } = await supabaseAdmin
      .from('parishes')
      .insert({
        name: parish_name,
        diocese,
        city,
        country,
        is_active: true
      })
      .select()
      .single()

    if (parishError || !parish) {
      // Clean up user if parish creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Failed to create parish: ' + (parishError?.message || 'Unknown error') },
        { status: 500 }
      )
    }

    // Create profile for the user as priest with consent tracking
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        parish_id: parish.id,
        role_id: priestRole.id,
        full_name: full_name,
        privacy_policy_accepted_at: new Date().toISOString(),
        terms_accepted_at: new Date().toISOString(),
        consent_version: consentVersion
      })

    if (profileError) {
      // Clean up user and parish if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      await supabaseAdmin.from('parishes').delete().eq('id', parish.id)
      return NextResponse.json(
        { error: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }

    // The onboarding record is automatically created by the trigger

    // Send welcome email (non-blocking)
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
    sendWelcomeEmail({
      to: email,
      fullName: full_name,
      parishName: parish_name,
      loginUrl
    }).catch(err => {
      console.error('Failed to send welcome email:', err)
      // Don't fail registration if email fails
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name
      },
      parish: {
        id: parish.id,
        name: parish.name
      }
    })
  } catch (error) {
    console.error('Error in register-parish API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

