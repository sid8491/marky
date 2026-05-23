import { create } from 'zustand'

export interface RecentFile {
  path: string
  title: string
  lastOpened: number
}

interface RecentState {
  items: RecentFile[]
  add: (path: string, title: string) => void
  remove: (path: string) => void
  clear: () => void
}

const KEY = 'marky:recent'
const MAX = 12

function basename(p: string): string {
  const m = p.match(/[^\\/]+$/)
  return m ? m[0] : p
}

function load(): RecentFile[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecentFile[]
  } catch {
    return []
  }
}

function persist(items: RecentFile[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export const useRecent = create<RecentState>((set, get) => ({
  items: load(),
  add(path, title) {
    const next: RecentFile[] = [
      { path, title: title || basename(path), lastOpened: Date.now() },
      ...get().items.filter((i) => i.path !== path)
    ].slice(0, MAX)
    persist(next)
    set({ items: next })
  },
  remove(path) {
    const next = get().items.filter((i) => i.path !== path)
    persist(next)
    set({ items: next })
  },
  clear() {
    persist([])
    set({ items: [] })
  }
}))
