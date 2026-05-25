import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Root, Element, Text } from 'hast'

function rehypeMermaidExtract() {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element, idx, parent) => {
      if (node.tagName !== 'pre' || !parent || idx == null) return
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code'
      )
      if (!code) return
      const className = (code.properties?.className ?? []) as string[]
      if (!className.some((c) => c === 'language-mermaid')) return
      const firstChild = code.children[0]
      const source =
        firstChild && firstChild.type === 'text' ? (firstChild as Text).value : ''
      const replacement: Element = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['mermaid-block'],
          'data-mermaid-source': source
        },
        children: []
      }
      parent.children[idx] = replacement
    })
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeKatex)
  .use(rehypeMermaidExtract)
  .use(rehypeShiki, {
    themes: { light: 'github-light', dark: 'github-dark-default' },
    // Emit BOTH themes as CSS variables instead of inlining one.
    // Without this, Shiki bakes the light theme into inline `style` attributes,
    // and inline styles win over our html.dark CSS overrides — leaving code
    // blocks light-themed even in dark mode.
    defaultColor: false,
    defaultLanguage: 'text',
    fallbackLanguage: 'text',
    lazy: true,
    addLanguageClass: true
  })
  .use(rehypeStringify)

export async function renderMarkdown(md: string): Promise<string> {
  const file = await processor.process(md)
  return String(file)
}
