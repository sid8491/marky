import { create } from 'zustand'
import { uid } from '@/lib/id'

export type ViewMode = 'edit' | 'split' | 'preview'

export interface Tab {
  id: string
  /** Absolute file path; undefined for untitled buffers */
  path?: string
  /** Display title (filename or "Untitled-N") */
  title: string
  /** Current editor content */
  content: string
  /** Disk content for dirty comparison */
  savedContent: string
  /** Last known mtime on disk */
  mtimeMs?: number
  viewMode: ViewMode
  /** Split ratio (editor proportion, 0–1) */
  splitRatio: number
  scrollEditor: number
  scrollPreview: number
}

interface TabsState {
  tabs: Tab[]
  activeId: string | null
  untitledSeq: number

  newTab: () => string
  openFile: (file: { path: string; content: string; mtimeMs: number }) => string
  closeTab: (id: string) => void
  setActive: (id: string) => void
  updateContent: (id: string, content: string) => void
  markSaved: (id: string, savedContent: string, mtimeMs: number, path?: string) => void
  setViewMode: (id: string, mode: ViewMode) => void
  setSplitRatio: (id: string, ratio: number) => void
  rename: (id: string, path: string) => void
  reorder: (fromIndex: number, toIndex: number) => void
}

function makeUntitled(seq: number): Tab {
  return {
    id: uid('tab'),
    title: `Untitled-${seq}`,
    content: '',
    savedContent: '',
    viewMode: 'split',
    splitRatio: 0.5,
    scrollEditor: 0,
    scrollPreview: 0
  }
}

function basenameFromPath(p: string): string {
  const m = p.match(/[^\\/]+$/)
  return m ? m[0] : p
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [],
  activeId: null,
  untitledSeq: 0,

  newTab: () => {
    const seq = get().untitledSeq + 1
    const tab = makeUntitled(seq)
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeId: tab.id,
      untitledSeq: seq
    }))
    return tab.id
  },

  openFile: ({ path, content, mtimeMs }) => {
    // dedupe by path
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({ activeId: existing.id })
      return existing.id
    }
    const tab: Tab = {
      id: uid('tab'),
      path,
      title: basenameFromPath(path),
      content,
      savedContent: content,
      mtimeMs,
      viewMode: 'split',
      splitRatio: 0.5,
      scrollEditor: 0,
      scrollPreview: 0
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }))
    return tab.id
  },

  closeTab: (id) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id)
      if (idx === -1) return s
      const next = s.tabs.filter((t) => t.id !== id)
      let activeId = s.activeId
      if (s.activeId === id) {
        const neighbor = next[idx] ?? next[idx - 1] ?? null
        activeId = neighbor?.id ?? null
      }
      return { tabs: next, activeId }
    })
  },

  setActive: (id) => set({ activeId: id }),

  updateContent: (id, content) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, content } : t))
    })),

  markSaved: (id, savedContent, mtimeMs, path) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              savedContent,
              mtimeMs,
              path: path ?? t.path,
              title: path ? basenameFromPath(path) : t.title
            }
          : t
      )
    })),

  setViewMode: (id, mode) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, viewMode: mode } : t))
    })),

  setSplitRatio: (id, ratio) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, splitRatio: Math.max(0.1, Math.min(0.9, ratio)) } : t
      )
    })),

  rename: (id, path) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, path, title: basenameFromPath(path) } : t
      )
    })),

  reorder: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex === toIndex) return s
      const next = s.tabs.slice()
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { tabs: next }
    })
}))

export function isDirty(tab: Tab): boolean {
  return tab.content !== tab.savedContent
}
