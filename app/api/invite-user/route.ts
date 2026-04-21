import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminInvitationEmail } from '@/lib/email'

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

    // Get the user's profile to verify admin role and get parish_id using service role
    // Join with roles table to check role name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        role_id,
        parish_id,
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

    // Extract role name from nested roles object
    const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles
    const roleName = role?.name

    // Verify the user is an admin (priest, secretary, or editor)
    if (!roleName || !['priest', 'secretary', 'editor'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Only admin roles can invite users' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { email, role_id, full_name } = body

    if (!email || !role_id || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role_id, and full_name are required' },
        { status: 400 }
      )
    }

    // Validate that the role exists in the roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .eq('id', role_id)
      .single()

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: 'Invalid role_id. Role does not exist.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await (supabaseAdmin.auth.admin as unknown as {
      getUserByEmail: (email: string) => Promise<{ data: { user: { id: string } | null } | null; error: unknown }>
    }).getUserByEmail(email)
    if (existingUser?.user) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user with invite
    const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name
        }
      }
    )

    if (inviteError || !newUser?.user) {
      console.error('Error inviting user:', inviteError)
      return NextResponse.json(
        { error: inviteError?.message || 'Failed to invite user' },
        { status: 500 }
      )
    }

    // Create profile linked to the current user's parish
    const { error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        parish_id: profile.parish_id,
        role_id: role_id,
        full_name: full_name
      })

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError)
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Failed to create profile: ' + profileCreateError.message },
        { status: 500 }
      )
    }

    // Get parish name for email
    const { data: parishData } = await supabaseAdmin
      .from('parishes')
      .select('name')
      .eq('id', profile.parish_id)
      .single()

    // Get inviter name
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Send invitation email (non-blocking)
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite`
    sendAdminInvitationEmail({
      to: email,
      inviterName: inviterProfile?.full_name || 'A parish administrator',
      parishName: parishData?.name || 'your parish',
      role: roleData.name,
      invitationUrl
    }).catch(err => {
      console.error('Failed to send invitation email:', err)
      // Don't fail invitation if email fails
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role_id: role_id,
        role_name: roleData.name,
        parish_id: profile.parish_id
      }
    })
  } catch (error) {
    console.error('Error in invite-user API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

