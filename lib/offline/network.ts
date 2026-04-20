'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
	const [online, setOnline] = useState<boolean>(() => {
		if (typeof navigator === 'undefined') return true
		return navigator.onLine
	})

	useEffect(() => {
		const handleOnline = () => setOnline(true)
		const handleOffline = () => setOnline(false)
		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)
		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])

	return online
}

// Triggers the callback when we reconnect or when the tab becomes visible again
export function useOnReconnect(callback: () => void) {
	useEffect(() => {
		let timeoutId: number | undefined

		const run = () => {
			// Debounce slightly to avoid rapid duplicate calls
			if (timeoutId) window.clearTimeout(timeoutId)
			timeoutId = window.setTimeout(() => {
				callback()
			}, 150)
		}

		const handleOnline = () => run()
		const handleVisibility = () => {
			if (document.visibilityState === 'visible' && navigator.onLine) {
				run()
			}
		}

		window.addEventListener('online', handleOnline)
		document.addEventListener('visibilitychange', handleVisibility)

		return () => {
			if (timeoutId) window.clearTimeout(timeoutId)
			window.removeEventListener('online', handleOnline)
			document.removeEventListener('visibilitychange', handleVisibility)
		}
	}, [callback])
}



