import { useEffect } from 'react'
import { useTabs, isDirty, type Tab } from '@/store/tabs'
import type { Draft } from '@shared/types'

const DEBOUNCE_MS = 600

function toDraft(tab: Tab): Draft {
  return {
    draftId: tab.id,
    originPath: tab.path,
    title: tab.title,
    content: tab.content,
    savedContent: tab.savedContent,
    mtimeMs: tab.mtimeMs,
    savedAt: Date.now()
  }
}

/**
 * Mirror every dirty tab buffer to disk on a debounce so the user can recover
 * unsaved work if Marky crashes or is killed before the next explicit save.
 * Clean tabs (content === savedContent) and closed tabs have their drafts
 * promptly removed.
 */
export function useDraftPersistence(): void {
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const known = new Set<string>()
    const lastContent = new Map<string, string>()

    const schedule = (tab: Tab): void => {
      // Ignore re-renders that didn't change the buffer (scroll, splitRatio,
      // etc.) — otherwise we'd re-debounce forever for an idle dirty tab.
      if (lastContent.get(tab.id) === tab.content) return
      lastContent.set(tab.id, tab.content)

      const existing = timers.get(tab.id)
      if (existing) clearTimeout(existing)
      const handle = setTimeout(() => {
        timers.delete(tab.id)
        void window.marky.drafts.save(toDraft(tab))
      }, DEBOUNCE_MS)
      timers.set(tab.id, handle)
      known.add(tab.id)
    }

    const drop = (tabId: string): void => {
      const t = timers.get(tabId)
      if (t) clearTimeout(t)
      timers.delete(tabId)
      known.delete(tabId)
      lastContent.delete(tabId)
      void window.marky.drafts.delete(tabId)
    }

    const reconcile = (tabs: Tab[]): void => {
      const live = new Set(tabs.map((t) => t.id))
      for (const id of known) {
        if (!live.has(id)) drop(id)
      }
      for (const tab of tabs) {
        if (isDirty(tab)) {
          schedule(tab)
        } else if (known.has(tab.id)) {
          drop(tab.id)
        }
      }
    }

    reconcile(useTabs.getState().tabs)
    const unsub = useTabs.subscribe((s) => reconcile(s.tabs))

    return () => {
      unsub()
      for (const handle of timers.values()) clearTimeout(handle)
      timers.clear()
    }
  }, [])
}
