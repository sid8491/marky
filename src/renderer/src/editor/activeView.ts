import type { EditorView } from '@codemirror/view'

let active: EditorView | null = null

export function setActiveEditorView(view: EditorView | null): void {
  active = view
}

export function getActiveEditorView(): EditorView | null {
  return active
}
