import { useEffect } from 'react'
import * as fileCmds from '@/commands/file'

/**
 * Register the global keyboard shortcuts for file commands. Call exactly once
 * (in App.tsx). The actual command functions live in commands/file.ts and can
 * be imported directly elsewhere (command palette, toolbar) without going
 * through this hook — that would double-register the keydown listener.
 */
export function useFileCommands(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        fileCmds.newDoc()
      } else if (key === 'o') {
        e.preventDefault()
        void fileCmds.openFile()
      } else if (key === 's' && e.shiftKey) {
        e.preventDefault()
        void fileCmds.saveActiveAs()
      } else if (key === 's') {
        e.preventDefault()
        void fileCmds.saveActive()
      } else if (key === 'w') {
        e.preventDefault()
        void fileCmds.closeActive()
      } else if (key === 'e' && !e.shiftKey) {
        // Ctrl+Shift+E is the editor-only view-mode shortcut — leave it alone.
        e.preventDefault()
        void fileCmds.exportPdf()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
