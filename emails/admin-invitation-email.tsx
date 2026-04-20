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

interface AdminInvitationEmailProps {
  inviterName: string
  parishName: string
  role: string
  invitationUrl: string
}

export const AdminInvitationEmail = ({
  inviterName = 'John Doe',
  parishName = 'Parish Name',
  role = 'Administrator',
  invitationUrl = 'https://app.luzparroquial.com',
}: AdminInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Has sido invitado a unirte a {parishName} como administrador</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>Invitación de Administrador</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>Hola,</Text>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> te ha invitado a unirte a <strong>{parishName}</strong> como
              administrador con el rol de <strong>{role}</strong>.
            </Text>

            <Text style={paragraph}>Como administrador, podrás:</Text>

            <ul style={list}>
              <li style={listItem}>Gestionar el contenido y anuncios parroquiales</li>
              <li style={listItem}>Organizar eventos y horarios de misas</li>
              <li style={listItem}>Invitar y gestionar feligreses</li>
              <li style={listItem}>Crear y gestionar ministerios</li>
            </ul>

            <Section style={buttonContainer}>
              <Button style={button} href={invitationUrl}>
                Aceptar Invitación
              </Button>
            </Section>

            <Text style={smallText}>
              Este enlace de invitación expirará en 7 días. Si no esperabas esta invitación, puedes
              ignorar este correo de forma segura.
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

export default AdminInvitationEmail

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
