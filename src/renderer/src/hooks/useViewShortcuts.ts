import { useEffect } from 'react'
import { useTabs } from '@/store/tabs'

export function useViewShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const { tabs, activeId, setViewMode } = useTabs.getState()
      const tab = tabs.find((t) => t.id === activeId)
      if (!tab) return
      if (e.key === '\\') {
        e.preventDefault()
        const next = tab.viewMode === 'split' ? 'edit' : 'split'
        setViewMode(tab.id, next)
      } else if (e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault()
        setViewMode(tab.id, 'edit')
      } else if (e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        setViewMode(tab.id, 'preview')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
