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
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
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
      <ToolButton onClick={() => run(md.h1)} icon={Heading1} title="Heading 1" />
      <ToolButton onClick={() => run(md.h2)} icon={Heading2} title="Heading 2" />
      <ToolButton onClick={() => run(md.h3)} icon={Heading3} title="Heading 3" />
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

function TablePicker({
  onInsert
}: {
  onInsert: (rows: number, cols: number) => void
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState({ r: 0, c: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
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
