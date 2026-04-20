'use client'

import { useEffect, useState, useRef } from 'react'
import { getUnreadNotificationCount, subscribeToNotifications, type Notification } from '@/lib/supabase/notifications'
import { NotificationDropdown } from './NotificationDropdown'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load initial unread count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount()
        setUnreadCount(count)
      } catch (error) {
        console.error('Error loading unread count:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUnreadCount()

    // Subscribe to new notifications
    const subscription = subscribeToNotifications((notification: Notification) => {
      // Only increment if notification is for current user and unread
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBellClick = () => {
    setIsOpen(!isOpen)
    // Refresh unread count when opening
    if (!isOpen) {
      getUnreadNotificationCount().then(setUnreadCount).catch(console.error)
    }
  }

  const handleUnreadCountChange = (newCount: number) => {
    setUnreadCount(newCount)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        aria-label="Notificaciones"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6 text-[var(--foreground)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {!loading && unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onUnreadCountChange={handleUnreadCountChange}
        />
      )}
    </div>
  )
}


