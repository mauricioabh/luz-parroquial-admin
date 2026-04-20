'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { signOut } from '@/lib/supabase/auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { RoleName } from '@/lib/supabase/roles'

const ROLE_LABELS: Record<RoleName, string> = {
  priest: 'Sacerdote',
  secretary: 'Secretaria',
  editor: 'Editor',
  parishioner: 'Feligrés',
  diocese_admin: 'Admin Diócesis',
}

function getRoleLabel(roleName: RoleName): string {
  return ROLE_LABELS[roleName] || roleName
}

export function Topbar() {
  const { profile } = useProfile()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setDropdownOpen(false)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Luz Parroquial</h1>
            <p className="text-xs text-muted-foreground">
              {profile?.role_name === 'parishioner' ? 'Comunidad Parroquial' : 'Administración Parroquial'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {profile && (
            <>
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-sm font-medium text-foreground">{profile.full_name}</span>
                    <Badge variant="info" className="text-xs shrink-0">
                      {getRoleLabel(profile.role_name)}
                    </Badge>
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 py-1 bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
                      <Badge variant="info" className="mt-1">{getRoleLabel(profile.role_name)}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

