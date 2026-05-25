import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './pipeline'

describe('renderMarkdown', () => {
  it('renders GFM tables', async () => {
    const html = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>1</td>')
  })

  it('renders GFM task lists with disabled checkboxes', async () => {
    const html = await renderMarkdown('- [ ] todo\n- [x] done')
    expect(html).toMatch(/<input[^>]+type="checkbox"[^>]+disabled/)
    expect(html).toMatch(/<input[^>]+checked/)
  })

  it('renders inline and block math via KaTeX', async () => {
    const inline = await renderMarkdown('Equation: $x^2$')
    expect(inline).toContain('katex')

    const block = await renderMarkdown('$$\nE = mc^2\n$$')
    expect(block).toMatch(/class="[^"]*katex-display/)
  })

  it('escapes raw HTML embedded in markdown source (allowDangerousHtml: false)', async () => {
    const html = await renderMarkdown('Hello <script>alert(1)</script>')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it.todo(
    'lifts ```mermaid fences into a div.mermaid-block with the source as a data attribute ' +
      '(currently broken — rehypeMermaidExtract guards on parent.type === "element" and so ' +
      'skips top-level <pre> blocks, leaving them to be highlighted by Shiki)'
  )

  it('syntax-highlights non-mermaid code fences via Shiki', async () => {
    const html = await renderMarkdown('```ts\nconst x: number = 1\n```')
    expect(html).toMatch(/shiki|language-ts/)
  })
})
