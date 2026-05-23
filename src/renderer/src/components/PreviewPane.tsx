import { useEffect, useRef, useState } from 'react'
import { renderMarkdown } from '@/preview/pipeline'
import { hydrateMermaidBlocks } from '@/preview/mermaid'
import {
  applyScrollFraction,
  broadcastScroll,
  scrollFraction,
  subscribeScroll
} from '@/editor/scrollSync'
import { useSettings } from '@/store/settings'
import type { Tab } from '@/store/tabs'

export function PreviewPane({ tab }: { tab: Tab }): React.ReactElement {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dark = useSettings((s) => s.resolvedDark)
  const scrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      renderMarkdown(tab.content)
        .then((out) => {
          if (cancelled) return
          setHtml(out)
          setError(null)
        })
        .catch((err) => {
          if (cancelled) return
          console.error('[preview] render failed:', err)
          setError((err as Error).stack ?? (err as Error).message ?? String(err))
          setHtml('')
        })
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [tab.content])

  useEffect(() => {
    if (!articleRef.current) return
    void hydrateMermaidBlocks(articleRef.current, dark).catch((err) => {
      console.error('[preview] mermaid failed:', err)
    })
  }, [html, dark])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let receivingProgrammaticScroll = false

    const onScroll = (): void => {
      if (receivingProgrammaticScroll) return
      if (!useSettings.getState().syncScroll) return
      broadcastScroll('preview', scrollFraction(el))
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    const unsubscribe = subscribeScroll((source, fraction) => {
      if (source === 'preview') return
      if (!useSettings.getState().syncScroll) return
      receivingProgrammaticScroll = true
      applyScrollFraction(el, fraction)
      requestAnimationFrame(() => {
        receivingProgrammaticScroll = false
      })
    })

    return () => {
      el.removeEventListener('scroll', onScroll)
      unsubscribe()
    }
  }, [])

  return (
    <div ref={scrollRef} className="allow-select h-full overflow-auto bg-surface">
      {error && (
        <div className="m-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <div className="mb-1 text-sm font-medium text-red-500">
            Preview render failed
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-red-400">
            {error}
          </pre>
        </div>
      )}
      <article
        ref={articleRef}
        className="preview"
        // HTML produced by our own unified pipeline (remark-rehype with
        // allowDangerousHtml: false → embedded HTML in source is escaped).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
