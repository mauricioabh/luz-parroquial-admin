/**
 * API Route to render React Email components to HTML
 * Used by Edge Functions that run in Deno (can't use React Email directly)
 */

import { render } from '@react-email/render'
import { NextRequest, NextResponse } from 'next/server'
import { NotificationEmail } from '@/emails/notification-email'
import { InvitationEventEmail } from '@/emails/invitation-event-email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, props } = body

    if (!type || !props) {
      return NextResponse.json(
        { error: 'Missing type or props' },
        { status: 400 }
      )
    }

    let html: string

    switch (type) {
      case 'notification':
        html = await render(
          NotificationEmail({
            userName: props.userName,
            notifications: props.notifications,
            appUrl: props.appUrl,
          })
        )
        break

      case 'invitation-event':
        html = await render(
          InvitationEventEmail({
            recipientEmail: props.recipientEmail,
            eventType: props.eventType,
            roleName: props.roleName,
            invitationUrl: props.invitationUrl,
          })
        )
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Error rendering email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
