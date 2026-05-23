import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  highlightActiveLine,
  drawSelection,
  lineNumbers
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab
} from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap
} from '@codemirror/autocomplete'
import { indentOnInput, bracketMatching } from '@codemirror/language'
import { useTabs, type Tab } from '@/store/tabs'
import { useSettings } from '@/store/settings'
import { markyTheme } from '@/editor/theme'
import { imagePasteExtension } from '@/editor/imagePaste'
import { ghostTextExtension } from '@/editor/ghostText'
import { selectionTrackerExtension, type SelectionInfo } from '@/editor/selectionTracker'
import {
  applyScrollFraction,
  broadcastScroll,
  scrollFraction,
  subscribeScroll
} from '@/editor/scrollSync'
import { setActiveEditorView } from '@/editor/activeView'
import { md } from '@/editor/markdownCommands'
import { EditorToolbar } from './EditorToolbar'
import { SelectionToolbar } from './SelectionToolbar'

export function EditorPane({ tab }: { tab: Tab }): React.ReactElement {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const updateContent = useTabs((s) => s.updateContent)
  const dark = useSettings((s) => s.resolvedDark)
  const showLineNumbers = useSettings((s) => s.showLineNumbers)
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null)
  const [paneWidth, setPaneWidth] = useState(0)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    setPaneWidth(el.clientWidth)
    const observer = new ResizeObserver(() => setPaneWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!hostRef.current) return

    const state = EditorState.create({
      doc: tab.content,
      extensions: [
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        indentOnInput(),
        highlightSelectionMatches(),
        ...(showLineNumbers ? [lineNumbers()] : []),
        EditorView.lineWrapping,
        keymap.of([
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          {
            key: 'Mod-b',
            run: (view) => {
              md.bold(view)
              return true
            }
          },
          {
            key: 'Mod-i',
            run: (view) => {
              md.italic(view)
              return true
            }
          }
        ]),
        markdown({ base: markdownLanguage, codeLanguages: () => null }),
        imagePasteExtension({
          getDocPath: () => {
            const current = useTabs.getState().tabs.find((t) => t.id === tab.id)
            return current?.path
          }
        }),
        ghostTextExtension(),
        selectionTrackerExtension(setSelectionInfo),
        ...markyTheme(dark),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            updateContent(tab.id, u.state.doc.toString())
          }
        })
      ]
    })

    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view
    setActiveEditorView(view)

    const scrollDom = view.scrollDOM
    let receivingProgrammaticScroll = false

    const onScroll = (): void => {
      if (receivingProgrammaticScroll) return
      if (!useSettings.getState().syncScroll) return
      broadcastScroll('editor', scrollFraction(scrollDom))
    }
    scrollDom.addEventListener('scroll', onScroll, { passive: true })

    const unsubscribeScroll = subscribeScroll((source, fraction) => {
      if (source === 'editor') return
      if (!useSettings.getState().syncScroll) return
      receivingProgrammaticScroll = true
      applyScrollFraction(scrollDom, fraction)
      requestAnimationFrame(() => {
        receivingProgrammaticScroll = false
      })
    })

    return () => {
      scrollDom.removeEventListener('scroll', onScroll)
      unsubscribeScroll()
      setActiveEditorView(null)
      view.destroy()
      viewRef.current = null
      setSelectionInfo(null)
    }
    // Initial content is captured at mount; subsequent changes are synced by
    // the second effect below. updateContent comes from a stable Zustand selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id, dark, showLineNumbers])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== tab.content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: tab.content }
      })
    }
  }, [tab.content])

  return (
    <div ref={wrapperRef} className="flex h-full w-full flex-col">
      <EditorToolbar viewRef={viewRef} />
      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="allow-select h-full w-full overflow-auto" />
        <SelectionToolbar
          info={selectionInfo}
          viewRef={viewRef}
          containerWidth={paneWidth}
        />
      </div>
    </div>
  )
}
