import { useTabs, isDirty } from '@/store/tabs'
import { useSettings } from '@/store/settings'
import { useRecent } from '@/store/recent'
import { toast } from '@/store/toasts'
import { exportToPdf } from '@/lib/exportPdf'

/**
 * File-level commands. All read live state via Zustand `getState()`, so they
 * have no React-closure dependencies and can be safely imported anywhere —
 * keyboard shortcut handlers, command palette entries, toolbar buttons.
 */

export function newDoc(): string {
  return useTabs.getState().newTab()
}

export async function openFile(): Promise<void> {
  const files = await window.marky.files.openDialog()
  const tabsStore = useTabs.getState()
  const recent = useRecent.getState()
  for (const f of files) {
    tabsStore.openFile(f)
    recent.add(f.path, '')
  }
}

export async function openPath(path: string): Promise<void> {
  try {
    const file = await window.marky.files.read(path)
    useTabs.getState().openFile(file)
    useRecent.getState().add(file.path, '')
  } catch (err) {
    toast('Could not open file', {
      description: (err as Error).message ?? String(err),
      kind: 'error'
    })
    useRecent.getState().remove(path)
  }
}

export async function saveActive(): Promise<void> {
  const { tabs, activeId, markSaved } = useTabs.getState()
  const tab = tabs.find((t) => t.id === activeId)
  if (!tab) return
  if (!tab.path) return saveActiveAs()
  const { mtimeMs } = await window.marky.files.write(tab.path, tab.content)
  markSaved(tab.id, tab.content, mtimeMs)
}

export async function saveActiveAs(): Promise<void> {
  const { tabs, activeId, markSaved } = useTabs.getState()
  const tab = tabs.find((t) => t.id === activeId)
  if (!tab) return
  const result = await window.marky.files.saveDialog({
    defaultName: tab.path ? tab.title : tab.title + '.md'
  })
  if (result.canceled || !result.path) return
  const { mtimeMs } = await window.marky.files.write(result.path, tab.content)
  markSaved(tab.id, tab.content, mtimeMs, result.path)
  useRecent.getState().add(result.path, '')
}

export async function closeActive(): Promise<void> {
  const { tabs, activeId, closeTab } = useTabs.getState()
  const tab = tabs.find((t) => t.id === activeId)
  if (!tab) return
  if (isDirty(tab)) {
    const choice = window.confirm(`Save changes to ${tab.title} before closing?`)
    if (choice) await saveActive()
  }
  closeTab(tab.id)
}

export async function exportPdf(): Promise<void> {
  const { tabs, activeId } = useTabs.getState()
  const tab = tabs.find((t) => t.id === activeId)
  if (!tab) return
  const dark = useSettings.getState().resolvedDark
  await exportToPdf({ markdown: tab.content, defaultName: tab.title, dark })
}
