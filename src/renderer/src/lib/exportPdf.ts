import previewCss from '../preview/styles.css?raw'
import katexCss from 'katex/dist/katex.min.css?raw'
import { renderMarkdown } from '../preview/pipeline'
import { renderMermaid } from '../preview/mermaid'

async function resolveMermaid(html: string, dark: boolean): Promise<string> {
  if (!html.includes('mermaid-block')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = Array.from(doc.querySelectorAll('.mermaid-block'))
  for (const block of blocks) {
    const source = block.getAttribute('data-mermaid-source') ?? ''
    if (!source) continue
    try {
      const svg = await renderMermaid(source, dark)
      block.innerHTML = svg
    } catch {
      block.innerHTML = '<pre class="mermaid-error">Diagram failed to render</pre>'
    }
  }
  return doc.body.innerHTML
}

function buildHtmlDocument(bodyInner: string, dark: boolean): string {
  // Resolve Shiki dual-theme to a single colour-scheme so the PDF picks one.
  const themeCss = dark
    ? '.shiki, .shiki span { color: var(--shiki-dark); background-color: var(--shiki-dark-bg) }'
    : '.shiki, .shiki span { color: var(--shiki-light); background-color: var(--shiki-light-bg) }'

  return `<!doctype html>
<html lang="en"${dark ? ' class="dark"' : ''}>
  <head>
    <meta charset="utf-8" />
    <title>Marky export</title>
    <style>${katexCss}</style>
    <style>
      :root {
        --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        --surface-bg: ${dark ? '#0b0b0e' : '#ffffff'};
        --surface-panel: ${dark ? '#14151d' : '#f7f7f8'};
        --surface-text: ${dark ? '#ebebef' : '#1a1c26'};
        --surface-text-muted: ${dark ? '#b4b6c2' : '#5e6171'};
        --surface-text-faint: ${dark ? '#888a99' : '#888a99'};
        --surface-border: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
        --surface-accent: ${dark ? '#818cf8' : '#6366f1'};
      }
      html, body { margin: 0; padding: 0; background: var(--surface-bg); color: var(--surface-text); font-family: var(--font-sans); }
      ${themeCss}
      @page { margin: 0; size: A4; }
      .preview { max-width: 100%; padding: 0 8mm; }
      @media print {
        body { background: var(--surface-bg) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
    <style>${previewCss}</style>
  </head>
  <body>
    <article class="preview">${bodyInner}</article>
  </body>
</html>`
}

export async function exportToPdf(opts: {
  markdown: string
  defaultName: string
  dark: boolean
}): Promise<{ canceled: boolean; path?: string }> {
  const html = await renderMarkdown(opts.markdown)
  const resolved = await resolveMermaid(html, opts.dark)
  const doc = buildHtmlDocument(resolved, opts.dark)
  return window.marky.exportPdf({
    html: doc,
    defaultName: opts.defaultName.replace(/\.(md|markdown|mdx)$/i, '') || 'document',
    printBackground: true,
    pageSize: 'A4',
    margins: 'default'
  })
}
