import type { AIChatRequest } from '@shared/ai'

const SYSTEM_CONTINUE =
  'You complete the user\'s in-progress markdown document. Respond with ONLY the continuation text — no quotes, no preamble, no markdown fences around the response, no explanations. Keep it short (a sentence or two, or one bullet, or one heading). Match the existing tone and language.'

const SYSTEM_REWRITE = (instruction: string): string =>
  `You rewrite a snippet of markdown according to the user's instruction. Output ONLY the rewritten text — no quotes, no markdown fences around the response, no explanations. Preserve markdown structure where possible (headings, lists, code fences). Instruction: ${instruction}`

const ACTION_INSTRUCTIONS: Record<string, string> = {
  rewrite: 'Rewrite the snippet to be clearer and more polished.',
  shorter: 'Rewrite the snippet to be more concise. Cut filler. Keep the meaning intact.',
  longer: 'Expand the snippet with more detail and supporting context. Match the existing voice.',
  grammar: 'Fix grammar, punctuation, and spelling mistakes. Make NO other changes.',
  continue: 'Continue the snippet naturally for another sentence or two.',
  'tone-formal': 'Rewrite the snippet in a formal, professional tone.',
  'tone-casual': 'Rewrite the snippet in a casual, friendly tone.',
  'tone-technical': 'Rewrite the snippet in a precise, technical tone.',
  'tone-friendly': 'Rewrite the snippet in a warm, encouraging tone.'
}

export type RefineAction = keyof typeof ACTION_INSTRUCTIONS | 'custom'

export function buildContinueRequest(opts: {
  provider: AIChatRequest['provider']
  model: string
  temperature: number
  context: string
}): AIChatRequest {
  return {
    provider: opts.provider,
    model: opts.model,
    temperature: opts.temperature,
    maxTokens: 80,
    messages: [
      { role: 'system', content: SYSTEM_CONTINUE },
      { role: 'user', content: opts.context }
    ]
  }
}

export function buildRefineRequest(opts: {
  provider: AIChatRequest['provider']
  model: string
  temperature: number
  action: RefineAction
  customInstruction?: string
  selection: string
  surroundingContext?: string
}): AIChatRequest {
  const instruction =
    opts.action === 'custom'
      ? opts.customInstruction ?? 'Improve this text.'
      : ACTION_INSTRUCTIONS[opts.action]
  const userContent = opts.surroundingContext
    ? `Context (do not rewrite):\n${opts.surroundingContext}\n\nSnippet to rewrite:\n${opts.selection}`
    : opts.selection
  return {
    provider: opts.provider,
    model: opts.model,
    temperature: opts.temperature,
    maxTokens: Math.max(256, opts.selection.length * 2),
    messages: [
      { role: 'system', content: SYSTEM_REWRITE(instruction) },
      { role: 'user', content: userContent }
    ]
  }
}
