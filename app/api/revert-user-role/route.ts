import { NextRequest, NextResponse } from 'next/server'
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
    const { role_history_id } = body

    if (!role_history_id) {
      return NextResponse.json(
        { error: 'Missing required field: role_history_id is required' },
        { status: 400 }
      )
    }

    // Call the RPC function to revert the role change
    // The RPC function will enforce all security checks
    const { data, error } = await supabase.rpc('revert_user_role', {
      p_role_history_id: role_history_id
    })

    if (error) {
      console.error('Error reverting user role:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to revert user role' },
        { status: 400 }
      )
    }

    if (!data || !data.success) {
      return NextResponse.json(
        { error: data?.error || 'Failed to revert user role' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role reverted successfully',
      reverted_to_role_id: data.reverted_to_role_id,
      reverted_from_role_id: data.reverted_from_role_id
    })

  } catch (error) {
    console.error('Error in revert-user-role route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

