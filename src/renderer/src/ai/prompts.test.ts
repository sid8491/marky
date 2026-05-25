import { describe, expect, it } from 'vitest'
import { buildContinueRequest, buildRefineRequest } from './prompts'

describe('buildContinueRequest', () => {
  it('caps continuation length and threads through provider/model/temperature', () => {
    const req = buildContinueRequest({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      temperature: 0.4,
      context: 'The quick brown fox'
    })
    expect(req.provider).toBe('anthropic')
    expect(req.model).toBe('claude-haiku-4-5-20251001')
    expect(req.temperature).toBe(0.4)
    expect(req.maxTokens).toBe(80)
    expect(req.messages[0].role).toBe('system')
    expect(req.messages[1]).toEqual({ role: 'user', content: 'The quick brown fox' })
  })
})

describe('buildRefineRequest', () => {
  it('uses the canned instruction for known actions', () => {
    const req = buildRefineRequest({
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.2,
      action: 'shorter',
      selection: 'Some prose to compress.'
    })
    expect(req.messages[0].role).toBe('system')
    expect(req.messages[0].content).toMatch(/concise/i)
    expect(req.messages[1].content).toBe('Some prose to compress.')
  })

  it('falls back to the custom instruction when action is "custom"', () => {
    const req = buildRefineRequest({
      provider: 'anthropic',
      model: 'claude',
      temperature: 0,
      action: 'custom',
      customInstruction: 'Translate to French.',
      selection: 'Hello'
    })
    expect(req.messages[0].content).toMatch(/Translate to French/)
  })

  it('includes surrounding context in the user message when provided', () => {
    const req = buildRefineRequest({
      provider: 'google',
      model: 'gemini-2.0-flash',
      temperature: 0.5,
      action: 'grammar',
      selection: 'he run fast',
      surroundingContext: 'A short story:'
    })
    expect(req.messages[1].content).toContain('Context (do not rewrite):')
    expect(req.messages[1].content).toContain('A short story:')
    expect(req.messages[1].content).toContain('he run fast')
  })

  it('grows maxTokens with selection length, but never below 256', () => {
    const short = buildRefineRequest({
      provider: 'anthropic',
      model: 'm',
      temperature: 0,
      action: 'longer',
      selection: 'tiny'
    })
    expect(short.maxTokens).toBe(256)

    const long = buildRefineRequest({
      provider: 'anthropic',
      model: 'm',
      temperature: 0,
      action: 'longer',
      selection: 'x'.repeat(500)
    })
    expect(long.maxTokens).toBe(1000)
  })
})
