/**
 * Tracks file writes initiated by Marky itself so the file watcher can tell
 * "we just saved this" apart from "something else modified this on disk".
 *
 * Why this exists: fs.watch fires for our own writes, and on Windows the
 * change event often reaches the renderer *before* the write IPC resolves.
 * At that instant the tab is still dirty (markSaved hasn't run yet), so the
 * watcher would wrongly show the "Reload from disk / Keep my changes" prompt.
 */

/** Paths with a write currently in flight (refcount for overlapping saves). */
const inFlight = new Map<string, number>()
/** Wall-clock time (ms) of the last completed write per path. */
const completedAt = new Map<string, number>()

/** How long after a completed write we still ignore change events. */
export const OWN_WRITE_GRACE_MS = 2000

export function beginOwnWrite(path: string): void {
  inFlight.set(path, (inFlight.get(path) ?? 0) + 1)
}

export function endOwnWrite(path: string, now: number = Date.now()): void {
  const n = (inFlight.get(path) ?? 1) - 1
  if (n <= 0) inFlight.delete(path)
  else inFlight.set(path, n)
  completedAt.set(path, now)
}

/** True if a change event for `path` is (almost certainly) our own doing. */
export function isOwnWrite(path: string, now: number = Date.now()): boolean {
  if (inFlight.has(path)) return true
  const t = completedAt.get(path)
  return t !== undefined && now - t < OWN_WRITE_GRACE_MS
}

/** Test helper. */
export function resetOwnWrites(): void {
  inFlight.clear()
  completedAt.clear()
}
