import { GoogleGenAI } from '@google/genai'
import type { AIChatRequest } from '@shared/ai'

export async function* streamGoogle(
  apiKey: string,
  req: AIChatRequest,
  abort: AbortSignal
): AsyncGenerator<string> {
  const client = new GoogleGenAI({ apiKey })
  const systems = req.messages.filter((m) => m.role === 'system')
  const others = req.messages.filter((m) => m.role !== 'system')

  const stream = await client.models.generateContentStream({
    model: req.model,
    contents: others.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    config: {
      temperature: req.temperature,
      maxOutputTokens: req.maxTokens,
      systemInstruction: systems.length
        ? systems.map((m) => m.content).join('\n\n')
        : undefined
    }
  })

  for await (const chunk of stream) {
    if (abort.aborted) break
    const text =
      chunk.text ??
      chunk.candidates?.[0]?.content?.parts
        ?.map((p) => (typeof p === 'object' && 'text' in p ? p.text : ''))
        .filter(Boolean)
        .join('') ??
      ''
    if (text) yield text
  }
}

export async function testGoogle(apiKey: string): Promise<void> {
  const client = new GoogleGenAI({ apiKey })
  await client.models.list({ config: { pageSize: 1 } })
}
