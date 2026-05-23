import { create } from 'zustand'
import type { AIProvider, AISettings } from '@shared/ai'

interface AIState {
  settings: AISettings | null
  open: boolean
  load: () => Promise<void>
  setProvider: (p: AIProvider) => Promise<void>
  setModel: (provider: AIProvider, model: string) => Promise<void>
  setTemperature: (t: number) => Promise<void>
  setGhostText: (enabled: boolean) => Promise<void>
  setOllamaUrl: (url: string) => Promise<void>
  saveKey: (provider: AIProvider, key: string) => Promise<void>
  removeKey: (provider: AIProvider) => Promise<void>
  test: (provider: AIProvider) => Promise<{ ok: boolean; error?: string }>
  openSettings: () => void
  closeSettings: () => void
}

export const useAi = create<AIState>((set, get) => ({
  settings: null,
  open: false,

  async load() {
    const s = await window.marky.ai.getSettings()
    set({ settings: s })
  },

  async setProvider(provider) {
    const s = await window.marky.ai.setSettings({ provider })
    set({ settings: s })
  },

  async setModel(provider, model) {
    const current = get().settings
    if (!current) return
    const models: Record<AIProvider, string> = {
      ...current.models,
      [provider]: model
    }
    const s = await window.marky.ai.setSettings({ models })
    set({ settings: s })
  },

  async setTemperature(temperature) {
    const s = await window.marky.ai.setSettings({ temperature })
    set({ settings: s })
  },

  async setGhostText(ghostTextEnabled) {
    const s = await window.marky.ai.setSettings({ ghostTextEnabled })
    set({ settings: s })
  },

  async setOllamaUrl(ollamaUrl) {
    const s = await window.marky.ai.setSettings({ ollamaUrl })
    set({ settings: s })
  },

  async saveKey(provider, key) {
    const s = await window.marky.ai.setKey(provider, key)
    set({ settings: s })
  },

  async removeKey(provider) {
    const s = await window.marky.ai.deleteKey(provider)
    set({ settings: s })
  },

  test(provider) {
    return window.marky.ai.test(provider)
  },

  openSettings() {
    set({ open: true })
  },
  closeSettings() {
    set({ open: false })
  }
}))
