import { useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { AnimatePresence, motion } from 'motion/react'
import {
  Sparkles,
  Wand2,
  Shrink,
  Expand,
  CheckCheck,
  ArrowRight,
  Loader2,
  X,
  ChevronDown
} from 'lucide-react'
import { useAi } from '@/store/ai'
import { startStream, type AIStreamHandle } from '@/ai/client'
import { buildRefineRequest, type RefineAction } from '@/ai/prompts'
import { toast } from '@/store/toasts'
import { cn } from '@/lib/cn'
import type { SelectionInfo } from '@/editor/selectionTracker'

interface RefineState {
  active: boolean
  originalText: string
  originalFrom: number
  originalTo: number
  replacement: string
  streaming: boolean
  action: RefineAction
  handle: AIStreamHandle | null
}

const initialRefine: RefineState = {
  active: false,
  originalText: '',
  originalFrom: 0,
  originalTo: 0,
  replacement: '',
  streaming: false,
  action: 'rewrite',
  handle: null
}

const TONE_OPTIONS: { value: RefineAction; label: string }[] = [
  { value: 'tone-formal', label: 'Formal' },
  { value: 'tone-casual', label: 'Casual' },
  { value: 'tone-technical', label: 'Technical' },
  { value: 'tone-friendly', label: 'Friendly' }
]

export function SelectionToolbar({
  info,
  viewRef
}: {
  info: SelectionInfo | null
  viewRef: React.MutableRefObject<EditorView | null>
}): React.ReactElement | null {
  const settings = useAi((s) => s.settings)
  const [refine, setRefine] = useState<RefineState>(initialRefine)
  const [tonesOpen, setTonesOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Derived: menus only show when a selection exists.
  const showTones = tonesOpen && info != null
  const showCustom = customOpen && info != null

  if (!info && !refine.active) return null

  const startRefine = (action: RefineAction, customInstruction?: string): void => {
    if (!settings) {
      toast('Configure AI first', {
        description: 'Open Settings (Ctrl+,) to set a provider and API key.',
        kind: 'error'
      })
      return
    }
    const view = viewRef.current
    if (!view || !info) return

    const request = buildRefineRequest({
      provider: settings.provider,
      model: settings.models[settings.provider],
      temperature: settings.temperature,
      action,
      customInstruction,
      selection: info.text
    })

    const state: RefineState = {
      active: true,
      originalText: info.text,
      originalFrom: info.from,
      originalTo: info.to,
      replacement: '',
      streaming: true,
      action,
      handle: null
    }
    setRefine(state)

    let buffered = ''
    let currentTo = info.to
    const handle = startStream(request, (event) => {
      if (event.type === 'chunk') {
        buffered += event.text
        // Replace `originalFrom..currentTo` with `buffered`.
        const v = viewRef.current
        if (!v) return
        v.dispatch({
          changes: {
            from: state.originalFrom,
            to: currentTo,
            insert: buffered
          },
          selection: { anchor: state.originalFrom + buffered.length }
        })
        currentTo = state.originalFrom + buffered.length
        setRefine((s) => ({ ...s, replacement: buffered }))
      } else if (event.type === 'done') {
        setRefine((s) => ({ ...s, streaming: false, handle: null }))
      } else if (event.type === 'error') {
        toast('AI request failed', {
          description: event.message,
          kind: 'error'
        })
        // restore original
        const v = viewRef.current
        if (v) {
          v.dispatch({
            changes: {
              from: state.originalFrom,
              to: state.originalFrom + buffered.length,
              insert: state.originalText
            }
          })
        }
        setRefine(initialRefine)
      }
    })
    setRefine((s) => ({ ...s, handle }))
  }

  const accept = (): void => {
    refine.handle?.cancel()
    setRefine(initialRefine)
  }

  const reject = (): void => {
    refine.handle?.cancel()
    const v = viewRef.current
    if (v) {
      v.dispatch({
        changes: {
          from: refine.originalFrom,
          to: refine.originalFrom + refine.replacement.length,
          insert: refine.originalText
        },
        selection: {
          anchor: refine.originalFrom,
          head: refine.originalFrom + refine.originalText.length
        }
      })
    }
    setRefine(initialRefine)
  }

  const tryAgain = (): void => {
    reject()
    setTimeout(() => startRefine(refine.action), 50)
  }

  // Positioning: above the selection if room, else below
  const top = info ? Math.max(8, info.top - 44) : 8
  const left = info ? Math.max(8, info.centerX) : 8

  if (refine.active) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'pointer-events-auto absolute z-30 -translate-x-1/2 rounded-lg border border-strong bg-elevated px-1.5 py-1 shadow-elevated'
        )}
        style={{
          top: Math.max(8, refine.streaming ? top : top),
          left
        }}
      >
        <div className="flex items-center gap-1">
          {refine.streaming ? (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted">
              <Loader2 className="size-3 animate-spin text-accent" />
              <span>Refining…</span>
              <button
                onClick={reject}
                className="ml-1 rounded p-0.5 hover:bg-panel"
                aria-label="Cancel"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={accept}
                className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                <CheckCheck className="size-3" />
                Accept
              </button>
              <button
                onClick={reject}
                className="rounded-md px-2 py-1 text-xs text-muted hover:bg-panel hover:text-default"
              >
                Reject
              </button>
              <button
                onClick={tryAgain}
                className="rounded-md px-2 py-1 text-xs text-muted hover:bg-panel hover:text-default"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  if (!info) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        key="sel-toolbar"
        initial={{ opacity: 0, y: 4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 480, damping: 28 }}
        className="pointer-events-auto absolute z-30 -translate-x-1/2 rounded-lg border border-strong bg-elevated px-1 py-1 shadow-elevated"
        style={{ top, left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => startRefine('rewrite')}
            icon={<Wand2 className="size-3" />}
            label="Rewrite"
          />
          <ToolbarButton
            onClick={() => startRefine('shorter')}
            icon={<Shrink className="size-3" />}
            label="Shorter"
          />
          <ToolbarButton
            onClick={() => startRefine('longer')}
            icon={<Expand className="size-3" />}
            label="Longer"
          />
          <ToolbarButton
            onClick={() => startRefine('grammar')}
            icon={<CheckCheck className="size-3" />}
            label="Grammar"
          />
          <ToolbarButton
            onClick={() => startRefine('continue')}
            icon={<ArrowRight className="size-3" />}
            label="Continue"
          />
          <div className="relative">
            <ToolbarButton
              onClick={() => setTonesOpen((s) => !s)}
              icon={<ChevronDown className="size-3" />}
              label="Tone"
              trailing
            />
            <AnimatePresence>
              {showTones && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 min-w-32 rounded-md border border-strong bg-elevated p-1 shadow-elevated"
                >
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setTonesOpen(false)
                        startRefine(t.value)
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-xs text-muted hover:bg-panel hover:text-default"
                    >
                      {t.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mx-1 h-4 w-px bg-subtle" />
          <ToolbarButton
            onClick={() => setCustomOpen((s) => !s)}
            icon={<Sparkles className="size-3" />}
            label="Ask AI"
          />
        </div>
        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 flex items-center gap-1 border-t border-subtle px-1 pt-1">
                <input
                  autoFocus
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Make it more like…"
                  className="w-64 bg-transparent px-2 py-1 text-xs placeholder:text-faint focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      e.preventDefault()
                      setCustomOpen(false)
                      startRefine('custom', customInput.trim())
                      setCustomInput('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (customInput.trim()) {
                      setCustomOpen(false)
                      startRefine('custom', customInput.trim())
                      setCustomInput('')
                    }
                  }}
                  disabled={!customInput.trim()}
                  className="rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

function ToolbarButton({
  onClick,
  icon,
  label,
  trailing
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  trailing?: boolean
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-panel hover:text-default transition-colors"
    >
      {!trailing && icon}
      <span>{label}</span>
      {trailing && icon}
    </button>
  )
}
