'use client'

import { useEffect, useState } from 'react'
import { getNotifications, markNotificationRead, markAllNotificationsRead, type Notification } from '@/lib/supabase/notifications'
import { Button } from '@/components/ui/Button'
import { getCached, setCached, makeCacheKey } from '@/lib/cache'
import { useOnReconnect } from '@/lib/offline/network'

interface NotificationDropdownProps {
  onClose: () => void
  onUnreadCountChange: (count: number) => void
}

export function NotificationDropdown({ onClose, onUnreadCountChange }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState<string | null>(null)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await getNotifications(20)
        setNotifications(data)
        const unreadCount = data.filter((n) => !n.read).length
        onUnreadCountChange(unreadCount)
      } catch (error) {
        // Try offline cache
        const cacheKey = makeCacheKey(['notifications', 20])
        const cached = getCached<Notification[]>(cacheKey)
        if (cached) {
          setNotifications(cached)
          const unreadCount = cached.filter((n) => !n.read).length
          onUnreadCountChange(unreadCount)
        } else {
          console.error('Error loading notifications:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [onUnreadCountChange])

  // Persist successfully loaded notifications
  useEffect(() => {
    if (!loading && notifications.length >= 0) {
      const cacheKey = makeCacheKey(['notifications', 20])
      setCached(cacheKey, notifications)
    }
  }, [loading, notifications])

  // Auto-refresh on reconnect
  useOnReconnect(() => {
    // Refresh in the background; ignore loading state here
    getNotifications(20)
      .then((data) => {
        setNotifications(data)
        const unreadCount = data.filter((n) => !n.read).length
        onUnreadCountChange(unreadCount)
      })
      .catch(() => {
        // Ignore errors on reconnect refresh
      })
  })

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingRead(notificationId)
    try {
      await markNotificationRead(notificationId)
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        const newUnreadCount = updated.filter((n) => !n.read).length
        onUnreadCountChange(newUnreadCount)
        return updated
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setMarkingRead(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      onUnreadCountChange(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sacrament_request_approved':
      case 'sacrament_request_rejected':
      case 'sacrament_request_in_review':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'intention_scheduled':
      case 'intention_completed':
      case 'mass_intention_scheduled':
      case 'mass_intention_fulfilled':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'appointment_confirmed':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'invitation_accepted':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Notificaciones</h3>
        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs"
          >
            Marcar todo leído
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-[var(--muted-foreground)]">Cargando notificaciones...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-2"
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
            <p className="text-sm text-[var(--muted-foreground)]">Sin notificaciones</p>
          </div>
        ) : (
          <>
            {/* Unread notifications */}
            {unreadNotifications.length > 0 && (
              <div>
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--secondary)] cursor-pointer transition-colors"
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-[var(--primary)]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {notification.payload.message || 'Nueva notificación'}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-[var(--primary)] rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Read notifications */}
            {readNotifications.length > 0 && (
              <div>
                {unreadNotifications.length > 0 && (
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--secondary)] border-b border-[var(--border)]">
                    Older
                  </div>
                )}
                {readNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors opacity-75"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-[var(--muted-foreground)]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--foreground)]">
                          {notification.payload.message || 'Notificación'}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

