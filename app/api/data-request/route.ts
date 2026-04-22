import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const emailRaw = body.email
    const { request_type, description } = body
    const email = typeof emailRaw === 'string' ? emailRaw.trim() : ''

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
      const { data: userResult } = await (
        supabaseAdmin.auth.admin as unknown as {
          getUserByEmail: (e: string) => Promise<{
            data: { user: { id: string } | null } | null
            error: unknown
          }>
        }
      ).getUserByEmail(email)

      const matchingUser = userResult?.user
      if (matchingUser) {
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
    } catch {
      // Email-only request is still valid without a matching auth user
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

    const notifyTo = process.env.DATA_REQUEST_NOTIFY_EMAIL?.trim()
    if (notifyTo) {
      const esc = (s: string) =>
        s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      const safeDesc =
        description && typeof description === 'string'
          ? esc(description.slice(0, 2000))
          : '(sin detalles adicionales)'
      const html = `
        <p>Nueva solicitud de protección de datos — <strong>Luz Parroquial</strong></p>
        <ul>
          <li><strong>ID:</strong> ${esc(dataRequest.id)}</li>
          <li><strong>Correo del solicitante:</strong> ${esc(email)}</li>
          <li><strong>Tipo:</strong> ${esc(String(request_type))}</li>
          <li><strong>Usuario vinculado (profile):</strong> ${userId ? esc(userId) : 'no encontrado / solo correo'}</li>
        </ul>
        <p><strong>Detalles:</strong></p>
        <p>${safeDesc}</p>
      `
      const sent = await emailService.sendEmail({
        to: notifyTo,
        subject: `[Luz Parroquial] Solicitud de datos: ${request_type} (${dataRequest.id.slice(0, 8)}…)`,
        html,
      })
      if (!sent.success) {
        console.error('data-request: admin notify email failed', sent.error)
      }
    }

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

