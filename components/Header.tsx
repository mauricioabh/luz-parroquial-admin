'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default function Header() {
  const pathname = usePathname()

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Luz Parroquial Admin
        </div>
        <nav style={{
          display: 'flex',
          gap: '16px'
        }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: pathname === '/' ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname === '/' ? '600' : '400'
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/members"
            style={{
              textDecoration: 'none',
              color: pathname === '/members' ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname === '/members' ? '600' : '400'
            }}
          >
            Members
          </Link>
          <Link
            href="/content"
            style={{
              textDecoration: 'none',
              color: pathname === '/content' ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname === '/content' ? '600' : '400'
            }}
          >
            Content
          </Link>
          <Link
            href="/sacraments"
            style={{
              textDecoration: 'none',
              color: pathname === '/sacraments' ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname === '/sacraments' ? '600' : '400'
            }}
          >
            Sacraments
          </Link>
          <Link
            href="/intentions"
            style={{
              textDecoration: 'none',
              color: pathname === '/intentions' ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname === '/intentions' ? '600' : '400'
            }}
          >
            Intentions
          </Link>
          <Link
            href="/donations"
            style={{
              textDecoration: 'none',
              color: pathname === '/donations' ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname === '/donations' ? '600' : '400'
            }}
          >
            Donations
          </Link>
          <Link
            href="/admin/users"
            style={{
              textDecoration: 'none',
              color: pathname?.startsWith('/admin/users') ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname?.startsWith('/admin/users') ? '600' : '400'
            }}
          >
            Users
          </Link>
          <Link
            href="/admin/invitations"
            style={{
              textDecoration: 'none',
              color: pathname?.startsWith('/admin/invitations') ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname?.startsWith('/admin/invitations') ? '600' : '400'
            }}
          >
            Invitations
          </Link>
          <Link
            href="/admin/audit-logs"
            style={{
              textDecoration: 'none',
              color: pathname?.startsWith('/admin/audit-logs') ? '#0070f3' : '#666',
              fontSize: '14px',
              fontWeight: pathname?.startsWith('/admin/audit-logs') ? '600' : '400'
            }}
          >
            Audit Logs
          </Link>
        </nav>
      </div>
      <LogoutButton />
    </header>
  )
}

