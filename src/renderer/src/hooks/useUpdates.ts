import { useEffect } from 'react'
import { toast, useToasts } from '@/store/toasts'

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

/**
 * User-initiated update check. Shows a "Checking…" toast, then replaces it
 * with the result. Auto-update is disabled in dev — surfaces a friendly note.
 */
export function manualCheckForUpdates(): void {
  const checkingId = toast('Checking for updates…', { duration: 0, kind: 'info' })

  let settled = false
  const finish = (): void => {
    settled = true
    useToasts.getState().dismiss(checkingId)
    unsubscribe()
    clearTimeout(timeoutHandle)
  }

  const unsubscribe = window.marky.updates.onEvent((event) => {
    if (settled) return
    if (event.type === 'available') {
      finish()
      toast(`Update available: v${event.version}`, {
        description:
          "Downloading in the background — you'll be prompted to restart when it's ready.",
        kind: 'success',
        duration: 5000
      })
    } else if (event.type === 'downloaded') {
      finish()
      toast(`Marky ${event.version} is ready`, {
        description: 'Restart to install — your open tabs are preserved.',
        kind: 'success',
        duration: 0,
        actions: [
          {
            label: 'Restart now',
            onClick: () => window.marky.updates.install()
          },
          { label: 'Later', onClick: () => {} }
        ]
      })
    } else if (event.type === 'not-available') {
      finish()
      toast("You're on the latest version", { kind: 'success', duration: 3000 })
    } else if (event.type === 'error') {
      finish()
      toast('Update check failed', {
        description: event.message,
        kind: 'error',
        duration: 6000
      })
    }
  })

  // If main process doesn't reply within 20s, dismiss the spinner.
  const timeoutHandle = setTimeout(() => {
    if (settled) return
    finish()
    toast('Update check timed out', {
      description: 'No response from the update server — try again later.',
      kind: 'error'
    })
  }, 20_000)

  window.marky.updates.check()
}
