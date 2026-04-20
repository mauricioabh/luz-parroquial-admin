'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import InvitationAcceptance from './InvitationAcceptance'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const invitationId = searchParams.get('token') || searchParams.get('id')

  if (!invitationId) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid #e0e0e0'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#d32f2f'
          }}>
            Invitación Inválida
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px'
          }}>
            No se proporcionó un token de invitación. Por favor verifica tu enlace de invitación.
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Ir al Inicio de Sesión
          </button>
        </div>
      </div>
    )
  }

  return <InvitationAcceptance invitationId={invitationId} />
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <p style={{ color: '#666' }}>Cargando...</p>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}

