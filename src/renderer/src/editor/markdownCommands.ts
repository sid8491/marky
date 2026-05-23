import type { EditorView } from '@codemirror/view'

function wrapSelection(
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

function prefixLines(view: EditorView, prefix: string): void {
  const sel = view.state.selection.main
  const fromLine = view.state.doc.lineAt(sel.from)
  const toLine = view.state.doc.lineAt(sel.to)
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = view.state.doc.line(i)
    // Toggle: strip if already prefixed; otherwise add.
    if (line.text.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
  }
  view.dispatch({ changes })
  view.focus()
}

function insertBlock(view: EditorView, block: string, cursorOffset?: number): void {
  const sel = view.state.selection.main
  const line = view.state.doc.lineAt(sel.head)
  // Place the block on its own line(s); add a leading newline if the current
  // line has content, and a trailing newline so following content is separated.
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
  bold: (view: EditorView): void => wrapSelection(view, '**', '**', 'bold text'),
  italic: (view: EditorView): void => wrapSelection(view, '*', '*', 'italic text'),
  strike: (view: EditorView): void => wrapSelection(view, '~~', '~~', 'strikethrough'),
  inlineCode: (view: EditorView): void => wrapSelection(view, '`', '`', 'code'),
  link: (view: EditorView): void => wrapSelection(view, '[', '](https://)', 'text'),
  image: (view: EditorView): void => wrapSelection(view, '![', '](https://)', 'alt'),

  h1: (view: EditorView): void => prefixLines(view, '# '),
  h2: (view: EditorView): void => prefixLines(view, '## '),
  h3: (view: EditorView): void => prefixLines(view, '### '),

  ul: (view: EditorView): void => prefixLines(view, '- '),
  ol: (view: EditorView): void => prefixLines(view, '1. '),
  task: (view: EditorView): void => prefixLines(view, '- [ ] '),
  quote: (view: EditorView): void => prefixLines(view, '> '),

  hr: (view: EditorView): void => insertBlock(view, '---'),
  codeBlock: (view: EditorView): void => {
    // Cursor lands between the fences
    insertBlock(view, '```\n\n```', '```\n'.length)
  },
  table: (view: EditorView, rows: number, cols: number): void =>
    insertBlock(view, buildTable(rows, cols))
}
