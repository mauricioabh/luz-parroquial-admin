import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const BUCKET_NAME = 'receipts'

/**
 * Generate and store a receipt PDF for a Mass intention
 * 
 * GET /api/mass-intention-receipt?intention_id=xxx&action=generate
 *   - Generates receipt PDF and stores it in Supabase Storage
 *   - Returns receipt path and signed URL
 * 
 * GET /api/mass-intention-receipt?intention_id=xxx&action=download
 *   - Returns existing receipt PDF as download
 *   - Generates receipt if it doesn't exist
 */
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

    // Get the user's profile to verify role and parish
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const intentionId = searchParams.get('intention_id')
    const action = searchParams.get('action') || 'generate' // 'generate' or 'download'

    if (!intentionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: intention_id' },
        { status: 400 }
      )
    }

    // Fetch mass intention with related data
    const { data: intention, error: intentionError } = await supabaseAdmin
      .from('mass_intentions')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name
        ),
        events:event_id (
          id,
          title,
          starts_at,
          location
        )
      `)
      .eq('id', intentionId)
      .single()

    if (intentionError || !intention) {
      return NextResponse.json(
        { error: 'Mass intention not found' },
        { status: 404 }
      )
    }

    const intentionData = intention as any
    const userProfile = Array.isArray(intentionData.profiles) 
      ? intentionData.profiles[0] 
      : intentionData.profiles
    const event = intentionData.events ? (
      Array.isArray(intentionData.events) 
        ? intentionData.events[0] 
        : intentionData.events
    ) : null

    // Verify parish boundary
    if (intentionData.parish_id !== profile.parish_id) {
      return NextResponse.json(
        { error: 'You do not have access to this mass intention' },
        { status: 403 }
      )
    }

    // Security checks based on role
    const isAdmin = roleName && ['priest', 'secretary', 'editor'].includes(roleName)
    const isParishioner = roleName === 'parishioner'
    const isOwner = intentionData.user_id === user.id

    // Only priest/secretary can generate receipts
    if (action === 'generate' && (!roleName || !['priest', 'secretary'].includes(roleName))) {
      return NextResponse.json(
        { error: 'Only priests and secretaries can generate receipts' },
        { status: 403 }
      )
    }

    // Parishioners can only download their own receipts
    if (action === 'download' && isParishioner && !isOwner) {
      return NextResponse.json(
        { error: 'You can only download your own receipts' },
        { status: 403 }
      )
    }

    // Check if receipt already exists
    const receiptPath = generateReceiptPath(intentionData.parish_id, intentionId)
    const { data: existingFile } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(receiptPath.split('/').slice(0, -1).join('/'), {
        search: `${intentionId}.pdf`
      })

    const receiptExists = existingFile && existingFile.length > 0

    // If downloading and receipt exists, return signed URL
    if (action === 'download' && receiptExists) {
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(receiptPath, 3600) // 1 hour expiration

      if (signedUrlError) {
        return NextResponse.json(
          { error: 'Failed to generate download URL' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        receipt_path: receiptPath,
        signed_url: signedUrlData.signedUrl,
        expires_in: 3600
      })
    }

    // Generate receipt PDF
    const pdfBuffer = await generateReceiptPDF({
      intention: intentionData,
      userProfile,
      event,
      parishId: intentionData.parish_id
    })

    // Upload PDF to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(receiptPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true // Allow overwriting existing receipts
      })

    if (uploadError) {
      console.error('Error uploading receipt:', uploadError)
      return NextResponse.json(
        { error: 'Failed to store receipt' },
        { status: 500 }
      )
    }

    // Generate signed URL for download
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(receiptPath, 3600) // 1 hour expiration

    if (signedUrlError) {
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    // Return receipt info
    if (action === 'download') {
      // Return PDF directly for download
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="receipt-${intentionId}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })
    }

    // Return receipt metadata
    return NextResponse.json({
      success: true,
      receipt_path: receiptPath,
      signed_url: signedUrlData.signedUrl,
      expires_in: 3600,
      message: receiptExists ? 'Receipt regenerated successfully' : 'Receipt generated successfully'
    })
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    )
  }
}

/**
 * Generate receipt path in storage
 * Format: {parish_id}/{year}/{month}/{receipt_id}.pdf
 */
function generateReceiptPath(parishId: string, intentionId: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${parishId}/${year}/${month}/${intentionId}.pdf`
}

/**
 * Generate receipt PDF
 */
async function generateReceiptPDF(data: {
  intention: any
  userProfile: any
  event: any
  parishId: string
}): Promise<Buffer> {
  const { intention, userProfile, event, parishId } = data

  // Fetch parish information
  const { data: parish, error: parishError } = await supabaseAdmin
    .from('parishes')
    .select('name, diocese, city, country')
    .eq('id', parishId)
    .single()

  if (parishError || !parish) {
    throw new Error('Parish not found')
  }

  // Get payment information
  let paymentMethod = 'N/A'
  let paymentDate: Date | null = null

  if (intention.offering_status === 'paid_stripe') {
    // Fetch Stripe payment info
    const { data: stripePayment } = await supabaseAdmin
      .from('stripe_payments')
      .select('created_at, stripe_payment_intent_id')
      .eq('mass_intention_id', intention.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (stripePayment) {
      paymentMethod = 'Online Payment (Stripe)'
      paymentDate = new Date(stripePayment.created_at)
    }
  } else if (intention.offering_status === 'paid_cash') {
    paymentMethod = 'Cash'
    paymentDate = intention.updated_at ? new Date(intention.updated_at) : new Date(intention.created_at)
  } else if (intention.offering_status === 'paid_transfer') {
    paymentMethod = 'Bank Transfer'
    paymentDate = intention.updated_at ? new Date(intention.updated_at) : new Date(intention.created_at)
  }

  // Determine Mass date/time
  let massDate: Date | null = null
  let massTime: string | null = null
  let massTitle: string | null = null

  if (event) {
    massDate = new Date(event.starts_at)
    massTitle = event.title
  } else if (intention.mass_date && intention.mass_time) {
    massDate = new Date(intention.mass_date)
    massTime = intention.mass_time
  }

  // Generate PDF
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 60, right: 60 }
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))

  await new Promise<void>((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)

    // Header - Official Receipt
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('OFFICIAL RECEIPT', { align: 'center' })
      .moveDown(1)

    // Parish Information
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(parish.name, { align: 'center' })
      .moveDown(0.3)

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`${parish.diocese}`, { align: 'center' })
      .moveDown(0.2)

    doc
      .fontSize(11)
      .text(`${parish.city}, ${parish.country}`, { align: 'center' })
      .moveDown(1)

    // Divider line
    doc
      .strokeColor('#CCCCCC')
      .lineWidth(1)
      .moveTo(60, doc.y)
      .lineTo(552, doc.y)
      .stroke()
      .moveDown(1.5)

    // Receipt Details Section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Mass Intention Receipt', { align: 'center' })
      .moveDown(1)

    // Receipt Number
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Receipt Number: ${intention.id.substring(0, 8).toUpperCase()}`, { align: 'left' })
      .moveDown(0.5)

    // Date of Receipt
    doc
      .text(`Date: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, { align: 'left' })
      .moveDown(1)

    // Intention Details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Intention:', { align: 'left' })
      .moveDown(0.3)

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#333333')
      .text(intention.intention, {
        align: 'left',
        indent: 20
      })
      .moveDown(0.8)

    // Mass Information
    if (massDate) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Mass Details:', { align: 'left' })
        .moveDown(0.3)

      if (massTitle) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#333333')
          .text(`Mass: ${massTitle}`, {
            align: 'left',
            indent: 20
          })
      }

      const formattedDate = massDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#333333')
        .text(`Date: ${formattedDate}`, {
          align: 'left',
          indent: 20
        })

      if (massTime) {
        const [hours, minutes] = massTime.split(':')
        const hour = parseInt(hours, 10)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#333333')
          .text(`Time: ${displayHour}:${minutes} ${ampm}`, {
            align: 'left',
            indent: 20
          })
      }

      if (event?.location) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#333333')
          .text(`Location: ${event.location}`, {
            align: 'left',
            indent: 20
          })
      }

      doc.moveDown(0.8)
    }

    // Offering/Stipend Information
    if (intention.offering_amount && intention.offering_amount > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Offering Received:', { align: 'left' })
        .moveDown(0.3)

      const offeringDollars = (intention.offering_amount / 100).toFixed(2)
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(`$${offeringDollars}`, {
          align: 'left',
          indent: 20
        })
        .moveDown(0.3)

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Payment Method: ${paymentMethod}`, {
          align: 'left',
          indent: 20
        })

      if (paymentDate) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Payment Date: ${paymentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`, {
            align: 'left',
            indent: 20
          })
      }

      doc.moveDown(1)
    } else {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#666666')
        .text('No offering received for this intention.', {
          align: 'left',
          indent: 20
        })
        .moveDown(1)
    }

    // Requested By
    if (userProfile?.full_name) {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Requested by: ${userProfile.full_name}`, {
          align: 'left'
        })
        .moveDown(1)
    }

    // Divider line
    doc
      .strokeColor('#CCCCCC')
      .lineWidth(1)
      .moveTo(60, doc.y)
      .lineTo(552, doc.y)
      .stroke()
      .moveDown(1)

    // Footer
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        'This is an official receipt for Mass intention offering.',
        { align: 'center' }
      )
      .moveDown(0.3)
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

  return Buffer.concat(chunks)
}
