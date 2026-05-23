import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const baseTheme = (dark: boolean): ReturnType<typeof EditorView.theme> =>
  EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '15px',
        backgroundColor: 'transparent',
        color: dark ? '#ebebef' : '#1a1c26'
      },
      '.cm-scroller': {
        fontFamily:
          "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        lineHeight: '1.7',
        padding: '20px 32px'
      },
      '.cm-content': {
        caretColor: dark ? '#818cf8' : '#6366f1',
        maxWidth: '78ch',
        margin: '0 auto'
      },
      '&.cm-focused': {
        outline: 'none'
      },
      '.cm-cursor': {
        borderLeftColor: dark ? '#818cf8' : '#6366f1',
        borderLeftWidth: '2px'
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: dark ? 'rgba(129,140,248,0.22)' : 'rgba(99,102,241,0.18)'
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: dark ? 'rgba(129,140,248,0.28)' : 'rgba(99,102,241,0.22)'
      },
      '.cm-activeLine': {
        backgroundColor: dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: dark ? '#5e6171' : '#b4b6c2',
        border: 'none'
      }
    },
    { dark }
  )

const mdHighlight = (dark: boolean): HighlightStyle =>
  HighlightStyle.define([
    { tag: t.heading1, fontSize: '1.6em', fontWeight: '700', color: dark ? '#fff' : '#0f1017' },
    { tag: t.heading2, fontSize: '1.4em', fontWeight: '700', color: dark ? '#fff' : '#0f1017' },
    { tag: t.heading3, fontSize: '1.2em', fontWeight: '600', color: dark ? '#fff' : '#0f1017' },
    { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '600' },
    { tag: t.strong, fontWeight: '700', color: dark ? '#fff' : '#0f1017' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: dark ? '#a5b4fc' : '#4338ca', textDecoration: 'underline' },
    { tag: t.url, color: dark ? '#a5b4fc' : '#4338ca' },
    { tag: t.monospace, color: dark ? '#fcd34d' : '#b45309' },
    { tag: t.list, color: dark ? '#a5b4fc' : '#4338ca' },
    { tag: t.quote, color: dark ? '#9ca3af' : '#6b7280', fontStyle: 'italic' },
    { tag: t.processingInstruction, color: dark ? '#5e6171' : '#9ca3af' },
    { tag: t.meta, color: dark ? '#5e6171' : '#9ca3af' }
  ])

export function markyTheme(dark: boolean): Array<ReturnType<typeof EditorView.theme>> {
  return [baseTheme(dark), syntaxHighlighting(mdHighlight(dark))]
}
