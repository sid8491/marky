export type ScrollSource = 'editor' | 'preview'
export type ScrollListener = (source: ScrollSource, fraction: number) => void

const listeners = new Set<ScrollListener>()

export function broadcastScroll(source: ScrollSource, fraction: number): void {
  for (const l of listeners) l(source, fraction)
}

export function subscribeScroll(l: ScrollListener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function scrollFraction(el: HTMLElement): number {
  const max = el.scrollHeight - el.clientHeight
  return max > 0 ? el.scrollTop / max : 0
}

export function applyScrollFraction(el: HTMLElement, fraction: number): void {
  const max = el.scrollHeight - el.clientHeight
  if (max <= 0) return
  el.scrollTop = Math.max(0, Math.min(max, fraction * max))
}
