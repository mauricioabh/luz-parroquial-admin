import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface InvitationEventEmailProps {
  recipientEmail: string
  eventType: 'created' | 'resent' | 'revoked' | 'accepted'
  roleName?: string
  invitationUrl?: string
}

export const InvitationEventEmail = ({
  recipientEmail = 'user@example.com',
  eventType = 'created',
  roleName = 'Parishioner',
  invitationUrl,
}: InvitationEventEmailProps) => {
  const getContent = () => {
    switch (eventType) {
      case 'created':
      case 'resent':
        return {
          subject: 'Invitación para Unirte a la Plataforma Parroquial',
          preview: 'Has sido invitado a unirte a la plataforma parroquial.',
          title: 'Invitación a la Plataforma Parroquial',
          greeting: `Estimado/a ${recipientEmail},`,
          message: eventType === 'resent'
            ? 'Has sido invitado a unirte a la plataforma parroquial. Esta es una nueva invitación (la invitación anterior fue revocada).'
            : 'Has sido invitado a unirte a la plataforma parroquial.',
          details: `Rol: ${roleName}`,
          showButton: true,
          buttonText: 'Aceptar Invitación',
          footer: 'Por favor acepta la invitación haciendo clic en el enlace proporcionado.',
        }
      case 'accepted':
        return {
          subject: 'Bienvenido a la Plataforma Parroquial',
          preview: '¡Gracias por aceptar la invitación!',
          title: 'Bienvenido a la Plataforma Parroquial',
          greeting: `Estimado/a ${recipientEmail},`,
          message: '¡Gracias por aceptar la invitación!',
          details: `Tu cuenta ha sido activada y ahora puedes acceder a la plataforma parroquial.\n\nRol: ${roleName}`,
          showButton: false,
          footer: 'Saludos cordiales,\nAdministración Parroquial',
        }
      case 'revoked':
        return {
          subject: 'Invitación Revocada',
          preview: 'Tu invitación para unirte a la plataforma parroquial ha sido revocada.',
          title: 'Invitación Revocada',
          greeting: `Estimado/a ${recipientEmail},`,
          message: 'Tu invitación para unirte a la plataforma parroquial ha sido revocada.',
          details: 'Si crees que esto es un error, por favor contacta a la administración parroquial.',
          showButton: false,
          footer: 'Saludos cordiales,\nAdministración Parroquial',
        }
      default:
        return {
          subject: 'Notificación de la Plataforma Parroquial',
          preview: 'Tienes una notificación de la plataforma parroquial.',
          title: 'Notificación de la Plataforma Parroquial',
          greeting: `Estimado/a ${recipientEmail},`,
          message: 'Tienes una notificación de la plataforma parroquial.',
          details: '',
          showButton: false,
          footer: 'Saludos cordiales,\nAdministración Parroquial',
        }
    }
  }

  const content = getContent()

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>{content.title}</Heading>
          </Section>

          <Section style={emailContent}>
            <Text style={paragraph}>{content.greeting}</Text>

            <Text style={paragraph}>{content.message}</Text>

            {content.details && (
              <Text style={paragraph} style={{ whiteSpace: 'pre-line' }}>
                {content.details}
              </Text>
            )}

            {content.showButton && invitationUrl && (
              <Section style={buttonContainer}>
                <Button style={button} href={invitationUrl}>
                  {content.buttonText}
                </Button>
              </Section>
            )}

            <Text style={paragraph} style={{ whiteSpace: 'pre-line' }}>
              {content.footer}
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>Este es un correo automatizado. Por favor no respondas.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default InvitationEventEmail

// Styles
const main = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  backgroundColor: '#f6f9fc',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '30px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const heading = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
}

const emailContent = {
  padding: '30px',
  border: '1px solid #e5e7eb',
  borderTop: 'none',
  borderRadius: '0 0 8px 8px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const button = {
  backgroundColor: '#667eea',
  color: '#ffffff',
  padding: '12px 30px',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '16px',
  display: 'inline-block',
}

const footer = {
  textAlign: 'center' as const,
  marginTop: '20px',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
}
