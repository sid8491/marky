import { Decoration, EditorView, ViewPlugin, WidgetType, keymap } from '@codemirror/view'
import { Prec, StateEffect, StateField, type Extension } from '@codemirror/state'
import { useAi } from '@/store/ai'
import { startStream, type AIStreamHandle } from '@/ai/client'
import { buildContinueRequest } from '@/ai/prompts'

const CONTEXT_BYTES = 2000
const MIN_TRIGGER_LENGTH = 6
const MAX_SUGGEST_LENGTH = 240

interface Ghost {
  text: string
  pos: number
}

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super()
  }
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-ghost-text'
    span.textContent = this.text
    return span
  }
  eq(other: GhostWidget): boolean {
    return other.text === this.text
  }
  ignoreEvent(): boolean {
    return true
  }
}

const setGhostEffect = StateEffect.define<Ghost | null>()

const ghostField = StateField.define<Ghost | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setGhostEffect)) return e.value
    }
    if (tr.docChanged || tr.selection) {
      // any user input dismisses the suggestion
      return null
    }
    return value
  },
  provide: (f) =>
    EditorView.decorations.from(f, (v) => {
      if (!v) return Decoration.none
      return Decoration.set([
        Decoration.widget({
          widget: new GhostWidget(v.text),
          side: 1
        }).range(v.pos)
      ])
    })
})

function getGhost(view: EditorView): Ghost | null {
  return view.state.field(ghostField, false) ?? null
}

function clearGhost(view: EditorView): void {
  view.dispatch({ effects: setGhostEffect.of(null) })
}

function acceptGhost(view: EditorView): boolean {
  const g = getGhost(view)
  if (!g) return false
  view.dispatch({
    changes: { from: g.pos, insert: g.text },
    selection: { anchor: g.pos + g.text.length },
    effects: setGhostEffect.of(null)
  })
  return true
}

function trimTrailingFences(s: string): string {
  return s.replace(/^[ \t]*```[^\n]*\n?/, '').replace(/```\s*$/, '')
}

/**
 * Fetch an AI continuation at the current cursor and show it as ghost-text.
 * Public API: call this in response to an explicit user request (shortcut,
 * command palette, etc.). Returns true if a request was started.
 */
export function requestGhostText(view: EditorView): boolean {
  const settings = useAi.getState().settings
  if (!settings) return false

  const state = view.state
  const sel = state.selection.main
  if (!sel.empty) return false
  const pos = sel.head
  const doc = state.doc
  if (doc.length < MIN_TRIGGER_LENGTH) return false

  const from = Math.max(0, pos - CONTEXT_BYTES)
  const context = doc.sliceString(from, pos)
  if (!context.trim()) return false

  const request = buildContinueRequest({
    provider: settings.provider,
    model: settings.models[settings.provider],
    temperature: 0.3,
    context
  })

  let accumulated = ''
  const startedPos = pos
  let handle: AIStreamHandle | null = null
  handle = startStream(request, (event) => {
    if (event.type === 'chunk') {
      accumulated += event.text
      if (accumulated.length > MAX_SUGGEST_LENGTH) {
        handle?.cancel()
        handle = null
      }
      const current = view.state.selection.main
      if (current.head !== startedPos || !current.empty) return
      const trimmed = trimTrailingFences(accumulated)
      if (!trimmed) return
      view.dispatch({
        effects: setGhostEffect.of({ text: trimmed, pos: startedPos })
      })
    } else if (event.type === 'done' || event.type === 'error') {
      handle = null
    }
  })
  return true
}

class AutoScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null

  schedule(view: EditorView): void {
    this.cancel()
    const settings = useAi.getState().settings
    if (!settings?.ghostTextEnabled) return

    this.timer = setTimeout(() => {
      const state = view.state
      const sel = state.selection.main
      if (!sel.empty) return
      // Only at end of a non-empty line — avoids interrupting mid-word.
      const line = state.doc.lineAt(sel.head)
      if (sel.head !== line.to || !line.text.trim()) return
      requestGhostText(view)
    }, settings.ghostTextDebounceMs)
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

const ghostKeymap = keymap.of([
  {
    key: 'Tab',
    run: (view) => acceptGhost(view)
  },
  {
    key: 'Escape',
    run: (view) => {
      if (!getGhost(view)) return false
      clearGhost(view)
      return true
    }
  },
  {
    // Manual trigger — fires regardless of the auto-suggest setting.
    key: 'Mod-j',
    run: (view) => requestGhostText(view)
  }
])

export function ghostTextExtension(): Extension {
  const scheduler = new AutoScheduler()
  return [
    ghostField,
    // Run before the EditorPane's other keymaps so Tab is captured for
    // accept-ghost instead of indentWithTab. acceptGhost / Escape handlers
    // return false when no suggestion is active, so Tab still falls through
    // to indenting in the normal case.
    Prec.highest(ghostKeymap),
    ViewPlugin.fromClass(
      class {
        constructor(readonly view: EditorView) {}
        update(update: import('@codemirror/view').ViewUpdate): void {
          // Only schedule on actual typing, never on cursor moves alone.
          // requestGhostText() is the explicit-trigger path.
          if (update.docChanged) {
            scheduler.schedule(this.view)
          } else if (update.selectionSet) {
            scheduler.cancel()
          }
        }
        destroy(): void {
          scheduler.cancel()
        }
      }
    ),
    EditorView.baseTheme({
      '.cm-ghost-text': {
        color: 'rgba(125, 130, 145, 0.7)',
        fontStyle: 'italic',
        pointerEvents: 'none',
        userSelect: 'none'
      }
    })
  ]
}
