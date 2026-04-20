/**
 * Email service using React Email + Mailtrap (dev) / Resend (production)
 * 
 * Professional workflow:
 * 1. Design: React Email (localhost:3001) - npm run email:dev
 * 2. Development: Mailtrap (sandbox) - catches all emails
 * 3. Production: Resend (with dashboard logs)
 */

import { WelcomeEmail } from '../emails/welcome-email'
import { AdminInvitationEmail } from '../emails/admin-invitation-email'
import { emailService } from './email-service'
import { getDemoInviteEmailTemplate, getFollowUpEmailTemplate } from './templates'

export interface WelcomeEmailData {
  to: string
  fullName: string
  parishName: string
  loginUrl: string
}

export interface AdminInvitationEmailData {
  to: string
  inviterName: string
  parishName: string
  role: string
  invitationUrl: string
}

/**
 * Send welcome email to new parish admin
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  try {
    const result = await emailService.sendEmail({
      to: data.to,
      subject: `Welcome to ${data.parishName}!`,
      react: WelcomeEmail({
        fullName: data.fullName,
        parishName: data.parishName,
        loginUrl: data.loginUrl,
      }),
    })

    if (!result.success) {
      console.error('Error sending welcome email:', result.error)
      // Don't throw - email failures shouldn't block registration
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    // Don't throw - email failures shouldn't block registration
  }
}

/**
 * Send admin invitation email
 */
export async function sendAdminInvitationEmail(data: AdminInvitationEmailData): Promise<void> {
  try {
    const result = await emailService.sendEmail({
      to: data.to,
      subject: `You've been invited to join ${data.parishName}`,
      react: AdminInvitationEmail({
        inviterName: data.inviterName,
        parishName: data.parishName,
        role: data.role,
        invitationUrl: data.invitationUrl,
      }),
    })

    if (!result.success) {
      console.error('Error sending invitation email:', result.error)
      // Don't throw - email failures shouldn't block invitations
    }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    // Don't throw - email failures shouldn't block invitations
  }
}

export interface DemoInviteEmailData {
  to: string
  contact_name: string
  parish_name: string
  diocese: string
  demo_url: string
}

export interface FollowUpEmailData {
  to: string
  contact_name: string
  parish_name: string
  follow_up_message: string
  demo_url?: string
  pricing_url?: string
  features_url?: string
  contact_phone?: string
  sender_name?: string
}

/**
 * Send demo invite email to a lead
 * Note: This uses database templates (not React Email) for flexibility
 */
export async function sendDemoInviteEmail(data: DemoInviteEmailData): Promise<void> {
  try {
    const template = await getDemoInviteEmailTemplate({
      contact_name: data.contact_name,
      parish_name: data.parish_name,
      diocese: data.diocese,
      demo_url: data.demo_url
    })

    if (!template) {
      console.error('Failed to load demo invite email template')
      return
    }

    // For database templates, we need to render HTML directly
    // In the future, we could migrate these to React Email too
    const { render } = await import('@react-email/render')
    const html = template.content // Database template already contains HTML

    // Use emailService but with raw HTML (since it's from database)
    // We'll need to add a method for raw HTML, or convert these templates to React Email
    // For now, use Resend directly for database templates
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
      console.warn('RESEND_API_KEY not set, skipping demo invite email')
      return
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@luzparroquial.com',
      to: data.to,
      subject: template.subject,
      html: template.content
    })
  } catch (error) {
    console.error('Error sending demo invite email:', error)
    throw error
  }
}

/**
 * Send follow-up email to a lead
 * Note: This uses database templates (not React Email) for flexibility
 */
export async function sendFollowUpEmail(data: FollowUpEmailData): Promise<void> {
  try {
    const template = await getFollowUpEmailTemplate({
      contact_name: data.contact_name,
      parish_name: data.parish_name,
      follow_up_message: data.follow_up_message,
      demo_url: data.demo_url || '',
      pricing_url: data.pricing_url || '',
      features_url: data.features_url || '',
      contact_phone: data.contact_phone || '',
      sender_name: data.sender_name || 'The Luz Parroquial Team'
    })

    if (!template) {
      console.error('Failed to load follow-up email template')
      return
    }

    // For database templates, use Resend directly
    // In the future, we could migrate these to React Email too
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
      console.warn('RESEND_API_KEY not set, skipping follow-up email')
      return
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@luzparroquial.com',
      to: data.to,
      subject: template.subject,
      html: template.content
    })
  } catch (error) {
    console.error('Error sending follow-up email:', error)
    throw error
  }
}

