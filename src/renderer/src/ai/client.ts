import { uid } from '@/lib/id'
import type { AIChatRequest, AIStreamEvent } from '@shared/ai'

type Sub = (event: AIStreamEvent) => void

const subs = new Map<string, Sub>()
let initialized = false

function ensureSub(): void {
  if (initialized) return
  initialized = true
  window.marky.ai.onEvent((id, event) => {
    const cb = subs.get(id)
    if (cb) cb(event)
  })
}

export interface AIStreamHandle {
  id: string
  cancel: () => void
}

export function startStream(
  request: AIChatRequest,
  onEvent: Sub
): AIStreamHandle {
  ensureSub()
  const id = uid('ai')
  subs.set(id, (event) => {
    onEvent(event)
    if (event.type === 'done' || event.type === 'error') {
      subs.delete(id)
    }
  })
  void window.marky.ai.stream(id, request).then((res) => {
    if (!res.accepted) {
      const cb = subs.get(id)
      cb?.({ type: 'error', message: res.error ?? 'request not accepted' })
      subs.delete(id)
    }
  })
  return {
    id,
    cancel: () => {
      window.marky.ai.cancel(id)
      subs.delete(id)
    }
  }
}

export async function streamToString(
  request: AIChatRequest,
  onChunk?: (text: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = ''
    startStream(request, (event) => {
      if (event.type === 'chunk') {
        out += event.text
        onChunk?.(event.text)
      } else if (event.type === 'done') {
        resolve(out)
      } else if (event.type === 'error') {
        reject(new Error(event.message))
      }
    })
  })
}
