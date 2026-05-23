import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap
} from '@codemirror/view'
import { StateEffect, StateField, type Extension } from '@codemirror/state'
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
    // preserve leading/trailing whitespace
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
      // any user input dismisses the suggestion; the plugin schedules a fresh one
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
  }
])

class GhostFetcher {
  private inflight: AIStreamHandle | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  schedule(view: EditorView): void {
    this.cancel()
    const settings = useAi.getState().settings
    if (!settings || !settings.ghostTextEnabled) return
    const debounce = settings.ghostTextDebounceMs

    this.timer = setTimeout(() => {
      void this.run(view)
    }, debounce)
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.inflight) {
      this.inflight.cancel()
      this.inflight = null
    }
  }

  private async run(view: EditorView): Promise<void> {
    const settings = useAi.getState().settings
    if (!settings || !settings.ghostTextEnabled) return

    const state = view.state
    const sel = state.selection.main
    if (!sel.empty) return
    const pos = sel.head
    const doc = state.doc
    if (doc.length < MIN_TRIGGER_LENGTH) return
    // Only suggest at end of a non-empty line; avoids interrupting mid-word.
    const line = doc.lineAt(pos)
    if (pos !== line.to) return
    if (!line.text.trim()) return

    const from = Math.max(0, pos - CONTEXT_BYTES)
    const context = doc.sliceString(from, pos)

    const request = buildContinueRequest({
      provider: settings.provider,
      model: settings.models[settings.provider],
      temperature: 0.3,
      context
    })

    let accumulated = ''
    const startedPos = pos
    this.inflight = startStream(request, (event) => {
      if (event.type === 'chunk') {
        accumulated += event.text
        if (accumulated.length > MAX_SUGGEST_LENGTH) {
          this.inflight?.cancel()
          this.inflight = null
        }
        // Make sure the cursor hasn't moved before showing
        const current = view.state.selection.main
        if (current.head !== startedPos || !current.empty) return
        const trimmed = trimTrailingFences(accumulated)
        if (!trimmed) return
        view.dispatch({
          effects: setGhostEffect.of({ text: trimmed, pos: startedPos })
        })
      } else if (event.type === 'done' || event.type === 'error') {
        this.inflight = null
      }
    })
  }
}

function trimTrailingFences(s: string): string {
  return s.replace(/^[ \t]*```[^\n]*\n?/, '').replace(/```\s*$/, '')
}

export function ghostTextExtension(): Extension {
  const fetcher = new GhostFetcher()
  return [
    ghostField,
    ghostKeymap,
    ViewPlugin.fromClass(
      class {
        constructor(readonly view: EditorView) {}
        update(update: import('@codemirror/view').ViewUpdate): void {
          if (update.docChanged || update.selectionSet) {
            fetcher.schedule(this.view)
          }
        }
        destroy(): void {
          fetcher.cancel()
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
