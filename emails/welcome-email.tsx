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

interface WelcomeEmailProps {
  fullName: string
  parishName: string
  loginUrl: string
}

export const WelcomeEmail = ({
  fullName = 'John Doe',
  parishName = 'Parish Name',
  loginUrl = 'https://app.luzparroquial.com',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>¡Bienvenido a Luz Parroquial! Tu parroquia ha sido registrada exitosamente.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>¡Bienvenido a Luz Parroquial!</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>Hola {fullName},</Text>

            <Text style={paragraph}>
              ¡Felicitaciones! Tu parroquia <strong>{parishName}</strong> ha sido registrada exitosamente
              en Luz Parroquial.
            </Text>

            <Text style={paragraph}>
              Ya estás configurado como administrador parroquial. Esto es lo que puedes hacer a continuación:
            </Text>

            <Section style={checklist}>
              <Heading style={checklistHeading}>Lista de Inicio Rápido:</Heading>
              <ul style={list}>
                <li style={listItem}>Completa la información de tu parroquia</li>
                <li style={listItem}>Agrega tu horario de misas</li>
                <li style={listItem}>Invita administradores adicionales</li>
                <li style={listItem}>Crea tu primer ministerio</li>
              </ul>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Ir al Panel de Configuración
              </Button>
            </Section>

            <Text style={smallText}>
              Puedes completar todas las tareas de configuración en menos de 30 minutos. Si necesitas ayuda, revisa los
              consejos contextuales en el panel de configuración.
            </Text>

            <Text style={paragraph}>
              Saludos cordiales,
              <br />
              <strong>El Equipo de Luz Parroquial</strong>
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

export default WelcomeEmail

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

const checklist = {
  background: '#f9fafb',
  padding: '20px',
  borderRadius: '6px',
  margin: '20px 0',
}

const checklistHeading = {
  fontSize: '18px',
  marginTop: '0',
  color: '#111827',
  fontWeight: '600',
}

const list = {
  paddingLeft: '20px',
  margin: '10px 0',
}

const listItem = {
  margin: '8px 0',
  fontSize: '16px',
  color: '#333333',
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
