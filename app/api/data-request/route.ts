import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, request_type, description } = body

    // Validate required fields
    if (!email || !request_type) {
      return NextResponse.json(
        { error: 'Email and request type are required' },
        { status: 400 }
      )
    }

    // Validate request type
    const validRequestTypes = ['access', 'deletion', 'correction', 'portability', 'objection']
    if (!validRequestTypes.includes(request_type)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      )
    }

    // Try to get the authenticated user if available
    // Data requests work for both authenticated and unauthenticated users (GDPR compliance)
    // Note: Email-only requests are valid for GDPR compliance
    let userId: string | null = null
    
    // Optional: Try to match email to existing user profile
    // This is helpful but not required - email-only requests are valid
    try {
      // Get user by email from auth
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const matchingUser = users?.find(u => u.email === email)
      
      if (matchingUser) {
        // Verify the user's profile exists and is not deleted
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', matchingUser.id)
          .is('deleted_at', null)
          .single()
        
        if (profile) {
          userId = profile.id
        }
      }
    } catch (error) {
      // No matching user found - continue with email-only request
      // This is fine for GDPR compliance - email-only requests are valid
    }

    // Create data request
    const { data: dataRequest, error: insertError } = await supabaseAdmin
      .from('data_requests')
      .insert({
        user_id: userId,
        email: email,
        request_type: request_type,
        description: description || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError || !dataRequest) {
      console.error('Error creating data request:', insertError)
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create data request' },
        { status: 500 }
      )
    }

    // TODO: Send notification email to admins about the new data request
    // This can be implemented via Edge Function or email service

    return NextResponse.json({
      success: true,
      data_request: {
        id: dataRequest.id,
        request_type: dataRequest.request_type,
        status: dataRequest.status,
        created_at: dataRequest.created_at
      },
      message: 'Your data request has been submitted successfully. We will process it within 30 days as required by law.'
    })
  } catch (error) {
    console.error('Error in data-request API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

