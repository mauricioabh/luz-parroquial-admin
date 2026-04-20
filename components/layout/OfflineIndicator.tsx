'use client'

import { useOnlineStatus } from '@/lib/offline/network'

export function OfflineIndicator() {
	const online = useOnlineStatus()
	if (online) return null
	return (
		<div className="fixed top-16 left-0 right-0 z-40">
			<div className="mx-auto lg:ml-64">
				<div className="bg-yellow-100 text-yellow-900 border-b border-yellow-200 px-4 py-2 text-sm">
					You’re offline. Showing last saved data. Some actions are disabled until connection is restored.
				</div>
			</div>
		</div>
	)
}



