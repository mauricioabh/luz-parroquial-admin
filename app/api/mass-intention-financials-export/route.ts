import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const offeringStatus = searchParams.get('offering_status')

    // Build query
    let query = supabase
      .from('mass_intention_financials')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (fromDate) {
      query = query.gte('mass_date', fromDate)
    }

    if (toDate) {
      query = query.lte('mass_date', toDate)
    }

    if (offeringStatus) {
      query = query.eq('offering_status', offeringStatus)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Generate CSV
    const headers = [
      'Mass Intention ID',
      'Parish ID',
      'Event ID',
      'Mass Date',
      'Offering Amount (cents)',
      'Offering Status',
      'Payment Method',
      'Created At'
    ]

    const rows = (data || []).map(row => [
      row.mass_intention_id,
      row.parish_id,
      row.event_id || '',
      row.mass_date || '',
      row.offering_amount?.toString() || '0',
      row.offering_status || '',
      row.payment_method || '',
      row.created_at
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="mass-intention-financials-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
