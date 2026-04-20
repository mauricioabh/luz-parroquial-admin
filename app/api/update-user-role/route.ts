import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

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

    // Parse request body
    const body = await request.json()
    const { user_id, role_id } = body

    if (!user_id || !role_id) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id and role_id are required' },
        { status: 400 }
      )
    }

    // Validate that the role exists
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

    // Call the RPC function to update the user role
    // The RPC function will enforce all security checks
    const { data, error } = await supabase.rpc('update_user_role', {
      p_user_id: user_id,
      p_new_role_id: role_id
    })

    if (error) {
      console.error('Error updating user role:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update user role' },
        { status: 400 }
      )
    }

    if (!data || !data.success) {
      return NextResponse.json(
        { error: data?.error || 'Failed to update user role' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Role updated successfully',
      old_role_name: data.old_role_name,
      new_role_name: data.new_role_name
    })

  } catch (error) {
    console.error('Error in update-user-role route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

