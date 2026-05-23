import type { EditorView } from '@codemirror/view'

/**
 * Wrap the selection with `before`/`after` markers — or, if the selection is
 * already wrapped (either inside the selection range or immediately outside
 * it), strip those markers instead. Idempotent on repeat clicks.
 */
function toggleWrap(
  view: EditorView,
  before: string,
  after: string,
  placeholder: string
): void {
  const sel = view.state.selection.main
  const { from, to } = sel
  const doc = view.state.doc

  // Case 1: markers immediately outside the selection — strip them.
  const outerBefore = doc.sliceString(Math.max(0, from - before.length), from)
  const outerAfter = doc.sliceString(to, Math.min(doc.length, to + after.length))
  if (outerBefore === before && outerAfter === after) {
    view.dispatch({
      changes: [
        { from: from - before.length, to: from, insert: '' },
        { from: to, to: to + after.length, insert: '' }
      ],
      selection: { anchor: from - before.length, head: to - before.length }
    })
    view.focus()
    return
  }

  // Case 2: markers inside the selection — strip them.
  const inner = doc.sliceString(from, to)
  if (
    inner.length >= before.length + after.length &&
    inner.startsWith(before) &&
    inner.endsWith(after)
  ) {
    const stripped = inner.slice(before.length, inner.length - after.length)
    view.dispatch({
      changes: { from, to, insert: stripped },
      selection: { anchor: from, head: from + stripped.length }
    })
    view.focus()
    return
  }

  // Case 3: nothing wrapped yet — wrap selection (or placeholder if empty).
  const hasSelection = !sel.empty
  const innerText = hasSelection ? inner : placeholder
  const insert = `${before}${innerText}${after}`
  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + before.length,
      head: from + before.length + innerText.length
    }
  })
  view.focus()
}

/**
 * Variant for asymmetric wraps like links and images where the closing piece
 * contains placeholder content (e.g. `](https://)`). No toggle — always wraps.
 */
function wrapNoToggle(
  view: EditorView,
  before: string,
  after: string,
  placeholder: string
): void {
  const sel = view.state.selection.main
  const hasSelection = !sel.empty
  const inner = hasSelection ? view.state.sliceDoc(sel.from, sel.to) : placeholder
  const insert = `${before}${inner}${after}`
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: {
      anchor: sel.from + before.length,
      head: sel.from + before.length + inner.length
    }
  })
  view.focus()
}

/**
 * Add (or strip if already present) a fixed prefix on every selected line.
 */
function togglePrefixLines(view: EditorView, prefix: string): void {
  const sel = view.state.selection.main
  const fromLine = view.state.doc.lineAt(sel.from)
  const toLine = view.state.doc.lineAt(sel.to)
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = view.state.doc.line(i)
    if (line.text.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
  }
  view.dispatch({ changes })
  view.focus()
}

/**
 * Set the heading level for the current line(s). Level 0 = paragraph (strips
 * any heading marker). Clicking the same level twice toggles back to paragraph.
 */
function setHeadingLevel(view: EditorView, level: 0 | 1 | 2 | 3 | 4 | 5 | 6): void {
  const sel = view.state.selection.main
  const fromLine = view.state.doc.lineAt(sel.from)
  const toLine = view.state.doc.lineAt(sel.to)
  const changes: { from: number; to: number; insert: string }[] = []
  const targetPrefix = level === 0 ? '' : '#'.repeat(level) + ' '
  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = view.state.doc.line(i)
    const match = line.text.match(/^(#{1,6}) /)
    const existingLen = match ? match[0].length : 0
    // Toggle off if user re-applied the same level
    const nextPrefix = match && match[0] === targetPrefix ? '' : targetPrefix
    changes.push({
      from: line.from,
      to: line.from + existingLen,
      insert: nextPrefix
    })
  }
  view.dispatch({ changes })
  view.focus()
}

function insertBlock(view: EditorView, block: string, cursorOffset?: number): void {
  const sel = view.state.selection.main
  const line = view.state.doc.lineAt(sel.head)
  const before = sel.head === line.from ? '' : '\n'
  const after = '\n'
  const insert = `${before}${block}${after}`
  const insertAt = sel.head === line.from ? sel.head : line.to
  view.dispatch({
    changes: { from: insertAt, to: insertAt, insert },
    selection: {
      anchor:
        insertAt + (cursorOffset != null ? before.length + cursorOffset : insert.length)
    }
  })
  view.focus()
}

function buildTable(rows: number, cols: number): string {
  const headers = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`)
  const dividers = Array.from({ length: cols }, () => '---')
  const lines: string[] = []
  lines.push('| ' + headers.join(' | ') + ' |')
  lines.push('| ' + dividers.join(' | ') + ' |')
  for (let r = 0; r < Math.max(0, rows - 1); r++) {
    lines.push('| ' + Array.from({ length: cols }, () => '   ').join(' | ') + ' |')
  }
  return lines.join('\n')
}

export const md = {
  bold: (view: EditorView): void => toggleWrap(view, '**', '**', 'bold text'),
  italic: (view: EditorView): void => toggleWrap(view, '*', '*', 'italic text'),
  strike: (view: EditorView): void => toggleWrap(view, '~~', '~~', 'strikethrough'),
  inlineCode: (view: EditorView): void => toggleWrap(view, '`', '`', 'code'),
  mathInline: (view: EditorView): void => toggleWrap(view, '$', '$', 'x = 1'),

  link: (view: EditorView): void => wrapNoToggle(view, '[', '](https://)', 'text'),
  image: (view: EditorView): void => wrapNoToggle(view, '![', '](https://)', 'alt'),

  setHeading: (view: EditorView, level: 0 | 1 | 2 | 3 | 4 | 5 | 6): void =>
    setHeadingLevel(view, level),

  ul: (view: EditorView): void => togglePrefixLines(view, '- '),
  ol: (view: EditorView): void => togglePrefixLines(view, '1. '),
  task: (view: EditorView): void => togglePrefixLines(view, '- [ ] '),
  quote: (view: EditorView): void => togglePrefixLines(view, '> '),

  hr: (view: EditorView): void => insertBlock(view, '---'),
  codeBlock: (view: EditorView): void => {
    insertBlock(view, '```\n\n```', '```\n'.length)
  },
  mathBlock: (view: EditorView): void => {
    insertBlock(view, '$$\n\n$$', '$$\n'.length)
  },
  mermaid: (view: EditorView): void => {
    insertBlock(
      view,
      '```mermaid\ngraph TD\n  A[Start] --> B[End]\n```',
      '```mermaid\n'.length
    )
  },
  table: (view: EditorView, rows: number, cols: number): void =>
    insertBlock(view, buildTable(rows, cols))
}
