import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

/* ------------------------- Dropdown infrastructure ------------------------- */

/**
 * Generic dropdown trigger + floating menu. The menu uses position: fixed and
 * is positioned from the trigger's bounding rect, so it escapes any
 * overflow-clipping parent (the toolbar uses overflow-x-auto, which collapses
 * overflow-y too and would clip menus rendered inside it).
 */
function Dropdown({
  trigger,
  children,
  menuClassName,
  align = 'left'
}: {
  trigger: (props: {
    open: boolean
    toggle: () => void
    ref: React.RefObject<HTMLButtonElement | null>
  }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  menuClassName?: string
  align?: 'left' | 'right'
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const reposition = (): void => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const left = align === 'right' ? r.right : r.left
    setPos({ top: r.bottom + 4, left })
  }

  const toggle = (): void => {
    if (!open) reposition()
    setOpen((o) => !o)
  }
  const close = (): void => setOpen(false)

  // Keep the menu glued to the button while it's open.
  useLayoutEffect(() => {
    if (!open) return
    reposition()
    const onMove = (): void => reposition()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close on click outside (the menu lives in a portal-ish fixed layer, so
  // check both the button and the menu).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      close()
    }
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <>
      {trigger({ open, toggle, ref: buttonRef })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed',
              top: pos.top,
              left: align === 'left' ? pos.left : undefined,
              right: align === 'right' ? window.innerWidth - pos.left : undefined
            }}
            className={cn(
              'z-50 rounded-lg border border-strong bg-elevated p-1 shadow-elevated',
              menuClassName
            )}
            onMouseDown={(e) => e.preventDefault()}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ------------------------- Specific menus ------------------------- */

type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6
const HEADING_ITEMS: Array<{ level: HeadingLevel; label: string; sizeClass: string }> = [
  { level: 0, label: 'Paragraph', sizeClass: 'text-sm' },
  { level: 1, label: 'Heading 1', sizeClass: 'text-2xl font-bold' },
  { level: 2, label: 'Heading 2', sizeClass: 'text-xl font-bold' },
  { level: 3, label: 'Heading 3', sizeClass: 'text-lg font-semibold' },
  { level: 4, label: 'Heading 4', sizeClass: 'text-base font-semibold' },
  { level: 5, label: 'Heading 5', sizeClass: 'text-sm font-semibold' },
  { level: 6, label: 'Heading 6', sizeClass: 'text-xs font-semibold' }
]

function HeadingMenu({
  onChoose
}: {
  onChoose: (level: HeadingLevel) => void
}): React.ReactElement {
  return (
    <Dropdown
      menuClassName="w-44"
      trigger={({ toggle, ref }) => (
        <button
          ref={ref}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          title="Heading level"
          className="flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-muted transition-colors hover:bg-elevated hover:text-default"
        >
          <Heading className="size-4" strokeWidth={1.75} />
          <ChevronDown className="size-3" />
        </button>
      )}
    >
      {(close) =>
        HEADING_ITEMS.map((item) => (
          <button
            key={item.level}
            onClick={() => {
              onChoose(item.level)
              close()
            }}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-muted transition-colors hover:bg-panel hover:text-default"
          >
            <span className={item.sizeClass}>{item.label}</span>
            <span className="font-mono text-xs text-faint">
              {item.level === 0 ? '¶' : '#'.repeat(item.level)}
            </span>
          </button>
        ))
      }
    </Dropdown>
  )
}

function MathMenu({
  onInline,
  onBlock
}: {
  onInline: () => void
  onBlock: () => void
}): React.ReactElement {
  return (
    <Dropdown
      menuClassName="w-52"
      trigger={({ toggle, ref }) => (
        <button
          ref={ref}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          title="Math (KaTeX)"
          className="flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-muted transition-colors hover:bg-elevated hover:text-default"
        >
          <Sigma className="size-4" strokeWidth={1.75} />
          <ChevronDown className="size-3" />
        </button>
      )}
    >
      {(close) => (
        <>
          <button
            onClick={() => {
              onInline()
              close()
            }}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-muted transition-colors hover:bg-panel hover:text-default"
          >
            <span className="text-sm">Inline math</span>
            <span className="font-mono text-xs text-faint">$x$</span>
          </button>
          <button
            onClick={() => {
              onBlock()
              close()
            }}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-muted transition-colors hover:bg-panel hover:text-default"
          >
            <span className="text-sm">Block math</span>
            <span className="font-mono text-xs text-faint">$$…$$</span>
          </button>
        </>
      )}
    </Dropdown>
  )
}

function TablePicker({
  onInsert
}: {
  onInsert: (rows: number, cols: number) => void
}): React.ReactElement {
  const [hover, setHover] = useState({ r: 0, c: 0 })

  return (
    <Dropdown
      menuClassName="p-2"
      trigger={({ toggle, ref }) => (
        <button
          ref={ref}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          title="Insert table"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-default"
        >
          <TableIcon className="size-4" strokeWidth={1.75} />
        </button>
      )}
    >
      {(close) => (
        <>
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
                      setHover({ r: 0, c: 0 })
                      close()
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
        </>
      )}
    </Dropdown>
  )
}
