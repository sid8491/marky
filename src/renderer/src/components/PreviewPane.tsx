import { useEffect, useRef, useState } from 'react'
import { renderMarkdown } from '@/preview/pipeline'
import { hydrateMermaidBlocks } from '@/preview/mermaid'
import { useSettings } from '@/store/settings'
import type { Tab } from '@/store/tabs'

export function PreviewPane({ tab }: { tab: Tab }): React.ReactElement {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dark = useSettings((s) => s.resolvedDark)
  const containerRef = useRef<HTMLElement>(null)

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
    if (!containerRef.current) return
    void hydrateMermaidBlocks(containerRef.current, dark).catch((err) => {
      console.error('[preview] mermaid failed:', err)
    })
  }, [html, dark])

  return (
    <div className="allow-select h-full overflow-auto bg-surface">
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
        ref={containerRef}
        className="preview"
        // HTML produced by our own unified pipeline (remark-rehype with
        // allowDangerousHtml: false → embedded HTML in source is escaped).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
