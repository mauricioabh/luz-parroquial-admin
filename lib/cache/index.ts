// Simple localStorage-based cache for small datasets.
// Intended for read-only offline fallbacks and quick restore after reconnect.
type CachedEnvelope<T> = {
	data: T
	timestamp: number
}

function isLocalStorageAvailable(): boolean {
	try {
		const testKey = '__lp_cache_test__'
		window.localStorage.setItem(testKey, '1')
		window.localStorage.removeItem(testKey)
		return true
	} catch {
		return false
	}
}

export function getCached<T>(key: string): T | null {
	if (typeof window === 'undefined' || !isLocalStorageAvailable()) return null
	try {
		const raw = window.localStorage.getItem(key)
		if (!raw) return null
		const parsed = JSON.parse(raw) as CachedEnvelope<T>
		if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return null
		return parsed.data ?? null
	} catch {
		return null
	}
}

export function setCached<T>(key: string, data: T): void {
	if (typeof window === 'undefined' || !isLocalStorageAvailable()) return
	try {
		const envelope: CachedEnvelope<T> = { data, timestamp: Date.now() }
		window.localStorage.setItem(key, JSON.stringify(envelope))
	} catch {
		// Ignore storage errors; offline experience should never crash
	}
}

export function makeCacheKey(parts: (string | number | undefined | null)[]): string {
	return ['lp', ...parts.filter((p) => p !== undefined && p !== null).map(String)].join(':')
}



