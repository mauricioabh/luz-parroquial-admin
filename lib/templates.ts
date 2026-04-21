'use server'

import { supabaseAdmin } from './supabase/server'

export interface Template {
  id: string
  template_type: 'welcome_email' | 'announcement_text' | 'bulletin_insert' | 'demo_invite_email' | 'follow_up_email'
  name: string
  subject: string | null
  content: string
  variables: Record<string, string>
  is_active: boolean
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | null
}

/**
 * Get active template by type
 */
export async function getTemplate(
  templateType: 'welcome_email' | 'announcement_text' | 'bulletin_insert' | 'demo_invite_email' | 'follow_up_email'
): Promise<Template | null> {
  const { data, error } = await supabaseAdmin.rpc('get_onboarding_template', {
    p_template_type: templateType
  })

  if (error) {
    console.error('Error fetching template:', error)
    return null
  }

  return data as Template | null
}

/**
 * Render template with variables
 */
export async function renderTemplate(
  template: Template,
  variables: TemplateVariables
): Promise<{ subject: string | null; content: string }> {
  let subject = template.subject
  let content = template.content

  // Replace all variables in subject and content
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g')
    const valueStr = value != null ? String(value) : ''
    
    if (subject) {
      subject = subject.replace(placeholder, valueStr)
    }
    content = content.replace(placeholder, valueStr)
  })

  return { subject, content }
}

/**
 * Get rendered welcome email template
 */
export async function getWelcomeEmailTemplate(
  variables: {
    parish_name: string
    admin_name: string
    onboarding_url: string
  }
): Promise<{ subject: string; content: string } | null> {
  const template = await getTemplate('welcome_email')
  if (!template) return null

  const rendered = await renderTemplate(template, variables)
  return {
    subject: rendered.subject || 'Welcome to Luz Parroquial!',
    content: rendered.content
  }
}

/**
 * Get rendered announcement text template
 */
export async function getAnnouncementTextTemplate(
  variables: {
    parish_name: string
    app_url: string
    parish_address?: string
    parish_phone?: string
    parish_email?: string
  }
): Promise<string | null> {
  const template = await getTemplate('announcement_text')
  if (!template) return null

  const rendered = await renderTemplate(template, variables)
  return rendered.content
}

/**
 * Get rendered bulletin insert template
 */
export async function getBulletinInsertTemplate(
  variables: {
    parish_name: string
    app_url: string
    parish_address?: string
    parish_phone?: string
    parish_email?: string
    office_hours?: string
  }
): Promise<string | null> {
  const template = await getTemplate('bulletin_insert')
  if (!template) return null

  const rendered = await renderTemplate(template, variables)
  return rendered.content
}

/**
 * Get rendered demo invite email template
 */
export async function getDemoInviteEmailTemplate(
  variables: {
    contact_name: string
    parish_name: string
    diocese: string
    demo_url: string
  }
): Promise<{ subject: string; content: string } | null> {
  const template = await getTemplate('demo_invite_email')
  if (!template) return null

  const rendered = await renderTemplate(template, variables)
  return {
    subject: rendered.subject || 'Demo Invitation: Experience Luz Parroquial',
    content: rendered.content
  }
}

/**
 * Get rendered follow-up email template
 */
export async function getFollowUpEmailTemplate(
  variables: {
    contact_name: string
    parish_name: string
    follow_up_message: string
    demo_url?: string
    pricing_url?: string
    features_url?: string
    contact_phone?: string
    sender_name?: string
  }
): Promise<{ subject: string; content: string } | null> {
  const template = await getTemplate('follow_up_email')
  if (!template) return null

  const rendered = await renderTemplate(template, variables)
  return {
    subject: rendered.subject || `Following up: Luz Parroquial for ${variables.parish_name}`,
    content: rendered.content
  }
}

