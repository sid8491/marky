import { useEffect, useRef } from 'react'
import { useTabs, isDirty } from '@/store/tabs'
import { toast } from '@/store/toasts'
import { isOwnWrite } from '@/lib/ownWrites'

export function useFileWatching(): void {
  const tabs = useTabs((s) => s.tabs)
  const watched = useRef<Set<string>>(new Set())

  // sync watch list with current open file paths
  useEffect(() => {
    const next = new Set<string>()
    for (const t of tabs) if (t.path) next.add(t.path)

    for (const p of watched.current) {
      if (!next.has(p)) {
        window.marky.files.unwatch(p)
      }
    }
    for (const p of next) {
      if (!watched.current.has(p)) {
        window.marky.files.watch(p)
      }
    }
    watched.current = next
  }, [tabs])

  // subscribe to change events
  useEffect(() => {
    return window.marky.files.onChanged((path, mtimeMs) => {
      const state = useTabs.getState()
      const tab = state.tabs.find((t) => t.path === path)
      if (!tab) return
      // Our own save: either the write is still in flight (the change event
      // usually beats the IPC reply, especially on Windows), or it completed
      // moments ago, or the mtime matches what we recorded on markSaved.
      if (isOwnWrite(path)) return
      if (tab.mtimeMs && Math.abs(tab.mtimeMs - mtimeMs) < 5) return
      void handleExternalChange(tab.id, path, mtimeMs, isDirty(tab))
    })
  }, [])
}

async function handleExternalChange(
  tabId: string,
  path: string,
  _mtimeMs: number,
  dirty: boolean
): Promise<void> {
  if (!dirty) {
    try {
      const file = await window.marky.files.read(path)
      const store = useTabs.getState()
      store.updateContent(tabId, file.content)
      store.markSaved(tabId, file.content, file.mtimeMs)
    } catch {
      // ignore — file may have been removed
    }
    return
  }
  // dirty — let the user choose
  toast('File changed on disk', {
    description: 'This file was modified outside Marky.',
    kind: 'info',
    duration: 0,
    actions: [
      {
        label: 'Reload from disk',
        onClick: async () => {
          const file = await window.marky.files.read(path)
          const store = useTabs.getState()
          store.updateContent(tabId, file.content)
          store.markSaved(tabId, file.content, file.mtimeMs)
        }
      },
      { label: 'Keep my changes', onClick: () => {} }
    ]
  })
}
