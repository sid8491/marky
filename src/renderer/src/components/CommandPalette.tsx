import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  FilePlus2,
  FolderOpen,
  Save,
  FileDown,
  XCircle,
  Sun,
  Moon,
  Monitor,
  Columns2,
  Eye,
  FileText,
  Hash,
  ArrowDownUp,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { useTabs } from '@/store/tabs'
import { useSettings } from '@/store/settings'
import { useRecent } from '@/store/recent'
import { useFileCommands } from '@/hooks/useFileCommands'
import { cn } from '@/lib/cn'
import { getActiveEditorView } from '@/editor/activeView'
import { requestGhostText } from '@/editor/ghostText'
import { toast } from '@/store/toasts'

interface Command {
  id: string
  label: string
  hint?: string
  group: 'File' | 'View' | 'Theme' | 'AI' | 'Recent'
  shortcut?: string
  icon: LucideIcon
  run: () => void | Promise<void>
}

export function CommandPalette(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const cmds = useFileCommands()
  const setTheme = useSettings((s) => s.setTheme)
  const toggleSyncScroll = useSettings((s) => s.toggleSyncScroll)
  const toggleLineNumbers = useSettings((s) => s.toggleLineNumbers)
  const tabs = useTabs((s) => s.tabs)
  const activeId = useTabs((s) => s.activeId)
  const setViewMode = useTabs((s) => s.setViewMode)
  const recent = useRecent((s) => s.items)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setActiveIndex(0)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'file.new',
        label: 'New file',
        group: 'File',
        shortcut: 'Ctrl N',
        icon: FilePlus2,
        run: () => {
          cmds.newDoc()
        }
      },
      {
        id: 'file.open',
        label: 'Open file…',
        group: 'File',
        shortcut: 'Ctrl O',
        icon: FolderOpen,
        run: () => cmds.openFile()
      },
      {
        id: 'file.save',
        label: 'Save',
        group: 'File',
        shortcut: 'Ctrl S',
        icon: Save,
        run: () => cmds.saveActive()
      },
      {
        id: 'file.saveAs',
        label: 'Save as…',
        group: 'File',
        shortcut: 'Ctrl Shift S',
        icon: Save,
        run: () => cmds.saveActiveAs()
      },
      {
        id: 'file.export.pdf',
        label: 'Export to PDF',
        group: 'File',
        shortcut: 'Ctrl E',
        icon: FileDown,
        run: () => cmds.exportPdf()
      },
      {
        id: 'file.close',
        label: 'Close tab',
        group: 'File',
        shortcut: 'Ctrl W',
        icon: XCircle,
        run: () => cmds.closeActive()
      },
      {
        id: 'view.edit',
        label: 'View: Editor only',
        group: 'View',
        shortcut: 'Ctrl Shift E',
        icon: FileText,
        run: () => {
          if (activeId) setViewMode(activeId, 'edit')
        }
      },
      {
        id: 'view.split',
        label: 'View: Split',
        group: 'View',
        shortcut: 'Ctrl \\',
        icon: Columns2,
        run: () => {
          if (activeId) setViewMode(activeId, 'split')
        }
      },
      {
        id: 'view.preview',
        label: 'View: Preview only',
        group: 'View',
        shortcut: 'Ctrl Shift V',
        icon: Eye,
        run: () => {
          if (activeId) setViewMode(activeId, 'preview')
        }
      },
      {
        id: 'view.syncScroll',
        label: 'Toggle synced scroll',
        group: 'View',
        icon: ArrowDownUp,
        run: () => toggleSyncScroll()
      },
      {
        id: 'view.lineNumbers',
        label: 'Toggle line numbers',
        group: 'View',
        icon: Hash,
        run: () => toggleLineNumbers()
      },
      {
        id: 'theme.light',
        label: 'Theme: Light',
        group: 'Theme',
        icon: Sun,
        run: () => setTheme('light')
      },
      {
        id: 'theme.dark',
        label: 'Theme: Dark',
        group: 'Theme',
        icon: Moon,
        run: () => setTheme('dark')
      },
      {
        id: 'theme.system',
        label: 'Theme: System',
        group: 'Theme',
        icon: Monitor,
        run: () => setTheme('system')
      },
      {
        id: 'ai.continue',
        label: 'AI: Suggest continuation at cursor',
        group: 'AI',
        shortcut: 'Ctrl J',
        icon: Sparkles,
        run: () => {
          const view = getActiveEditorView()
          if (!view) {
            toast('No active editor', { kind: 'info' })
            return
          }
          view.focus()
          const ok = requestGhostText(view)
          if (!ok) {
            toast('Nothing to continue from', {
              description: 'Place the cursor at the end of some text first.',
              kind: 'info'
            })
          }
        }
      },
      ...recent.slice(0, 8).map<Command>((r) => ({
        id: `recent:${r.path}`,
        label: r.title,
        hint: r.path,
        group: 'Recent',
        icon: FolderOpen,
        run: () => cmds.openPath(r.path)
      }))
    ]
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, activeId, recent])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands
      .map((c) => ({
        c,
        score: score(`${c.label} ${c.hint ?? ''} ${c.group}`, q)
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c)
  }, [query, commands])

  const run = (cmd: Command): void => {
    setOpen(false)
    setQuery('')
    void cmd.run()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-strong bg-elevated shadow-elevated"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveIndex((i) => Math.max(0, i - 1))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const cmd = filtered[activeIndex]
                  if (cmd) run(cmd)
                }
              }}
              placeholder="Type a command or search…"
              className="w-full border-b border-subtle bg-transparent px-4 py-3 text-sm placeholder:text-faint focus:outline-none"
            />
            <div className="max-h-80 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-faint">No results</div>
              )}
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => run(c)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left text-sm',
                    i === activeIndex ? 'bg-panel text-default' : 'text-muted'
                  )}
                >
                  <c.icon className="size-4 shrink-0 text-faint" />
                  <span className="flex-1 truncate">
                    {c.label}
                    {c.hint && <span className="ml-2 text-xs text-faint">{c.hint}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-faint">{c.group}</span>
                  {c.shortcut && (
                    <kbd className="ml-2 shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-faint">
                      {c.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// simple subsequence + substring scoring
function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (h.includes(n)) return 1000 - h.indexOf(n)
  let hi = 0
  let matched = 0
  let bonus = 0
  for (let ni = 0; ni < n.length; ni++) {
    const target = n[ni]
    let found = -1
    for (let i = hi; i < h.length; i++) {
      if (h[i] === target) {
        found = i
        break
      }
    }
    if (found === -1) return 0
    matched += 1
    if (found === hi) bonus += 2
    hi = found + 1
  }
  return matched * 10 + bonus
}
