import { useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  CodeXml,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Heading,
  Table as TableIcon,
  Sigma,
  Workflow,
  ChevronDown,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { md } from '@/editor/markdownCommands'

interface Props {
  viewRef: React.MutableRefObject<EditorView | null>
}

const TABLE_MAX_ROWS = 6
const TABLE_MAX_COLS = 8

export function EditorToolbar({ viewRef }: Props): React.ReactElement {
  const run = (fn: (view: EditorView) => void): void => {
    const view = viewRef.current
    if (!view) return
    fn(view)
  }

  return (
    <div className="flex h-9 flex-shrink-0 items-center gap-0.5 overflow-x-auto border-b border-subtle bg-panel/60 px-2">
      <HeadingMenu onChoose={(level) => run((v) => md.setHeading(v, level))} />
      <Divider />
      <ToolButton onClick={() => run(md.bold)} icon={Bold} title="Bold (Ctrl+B)" />
      <ToolButton onClick={() => run(md.italic)} icon={Italic} title="Italic (Ctrl+I)" />
      <ToolButton
        onClick={() => run(md.strike)}
        icon={Strikethrough}
        title="Strikethrough"
      />
      <ToolButton onClick={() => run(md.inlineCode)} icon={Code} title="Inline code" />
      <Divider />
      <ToolButton onClick={() => run(md.link)} icon={LinkIcon} title="Link" />
      <ToolButton onClick={() => run(md.image)} icon={ImageIcon} title="Image" />
      <Divider />
      <ToolButton onClick={() => run(md.ul)} icon={List} title="Bulleted list" />
      <ToolButton onClick={() => run(md.ol)} icon={ListOrdered} title="Numbered list" />
      <ToolButton onClick={() => run(md.task)} icon={ListChecks} title="Task list" />
      <Divider />
      <ToolButton onClick={() => run(md.quote)} icon={Quote} title="Blockquote" />
      <ToolButton onClick={() => run(md.codeBlock)} icon={CodeXml} title="Code block" />
      <TablePicker onInsert={(rows, cols) => run((v) => md.table(v, rows, cols))} />
      <ToolButton onClick={() => run(md.hr)} icon={Minus} title="Horizontal rule" />
      <Divider />
      <MathMenu onInline={() => run(md.mathInline)} onBlock={() => run(md.mathBlock)} />
      <ToolButton
        onClick={() => run(md.mermaid)}
        icon={Workflow}
        title="Mermaid diagram"
      />
    </div>
  )
}

function ToolButton({
  onClick,
  icon: Icon,
  title
}: {
  onClick: () => void
  icon: LucideIcon
  title: string
}): React.ReactElement {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-default"
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  )
}

function Divider(): React.ReactElement {
  return <span className="mx-1 h-4 w-px shrink-0 bg-subtle" />
}

/* ------------------------- Dropdowns ------------------------- */

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void
): void {
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, ref, close])
}

type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6
const HEADING_ITEMS: Array<{ level: HeadingLevel; label: string; sizeClass: string }> = [
  { level: 0, label: 'Paragraph', sizeClass: 'text-sm' },
  { level: 1, label: 'Heading 1', sizeClass: 'text-xl font-bold' },
  { level: 2, label: 'Heading 2', sizeClass: 'text-lg font-bold' },
  { level: 3, label: 'Heading 3', sizeClass: 'text-base font-semibold' },
  { level: 4, label: 'Heading 4', sizeClass: 'text-sm font-semibold' },
  { level: 5, label: 'Heading 5', sizeClass: 'text-xs font-semibold' },
  {
    level: 6,
    label: 'Heading 6',
    sizeClass: 'text-xs font-medium uppercase tracking-wide'
  }
]

function HeadingMenu({
  onChoose
}: {
  onChoose: (level: HeadingLevel) => void
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, open, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        title="Heading level"
        className="flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-muted transition-colors hover:bg-elevated hover:text-default"
      >
        <Heading className="size-4" strokeWidth={1.75} />
        <ChevronDown className="size-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 z-40 mt-1 w-44 rounded-lg border border-strong bg-elevated p-1 shadow-elevated"
          >
            {HEADING_ITEMS.map((item) => (
              <button
                key={item.level}
                onClick={() => {
                  onChoose(item.level)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-muted transition-colors hover:bg-panel hover:text-default"
              >
                <span className={item.sizeClass}>{item.label}</span>
                <span className="font-mono text-xs text-faint">
                  {item.level === 0 ? '¶' : '#'.repeat(item.level)}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MathMenu({
  onInline,
  onBlock
}: {
  onInline: () => void
  onBlock: () => void
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, open, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        title="Math (KaTeX)"
        className="flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-muted transition-colors hover:bg-elevated hover:text-default"
      >
        <Sigma className="size-4" strokeWidth={1.75} />
        <ChevronDown className="size-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 z-40 mt-1 w-52 rounded-lg border border-strong bg-elevated p-1 shadow-elevated"
          >
            <button
              onClick={() => {
                onInline()
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-muted transition-colors hover:bg-panel hover:text-default"
            >
              <span className="text-sm">Inline math</span>
              <span className="font-mono text-xs text-faint">$x$</span>
            </button>
            <button
              onClick={() => {
                onBlock()
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-muted transition-colors hover:bg-panel hover:text-default"
            >
              <span className="text-sm">Block math</span>
              <span className="font-mono text-xs text-faint">$$…$$</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TablePicker({
  onInsert
}: {
  onInsert: (rows: number, cols: number) => void
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState({ r: 0, c: 0 })
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, open, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <ToolButton
        onClick={() => setOpen((o) => !o)}
        icon={TableIcon}
        title="Insert table"
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 z-40 mt-1 rounded-lg border border-strong bg-elevated p-2 shadow-elevated"
          >
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${TABLE_MAX_COLS}, 1rem)`,
                gridTemplateRows: `repeat(${TABLE_MAX_ROWS}, 1rem)`
              }}
              onMouseLeave={() => setHover({ r: 0, c: 0 })}
            >
              {Array.from({ length: TABLE_MAX_ROWS }).flatMap((_, r) =>
                Array.from({ length: TABLE_MAX_COLS }).map((_, c) => {
                  const within = r < hover.r && c < hover.c
                  return (
                    <button
                      key={`${r}-${c}`}
                      onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                      onClick={() => {
                        onInsert(r + 1, c + 1)
                        setOpen(false)
                        setHover({ r: 0, c: 0 })
                      }}
                      className={cn(
                        'h-4 w-4 rounded border transition-colors',
                        within
                          ? 'border-accent bg-accent/60'
                          : 'border-subtle bg-panel hover:border-strong'
                      )}
                      aria-label={`Insert ${r + 1} × ${c + 1} table`}
                    />
                  )
                })
              )}
            </div>
            <div className="mt-2 text-center font-mono text-xs text-faint">
              {hover.r > 0 ? `${hover.r} × ${hover.c}` : 'Choose size'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
