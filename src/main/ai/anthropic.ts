import Anthropic from '@anthropic-ai/sdk'
import type { AIChatRequest } from '@shared/ai'

export async function* streamAnthropic(
  apiKey: string,
  req: AIChatRequest,
  abort: AbortSignal
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey })
  const sysMessages = req.messages.filter((m) => m.role === 'system')
  const others = req.messages.filter((m) => m.role !== 'system')
  const system = sysMessages.map((m) => m.content).join('\n\n') || undefined

  const stream = client.messages.stream(
    {
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature,
      system,
      messages: others.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    },
    { signal: abort }
  )

  for await (const event of stream) {
    if (abort.aborted) break
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

export async function testAnthropic(apiKey: string): Promise<void> {
  const client = new Anthropic({ apiKey })
  // Cheapest possible call — ask for a single token.
  await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }]
  })
}
