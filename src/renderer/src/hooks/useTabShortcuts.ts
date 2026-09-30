import { useEffect } from 'react'
import { useTabs } from '@/store/tabs'

/**
 * Keyboard shortcuts for moving between open tabs:
 *   Ctrl/Cmd+1 … Ctrl/Cmd+8   jump to the Nth tab
 *   Ctrl/Cmd+9                jump to the last tab
 *   Ctrl+Tab                  next tab (wraps)
 *   Ctrl+Shift+Tab            previous tab (wraps)
 *
 * Ctrl+Tab is deliberately Ctrl-only on every platform: on macOS Cmd+Tab is
 * the OS app switcher, and Ctrl+Tab is the native "next tab" chord anyway.
 */
export function useTabShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.altKey) return
      const store = useTabs.getState()

      if (e.key === 'Tab' && e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        store.activateRelative(e.shiftKey ? -1 : 1)
        return
      }

      const mod = e.ctrlKey || e.metaKey
      if (!mod || e.shiftKey) return
      // Use `code` so the shortcut works on layouts where Shift-less digits
      // produce other characters, and so the numpad row counts too.
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)
      if (!m) return
      e.preventDefault()
      const n = Number(m[1])
      if (n === 9) store.activateLast()
      else store.activateAt(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
