import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendDemoInviteEmail, sendFollowUpEmail } from '@/lib/email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

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

    // Get the user's profile to verify admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        role_id,
        roles:role_id (
          name
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Extract role name
    const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles
    const roleName = role?.name

    // Verify the user is an admin
    if (!roleName || !['priest', 'secretary', 'editor'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Only admin roles can send lead emails' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { emailType, leadId, customMessage } = body

    if (!emailType || !leadId) {
      return NextResponse.json(
        { error: 'Missing required fields: emailType and leadId are required' },
        { status: 400 }
      )
    }

    // Validate email type
    if (!['demo_invite', 'follow_up'].includes(emailType)) {
      return NextResponse.json(
        { error: 'Invalid email type. Must be "demo_invite" or "follow_up"' },
        { status: 400 }
      )
    }

    // Get lead information
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Construct URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luzparroquial.com'
    const demoUrl = `${appUrl}/register-parish?lead_id=${leadId}`
    const pricingUrl = `${appUrl}/pricing`
    const featuresUrl = `${appUrl}/features`

    // Send email based on type
    try {
      if (emailType === 'demo_invite') {
        await sendDemoInviteEmail({
          to: lead.contact_email,
          contact_name: lead.parish_name.split(' ')[0], // Use first word as name
          parish_name: lead.parish_name,
          diocese: lead.diocese,
          demo_url: demoUrl
        })

        // Update lead status to 'demoed' if it's still 'contacted'
        if (lead.status === 'contacted') {
          await supabaseAdmin
            .from('leads')
            .update({ status: 'demoed' })
            .eq('id', leadId)
        }
      } else if (emailType === 'follow_up') {
        await sendFollowUpEmail({
          to: lead.contact_email,
          contact_name: lead.parish_name.split(' ')[0],
          parish_name: lead.parish_name,
          follow_up_message: customMessage || `I wanted to follow up on our conversation about Luz Parroquial for ${lead.parish_name}.`,
          demo_url: demoUrl,
          pricing_url: pricingUrl,
          features_url: featuresUrl,
          sender_name: 'The Luz Parroquial Team'
        })
      }

      return NextResponse.json({
        success: true,
        message: `${emailType === 'demo_invite' ? 'Demo invite' : 'Follow-up'} email sent successfully`
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json(
        { error: emailError instanceof Error ? emailError.message : 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in send-lead-email API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

