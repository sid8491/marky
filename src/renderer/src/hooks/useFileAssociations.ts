import { useEffect } from 'react'
import { useTabs } from '@/store/tabs'
import { useRecent } from '@/store/recent'
import type { FileReadResult } from '@shared/types'

function open(file: FileReadResult): void {
  useTabs.getState().openFile(file)
  useRecent.getState().add(file.path, '')
}

export function useFileAssociations(): void {
  // Pull anything queued before the renderer mounted (launch via OS file
  // association, double-click in Finder, drag-onto-icon).
  useEffect(() => {
    void window.marky.files.getPending().then((files) => {
      for (const f of files) open(f)
    })
  }, [])

  // Subscribe for runtime opens (second-instance forwarding, late open-file).
  useEffect(() => {
    return window.marky.files.onOpenFromOs((file) => open(file))
  }, [])
}
