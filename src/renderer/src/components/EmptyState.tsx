import { useTabs } from '@/store/tabs'
import { useRecent } from '@/store/recent'
import { FilePlus2, FolderOpen, Sparkles, Clock } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from '@/store/toasts'

export function EmptyState(): React.ReactElement {
  const newTab = useTabs((s) => s.newTab)
  const openFile = useTabs((s) => s.openFile)
  const recent = useRecent((s) => s.items)
  const removeRecent = useRecent((s) => s.remove)
  const addRecent = useRecent((s) => s.add)

  const handleOpen = async (): Promise<void> => {
    const files = await window.marky.files.openDialog()
    for (const f of files) {
      openFile(f)
      addRecent(f.path, '')
    }
  }

  const handleOpenRecent = async (path: string): Promise<void> => {
    try {
      const file = await window.marky.files.read(path)
      openFile(file)
      addRecent(file.path, '')
    } catch (err) {
      toast('Could not open file', {
        description: (err as Error).message ?? String(err),
        kind: 'error'
      })
      removeRecent(path)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex w-full max-w-md flex-col items-center gap-6 text-center"
      >
        <div className="relative">
          <div className="absolute -inset-6 rounded-full bg-accent/10 blur-2xl" />
          <Sparkles className="relative size-12 text-accent" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Marky</h1>
          <p className="text-sm text-muted">
            A beautiful markdown editor with AI assistance. Open a file or start writing —
            your words look good in any light.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => newTab()}
            className="flex items-center gap-2 rounded-lg border border-strong bg-elevated px-4 py-2 text-sm font-medium text-default hover:bg-panel transition-colors"
          >
            <FilePlus2 className="size-4" />
            New file
            <kbd className="ml-2 rounded bg-panel px-1.5 py-0.5 text-xs text-faint">
              Ctrl N
            </kbd>
          </button>
          <button
            onClick={() => void handleOpen()}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <FolderOpen className="size-4" />
            Open file
            <kbd className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">Ctrl O</kbd>
          </button>
        </div>

        {recent.length > 0 && (
          <div className="mt-4 w-full text-left">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-faint">
              <Clock className="size-3" />
              Recent
            </div>
            <ul className="space-y-0.5">
              {recent.slice(0, 6).map((r) => (
                <li key={r.path}>
                  <button
                    onClick={() => void handleOpenRecent(r.path)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-panel transition-colors"
                    title={r.path}
                  >
                    <span className="truncate text-default">{r.title}</span>
                    <span className="ml-auto truncate text-xs text-faint">{r.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-2 text-xs text-faint">
          Press <kbd className="rounded bg-panel px-1.5 py-0.5">Ctrl K</kbd> for the
          command palette
        </p>
      </motion.div>
    </div>
  )
}
