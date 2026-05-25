import { useEffect, useRef } from 'react'
import { useTabs } from '@/store/tabs'
import { toast } from '@/store/toasts'
import type { Draft } from '@shared/types'

/**
 * On startup, look for crash-recovery drafts left behind by a previous run.
 * If any exist, surface a single toast with Restore / Discard actions —
 * we don't auto-restore because the user may have rebooted intentionally
 * and not want a flood of old buffers reopening.
 */
export function useDraftRestore(): void {
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    void (async () => {
      const drafts = await window.marky.drafts.list()
      const recoverable = drafts.filter((d) => d.content !== d.savedContent)
      if (recoverable.length === 0) return

      const restoreAll = async (): Promise<void> => {
        const { restoreFromDraft } = useTabs.getState()
        for (const draft of recoverable) {
          restoreFromDraft(draft)
          await window.marky.drafts.delete(draft.draftId)
        }
        toast(`Restored ${recoverable.length} unsaved draft${plural(recoverable)}`, {
          kind: 'success'
        })
      }

      const discardAll = async (): Promise<void> => {
        await window.marky.drafts.clearAll()
      }

      toast(
        `Recover ${recoverable.length} unsaved draft${plural(recoverable)} from last session?`,
        {
          description: previewTitles(recoverable),
          duration: 0,
          actions: [
            { label: 'Restore', onClick: restoreAll },
            { label: 'Discard', onClick: discardAll }
          ]
        }
      )
    })()
  }, [])
}

function plural(arr: Draft[]): string {
  return arr.length === 1 ? '' : 's'
}

function previewTitles(drafts: Draft[]): string {
  const titles = drafts.map((d) => d.title)
  if (titles.length <= 3) return titles.join(', ')
  return titles.slice(0, 3).join(', ') + ` +${titles.length - 3} more`
}
