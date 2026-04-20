import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

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

    // Get the user's profile to verify admin role
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

    // Extract role name
    const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles
    const roleName = role?.name

    // Verify the user is an admin (priest, secretary, or editor)
    if (!roleName || !['priest', 'secretary', 'editor'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Only admin roles can download Mass PDFs' },
        { status: 403 }
      )
    }

    // Get event_id from query parameters
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required parameter: event_id' },
        { status: 400 }
      )
    }

    // Fetch event, parish, and mass intentions
    const [eventResult, intentionsResult] = await Promise.all([
      supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single(),
      supabaseAdmin
        .from('mass_intentions')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
    ])

    if (eventResult.error || !eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const event = eventResult.data

    // Verify parish boundary
    if (event.parish_id !== profile.parish_id) {
      return NextResponse.json(
        { error: 'You do not have access to this event' },
        { status: 403 }
      )
    }

    // Fetch parish information
    const { data: parish, error: parishError } = await supabaseAdmin
      .from('parishes')
      .select('name, city, diocese')
      .eq('id', event.parish_id)
      .single()

    if (parishError || !parish) {
      return NextResponse.json(
        { error: 'Parish not found' },
        { status: 404 }
      )
    }

    const intentions = (intentionsResult.data || []).map((intention: any) => ({
      ...intention,
      user_name: (intention.profiles as any)?.full_name || null
    }))

    // Generate PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 60, right: 60 }
    })

    // Collect PDF chunks into a buffer
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    
    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      // Header - Parish name
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(parish.name, { align: 'center' })
        .moveDown(0.5)

      // Diocese and location
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`${parish.diocese} - ${parish.city}`, { align: 'center' })
        .moveDown(1)

      // Divider line
      doc
        .strokeColor('#CCCCCC')
        .lineWidth(1)
        .moveTo(60, doc.y)
        .lineTo(552, doc.y)
        .stroke()
        .moveDown(1.5)

      // Mass title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(event.title, { align: 'center' })
        .moveDown(0.8)

      // Mass date and time
      const massDate = new Date(event.starts_at)
      const formattedDate = massDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const formattedTime = massDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#333333')
        .text(formattedDate, { align: 'center' })
        .moveDown(0.3)
        .text(`at ${formattedTime}`, { align: 'center' })
        .moveDown(1)

      // Location if available
      if (event.location) {
        doc
          .fontSize(12)
          .fillColor('#666666')
          .text(`Location: ${event.location}`, { align: 'center' })
          .moveDown(1.5)
      } else {
        doc.moveDown(1)
      }

      // Divider line
      doc
        .strokeColor('#CCCCCC')
        .lineWidth(1)
        .moveTo(60, doc.y)
        .lineTo(552, doc.y)
        .stroke()
        .moveDown(1.5)

      // Mass Intentions section
      if (intentions.length === 0) {
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#666666')
          .text('No intentions for this Mass', { align: 'center' })
      } else {
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Mass Intentions', { align: 'center' })
          .moveDown(1)

        // List intentions
        intentions.forEach((intention, index) => {
          // Don't add page break for first item
          if (index > 0) {
            doc.moveDown(0.8)
          }

          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage()
          }

          // Intention text
          doc
            .fontSize(13)
            .font('Helvetica')
            .fillColor('#000000')
            .text(intention.intention, {
              align: 'left',
              indent: 20,
              continued: false
            })
            .moveDown(0.3)

          // Requested by (if available)
          if (intention.user_name) {
            doc
              .fontSize(10)
              .font('Helvetica-Oblique')
              .fillColor('#666666')
              .text(`— Requested by ${intention.user_name}`, {
                indent: 40
              })
              .moveDown(0.5)
          }

          // Optional offering amount (if provided)
          if (intention.offering_amount && intention.offering_amount > 0) {
            const offeringDollars = (intention.offering_amount / 100).toFixed(2)
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor('#666666')
              .text(`Offering: $${offeringDollars}`, {
                indent: 40
              })
              .moveDown(0.5)
          }

          // Add subtle separator line (except for last item)
          if (index < intentions.length - 1) {
            doc
              .strokeColor('#E5E5E5')
              .lineWidth(0.5)
              .moveTo(80, doc.y + 5)
              .lineTo(532, doc.y + 5)
              .stroke()
          }
        })
      }

      // Add generation date at the end
      doc.moveDown(1.5)
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#999999')
        .text(
          `Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          { align: 'center' }
        )

      doc.end()
    })

    // Combine all chunks into a single buffer
    const pdfBuffer = Buffer.concat(chunks)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mass-${eventId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
