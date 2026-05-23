import { create } from 'zustand'
import { uid } from '@/lib/id'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface Toast {
  id: string
  title: string
  description?: string
  kind?: ToastKind
  actions?: ToastAction[]
  /** ms; 0 = persist until dismissed */
  duration?: number
}

interface ToastState {
  items: Toast[]
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push(toast) {
    const id = uid('toast')
    set({ items: [...get().items, { ...toast, id }] })
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration)
    }
    return id
  },
  dismiss(id) {
    set({ items: get().items.filter((t) => t.id !== id) })
  }
}))

export function toast(title: string, opts?: Omit<Toast, 'id' | 'title'>): string {
  return useToasts.getState().push({ title, ...opts })
}
