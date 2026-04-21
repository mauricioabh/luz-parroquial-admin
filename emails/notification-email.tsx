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

interface Notification {
  message: string
  timeAgo: string
}

interface NotificationEmailProps {
  userName: string
  notifications: Notification[]
  appUrl: string
}

export const NotificationEmail = ({
  userName = 'User',
  notifications = [
    { message: 'You have a new notification', timeAgo: '2 hours ago' },
  ],
  appUrl = 'https://app.luzparroquial.com',
}: NotificationEmailProps) => {
  const notificationCount = notifications.length

  return (
    <Html>
      <Head />
      <Preview>
        {`Tienes ${notificationCount} nueva${notificationCount === 1 ? '' : 's'} notificación${notificationCount === 1 ? '' : 'es'}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>Nuevas Notificaciones</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>Hola {userName},</Text>

            <Text style={paragraph}>
              Tienes {notificationCount} nueva{notificationCount === 1 ? '' : 's'} notificación{notificationCount === 1 ? '' : 'es'}:
            </Text>

            {notifications.map((notification, index) => (
              <Section key={index} style={notificationItem}>
                <Text style={notificationMessage}>{notification.message}</Text>
                <Text style={notificationTime}>{notification.timeAgo}</Text>
              </Section>
            ))}

            <Section style={buttonContainer}>
              <Button style={button} href={appUrl}>
                Ver Todas las Notificaciones
              </Button>
            </Section>

            <Text style={smallText}>
              Este es un correo automatizado de Luz Parroquial. Puedes gestionar tus preferencias de notificación
              en la configuración de tu cuenta.
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

export default NotificationEmail

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

const content = {
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

const notificationItem = {
  padding: '16px',
  marginBottom: '12px',
  background: '#f9fafb',
  borderLeft: '4px solid #667eea',
  borderRadius: '4px',
}

const notificationMessage = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  color: '#111827',
  fontWeight: '500',
}

const notificationTime = {
  margin: '0',
  fontSize: '12px',
  color: '#6b7280',
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

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '30px',
}

const footer = {
  textAlign: 'center' as const,
  marginTop: '20px',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
}
