import { create } from 'zustand'
import type { UpdateEvent } from '@shared/ipc-contract'

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

interface UpdateStatusState {
  phase: UpdatePhase
  /** 0-100, only meaningful while phase === 'downloading'. */
  percent: number
  /** The version string from the most recent available/downloaded event. */
  version: string | null
  errorMessage: string | null
  apply: (event: UpdateEvent) => void
  reset: () => void
}

export const useUpdateStatus = create<UpdateStatusState>((set) => ({
  phase: 'idle',
  percent: 0,
  version: null,
  errorMessage: null,

  apply: (event) => {
    switch (event.type) {
      case 'checking':
        set({ phase: 'checking', percent: 0, errorMessage: null })
        return
      case 'available':
        set({
          phase: 'available',
          version: event.version,
          percent: 0,
          errorMessage: null
        })
        return
      case 'not-available':
        set({ phase: 'not-available', percent: 0, errorMessage: null })
        return
      case 'downloading':
        set({ phase: 'downloading', percent: event.percent, errorMessage: null })
        return
      case 'downloaded':
        set({
          phase: 'downloaded',
          percent: 100,
          version: event.version,
          errorMessage: null
        })
        return
      case 'error':
        set({ phase: 'error', errorMessage: event.message })
        return
    }
  },

  reset: () => set({ phase: 'idle', percent: 0, version: null, errorMessage: null })
}))
