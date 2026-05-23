import { EditorView } from '@codemirror/view'

export interface SelectionInfo {
  from: number
  to: number
  text: string
  /** Container-relative top of the selected line */
  top: number
  /** Container-relative bottom of the selection */
  bottom: number
  /** Container-relative horizontal center of the selection */
  centerX: number
}

export function selectionTrackerExtension(
  cb: (info: SelectionInfo | null) => void
) {
  return EditorView.updateListener.of((update) => {
    if (
      !update.selectionSet &&
      !update.docChanged &&
      !update.viewportChanged &&
      !update.geometryChanged
    ) {
      return
    }
    const sel = update.state.selection.main
    if (sel.empty) {
      cb(null)
      return
    }
    const text = update.state.sliceDoc(sel.from, sel.to)
    if (text.trim().length === 0) {
      cb(null)
      return
    }
    const fromCoords = update.view.coordsAtPos(sel.from)
    const toCoords = update.view.coordsAtPos(sel.to)
    if (!fromCoords || !toCoords) {
      cb(null)
      return
    }
    const container = update.view.dom.getBoundingClientRect()
    cb({
      from: sel.from,
      to: sel.to,
      text,
      top: Math.min(fromCoords.top, toCoords.top) - container.top,
      bottom: Math.max(fromCoords.bottom, toCoords.bottom) - container.top,
      centerX:
        (fromCoords.left + toCoords.left) / 2 - container.left
    })
  })
}
