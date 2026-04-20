import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getWelcomeEmailTemplate, getAnnouncementTextTemplate, getBulletinInsertTemplate } from '@/lib/templates'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('type')
    const parishId = searchParams.get('parish_id')

    if (!templateType || !parishId) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and parish_id' },
        { status: 400 }
      )
    }

    // Get parish information
    const { data: parish, error: parishError } = await supabaseAdmin
      .from('parishes')
      .select('*')
      .eq('id', parishId)
      .single()

    if (parishError || !parish) {
      return NextResponse.json(
        { error: 'Parish not found' },
        { status: 404 }
      )
    }

    // Get primary admin
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('parish_id', parishId)
      .limit(1)
      .single()

    const adminName = admin?.full_name || 'Administrator'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luzparroquial.com'
    const onboardingUrl = `${appUrl}/admin/onboarding`

    let result: { subject?: string; content: string } | null = null

    switch (templateType) {
      case 'welcome_email':
        result = await getWelcomeEmailTemplate({
          parish_name: parish.name,
          admin_name: adminName,
          onboarding_url: onboardingUrl
        })
        break

      case 'announcement_text':
        const announcementText = await getAnnouncementTextTemplate({
          parish_name: parish.name,
          app_url: appUrl,
          parish_address: '', // Can be added to parishes table if needed
          parish_phone: '', // Can be added to parishes table if needed
          parish_email: '' // Can be added to parishes table if needed
        })
        if (announcementText) {
          result = { content: announcementText }
        }
        break

      case 'bulletin_insert':
        const bulletinText = await getBulletinInsertTemplate({
          parish_name: parish.name,
          app_url: appUrl,
          parish_address: '', // Can be added to parishes table if needed
          parish_phone: '', // Can be added to parishes table if needed
          parish_email: '', // Can be added to parishes table if needed
          office_hours: '' // Can be added to parishes table if needed
        })
        if (bulletinText) {
          result = { content: bulletinText }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid template type' },
          { status: 400 }
        )
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

