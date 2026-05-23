type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, source: string) => Promise<{ svg: string }>
}

let lib: MermaidApi | null = null

async function load(): Promise<MermaidApi> {
  if (lib) return lib
  const mod = await import('mermaid')
  lib = mod.default as unknown as MermaidApi
  lib.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  })
  return lib
}

let counter = 0

export async function renderMermaid(source: string, dark: boolean): Promise<string> {
  const m = await load()
  m.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'strict'
  })
  counter += 1
  const id = `mmd-${counter}`
  const { svg } = await m.render(id, source)
  return svg
}

export async function hydrateMermaidBlocks(
  container: HTMLElement,
  dark: boolean
): Promise<void> {
  const blocks = container.querySelectorAll<HTMLElement>('.mermaid-block')
  await Promise.all(
    Array.from(blocks).map(async (block) => {
      const source = block.getAttribute('data-mermaid-source') ?? ''
      if (!source) return
      const renderedFor = block.getAttribute('data-rendered-for')
      const fingerprint = `${dark ? 'd' : 'l'}::${source.length}`
      if (renderedFor === fingerprint) return
      try {
        const svg = await renderMermaid(source, dark)
        block.innerHTML = svg
        block.setAttribute('data-rendered-for', fingerprint)
      } catch (err) {
        block.innerHTML = `<pre class="mermaid-error">${escapeHtml(
          (err as Error).message ?? 'Failed to render diagram'
        )}</pre>`
      }
    })
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
