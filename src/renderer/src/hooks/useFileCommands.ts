import { useEffect } from 'react'
import { useTabs, isDirty } from '@/store/tabs'
import { useSettings } from '@/store/settings'
import { useRecent } from '@/store/recent'
import { toast } from '@/store/toasts'
import { exportToPdf } from '@/lib/exportPdf'

export function useFileCommands(): {
  newDoc: () => string
  openFile: () => Promise<void>
  openPath: (path: string) => Promise<void>
  saveActive: () => Promise<void>
  saveActiveAs: () => Promise<void>
  closeActive: () => Promise<void>
  exportPdf: () => Promise<void>
} {
  const newDoc = useTabs((s) => s.newTab)
  const openFile = async (): Promise<void> => {
    const files = await window.marky.files.openDialog()
    const tabsStore = useTabs.getState()
    const recent = useRecent.getState()
    for (const f of files) {
      tabsStore.openFile(f)
      recent.add(f.path, '')
    }
  }
  const openPath = async (path: string): Promise<void> => {
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

  const saveActive = async (): Promise<void> => {
    const { tabs, activeId, markSaved } = useTabs.getState()
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    if (!tab.path) return saveActiveAs()
    const { mtimeMs } = await window.marky.files.write(tab.path, tab.content)
    markSaved(tab.id, tab.content, mtimeMs)
  }

  const saveActiveAs = async (): Promise<void> => {
    const { tabs, activeId, markSaved } = useTabs.getState()
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    const result = await window.marky.files.saveDialog({
      defaultName: (tab.path ? tab.title : tab.title) + (tab.path ? '' : '.md')
    })
    if (result.canceled || !result.path) return
    const { mtimeMs } = await window.marky.files.write(result.path, tab.content)
    markSaved(tab.id, tab.content, mtimeMs, result.path)
    useRecent.getState().add(result.path, '')
  }

  const exportPdf = async (): Promise<void> => {
    const { tabs, activeId } = useTabs.getState()
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    const dark = useSettings.getState().resolvedDark
    await exportToPdf({ markdown: tab.content, defaultName: tab.title, dark })
  }

  const closeActive = async (): Promise<void> => {
    const { tabs, activeId, closeTab } = useTabs.getState()
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    if (isDirty(tab)) {
      const choice = window.confirm(`Save changes to ${tab.title} before closing?`)
      if (choice) await saveActive()
    }
    closeTab(tab.id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        newDoc()
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        void openFile()
      } else if ((e.key === 's' || e.key === 'S') && e.shiftKey) {
        e.preventDefault()
        void saveActiveAs()
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        void saveActive()
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        void closeActive()
      } else if (e.key === 'e' || e.key === 'E') {
        if (e.shiftKey) return // Ctrl+Shift+E is view-mode shortcut
        e.preventDefault()
        void exportPdf()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { newDoc, openFile, openPath, saveActive, saveActiveAs, closeActive, exportPdf }
}
