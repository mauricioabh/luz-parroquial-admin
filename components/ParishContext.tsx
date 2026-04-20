'use client'

import { useProfile } from '@/contexts/ProfileContext'
import { ReactNode } from 'react'

interface ParishContextProps {
  children: ReactNode
}

export function ParishContext({ children }: ParishContextProps) {
  const { profile, loading, error } = useProfile()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando contexto parroquial...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-700">Error loading parish context: {error.message}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-sm text-amber-700">Contexto parroquial no disponible</p>
      </div>
    )
  }

  return <>{children}</>
}

