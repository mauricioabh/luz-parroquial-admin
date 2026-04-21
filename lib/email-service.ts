/**
 * Email Service
 * 
 * Professional email workflow:
 * 1. Design: React Email (localhost:3001) - npx email dev
 * 2. Development: Mailtrap (sandbox) - catches all emails
 * 3. Production: Resend (with dashboard logs)
 * 
 * Environment Variables:
 * - NODE_ENV: 'development' | 'production'
 * - EMAIL_PROVIDER: 'mailtrap' | 'resend' (defaults to 'resend' in production, 'mailtrap' in development)
 * - RESEND_API_KEY: Resend API key (required for production)
 * - MAILTRAP_HOST: Mailtrap SMTP host (default: 'sandbox.smtp.mailtrap.io')
 * - MAILTRAP_PORT: Mailtrap SMTP port (default: 2525)
 * - MAILTRAP_USER: Mailtrap SMTP user
 * - MAILTRAP_PASS: Mailtrap SMTP password
 * - EMAIL_FROM: Sender email address
 */

import { render } from '@react-email/render'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

export interface EmailOptions {
  to: string | string[]
  subject: string
  react?: ReactElement
  html?: string // For raw HTML (e.g., from database templates)
  from?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

class EmailService {
  private resend: Resend | null = null
  private mailtrapTransporter: nodemailer.Transporter | null = null
  private emailFrom: string

  constructor() {
    this.emailFrom = process.env.EMAIL_FROM || 'onboarding@luzparroquial.com'
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize Resend for production
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY)
    }

    // Initialize Mailtrap for development
    if (this.shouldUseMailtrap()) {
      const mailtrapHost = process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io'
      const mailtrapPort = parseInt(process.env.MAILTRAP_PORT || '2525', 10)
      const mailtrapUser = process.env.MAILTRAP_USER
      const mailtrapPass = process.env.MAILTRAP_PASS

      if (mailtrapUser && mailtrapPass) {
        this.mailtrapTransporter = nodemailer.createTransport({
          host: mailtrapHost,
          port: mailtrapPort,
          auth: {
            user: mailtrapUser,
            pass: mailtrapPass,
          },
        })
      } else {
        console.warn(
          'Mailtrap credentials not found. Set MAILTRAP_USER and MAILTRAP_PASS for development email testing.'
        )
      }
    }
  }

  private shouldUseMailtrap(): boolean {
    // Use Mailtrap in development if explicitly set or if NODE_ENV is development
    const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase()
    if (emailProvider === 'mailtrap') return true
    if (emailProvider === 'resend') return false
    return process.env.NODE_ENV === 'development'
  }

  /**
   * Send email using the configured provider
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, react, from } = options
    const sender = from || this.emailFrom

    try {
      // Render React Email component to HTML, or use provided HTML
      const html = react ? await render(react) : options.html || ''

      if (!html) {
        throw new Error('Either react component or html must be provided')
      }

      // Use Mailtrap in development, Resend in production
      if (this.shouldUseMailtrap() && this.mailtrapTransporter) {
        return await this.sendViaMailtrap({
          to,
          subject,
          html,
          from: sender,
        })
      } else if (this.resend) {
        return await this.sendViaResend({
          to,
          subject,
          html,
          from: sender,
        })
      } else {
        // Fallback: log email (useful for testing without providers)
        console.log('=== EMAIL (NO PROVIDER CONFIGURED) ===')
        console.log('To:', to)
        console.log('Subject:', subject)
        console.log('From:', sender)
        console.log('HTML:', html.substring(0, 200) + '...')
        console.log('=====================================')

        return {
          success: true,
          messageId: 'logged-only',
        }
      }
    } catch (error) {
      console.error('Error sending email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Send email via Mailtrap (development/sandbox)
   */
  private async sendViaMailtrap(options: {
    to: string | string[]
    subject: string
    html: string
    from: string
  }): Promise<EmailResult> {
    if (!this.mailtrapTransporter) {
      throw new Error('Mailtrap transporter not initialized')
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      const info = await this.mailtrapTransporter.sendMail({
        from: options.from,
        to: recipients.join(', '),
        subject: options.subject,
        html: options.html,
      })

      console.log(`✅ Email sent via Mailtrap to ${recipients.join(', ')}`)
      console.log(`   Message ID: ${info.messageId}`)
      console.log(`   Preview: https://mailtrap.io/inboxes`)

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      console.error('Mailtrap send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Send email via Resend (production)
   */
  private async sendViaResend(options: {
    to: string | string[]
    subject: string
    html: string
    from: string
  }): Promise<EmailResult> {
    if (!this.resend) {
      throw new Error('Resend client not initialized')
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      const response = await this.resend.emails.send({
        from: options.from,
        to: recipients,
        subject: options.subject,
        html: options.html,
      })

      if (response.error) {
        return {
          success: false,
          error: response.error.message || 'Unknown Resend error',
        }
      }

      const messageId = response.data?.id

      console.log(`✅ Email sent via Resend to ${recipients.join(', ')}`)
      console.log(`   Message ID: ${messageId ?? 'unknown'}`)
      console.log(`   View in Resend Dashboard: https://resend.com/emails`)

      return {
        success: true,
        messageId,
      }
    } catch (error) {
      console.error('Resend send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

// Singleton instance
export const emailService = new EmailService()
