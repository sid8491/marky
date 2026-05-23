import OpenAI from 'openai'
import type { AIChatRequest } from '@shared/ai'

export async function* streamOpenAI(
  apiKey: string,
  req: AIChatRequest,
  abort: AbortSignal
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey })
  const stream = await client.chat.completions.create(
    {
      model: req.model,
      stream: true,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    },
    { signal: abort }
  )

  for await (const chunk of stream) {
    if (abort.aborted) break
    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) yield delta
  }
}

export async function testOpenAI(apiKey: string): Promise<void> {
  const client = new OpenAI({ apiKey })
  await client.models.list()
}
