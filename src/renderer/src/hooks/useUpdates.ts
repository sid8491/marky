import { useEffect } from 'react'
import { useToasts } from '@/store/toasts'

const NOTIFIED_KEY = 'marky:update-notified-version'

export function useUpdates(): void {
  useEffect(() => {
    return window.marky.updates.onEvent((event) => {
      if (event.type === 'downloaded') {
        // Avoid spamming the same version on repeat checks
        const last = localStorage.getItem(NOTIFIED_KEY)
        if (last === event.version) return
        localStorage.setItem(NOTIFIED_KEY, event.version)

        useToasts.getState().push({
          title: `Marky ${event.version} is ready`,
          description:
            'A new version has been downloaded. Restart to install — your open tabs are preserved.',
          kind: 'info',
          duration: 0,
          actions: [
            {
              label: 'Restart now',
              onClick: () => window.marky.updates.install()
            },
            { label: 'Later', onClick: () => {} }
          ]
        })
      } else if (event.type === 'error') {
        // Only surface errors during explicit checks, not background ones.
        // For now: log only, don't toast (avoids noise on offline launches).
        console.warn('[update] error:', event.message)
      }
    })
  }, [])
}
