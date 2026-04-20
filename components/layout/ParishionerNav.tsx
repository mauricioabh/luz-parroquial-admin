'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

export function ParishionerNav() {
  const pathname = usePathname()
  const { profile } = useProfile()

  // Only show for parishioners
  if (!profile || profile.role_name !== 'parishioner') {
    return null
  }

  const navItems = [
    { href: '/dashboard', label: 'Inicio', shortLabel: 'Inicio' },
    { href: '/prayer', label: 'Oración', shortLabel: 'Oración' },
    { href: '/mass-intentions', label: 'Misa', shortLabel: 'Misa' },
    { href: '/sacrament-request/status', label: 'Sacramentos', shortLabel: 'Sacramentos' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href) || false
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] z-50 lg:hidden">
      <div className="flex items-center justify-around h-16 safe-area-bottom">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center h-full text-xs font-medium transition-colors min-h-[44px] ${
                active
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'
              }`}
            >
              <span className={active ? 'font-semibold' : ''}>{item.shortLabel || item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

