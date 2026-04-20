'use client'

import { ReactNode, useEffect } from 'react'
import { Button } from './Button'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Drawer({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  side = 'right',
  size = 'md' 
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  }

  const sideClasses = side === 'right' 
    ? 'right-0' 
    : 'left-0'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        className={`fixed ${sideClasses} top-0 h-full z-50 ${sizes[size]} w-full bg-[var(--card)] shadow-xl flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-serif text-[var(--card-foreground)]">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="!p-0 w-8 h-8">
            <span className="sr-only">Cerrar</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </>
  )
}

