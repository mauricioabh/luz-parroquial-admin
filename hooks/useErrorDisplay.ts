'use client'

import { useState, useCallback } from 'react'
import { ErrorContext } from '@/lib/errors'

/**
 * Hook for managing error display with enhanced error component
 * Provides easy state management for error messages
 */
export function useErrorDisplay() {
  const [error, setError] = useState<unknown>(null)
  const [dataSaved, setDataSaved] = useState<boolean | undefined>(undefined)

  const setErrorWithContext = useCallback((err: unknown, saved?: boolean) => {
    setError(err)
    setDataSaved(saved)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setDataSaved(undefined)
  }, [])

  const handleError = useCallback((err: unknown, context?: ErrorContext, saved?: boolean) => {
    setErrorWithContext(err, saved)
  }, [setErrorWithContext])

  return {
    error,
    dataSaved,
    setError: setErrorWithContext,
    clearError,
    handleError,
    hasError: error !== null
  }
}

