import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  resolvedDark: boolean
  syncScroll: boolean
  showLineNumbers: boolean
  setTheme: (t: Theme) => void
  toggleSyncScroll: () => void
  toggleLineNumbers: () => void
  applyTheme: () => void
}

const KEY = 'marky:settings'

interface PersistedSettings {
  theme?: Theme
  syncScroll?: boolean
  showLineNumbers?: boolean
}

function load(): PersistedSettings {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as PersistedSettings
  } catch {
    return {}
  }
}

function persist(s: PersistedSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const initial = load()

export const useSettings = create<SettingsState>((set, get) => ({
  theme: initial.theme ?? 'system',
  resolvedDark: initial.theme === 'light' ? false : initial.theme === 'dark' ? true : systemDark(),
  syncScroll: initial.syncScroll ?? true,
  showLineNumbers: initial.showLineNumbers ?? false,

  setTheme: (t) => {
    set({ theme: t })
    persist({ ...get(), theme: t })
    get().applyTheme()
  },

  toggleSyncScroll: () =>
    set((s) => {
      const next = !s.syncScroll
      persist({ ...get(), syncScroll: next })
      return { syncScroll: next }
    }),

  toggleLineNumbers: () =>
    set((s) => {
      const next = !s.showLineNumbers
      persist({ ...get(), showLineNumbers: next })
      return { showLineNumbers: next }
    }),

  applyTheme: () => {
    const { theme } = get()
    const dark = theme === 'dark' ? true : theme === 'light' ? false : systemDark()
    document.documentElement.classList.toggle('dark', dark)
    set({ resolvedDark: dark })
  }
}))

// Watch system theme
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (useSettings.getState().theme === 'system') {
      useSettings.getState().applyTheme()
    }
  })
}
