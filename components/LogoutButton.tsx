'use client'

import { useState } from 'react'
import { signOut } from '@/lib/supabase/auth'

export default function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      // Auth state change listener will handle redirect
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      style={{
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '500',
        color: 'white',
        backgroundColor: loggingOut ? '#999' : '#dc2626',
        border: 'none',
        borderRadius: '4px',
        cursor: loggingOut ? 'not-allowed' : 'pointer'
      }}
    >
      {loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
    </button>
  )
}

