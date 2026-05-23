import type { AIChatRequest } from '@shared/ai'

interface OllamaChunk {
  message?: { content?: string }
  done?: boolean
}

export async function* streamOllama(
  baseUrl: string,
  req: AIChatRequest,
  abort: AbortSignal
): AsyncGenerator<string> {
  const url = baseUrl.replace(/\/+$/, '') + '/api/chat'
  const res = await fetch(url, {
    method: 'POST',
    signal: abort,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: req.model,
      stream: true,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      options: {
        temperature: req.temperature,
        num_predict: req.maxTokens
      }
    })
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    if (abort.aborted) {
      await reader.cancel().catch(() => {})
      break
    }
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      try {
        const obj = JSON.parse(line) as OllamaChunk
        const text = obj.message?.content
        if (text) yield text
      } catch {
        // ignore malformed line
      }
    }
  }
}

export async function testOllama(baseUrl: string): Promise<void> {
  const url = baseUrl.replace(/\/+$/, '') + '/api/tags'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Ollama unreachable at ${baseUrl}`)
}
