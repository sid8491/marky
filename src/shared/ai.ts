export type AIProvider = 'anthropic' | 'openai' | 'google' | 'ollama'

export interface AISettings {
  provider: AIProvider
  models: Record<AIProvider, string>
  temperature: number
  ghostTextEnabled: boolean
  ghostTextDebounceMs: number
  ollamaUrl: string
  keys: Record<AIProvider, boolean>
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIChatRequest {
  provider: AIProvider
  model: string
  messages: AIChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: never // sent via cancel IPC
}

export type AIStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export const DEFAULT_AI_SETTINGS: Omit<AISettings, 'keys'> = {
  provider: 'anthropic',
  models: {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o-mini',
    google: 'gemini-1.5-flash',
    ollama: 'llama3.1'
  },
  temperature: 0.5,
  // Opt-in: AI continuations are only produced on explicit user request
  // (Ctrl/Cmd+J, command palette, or selection refine toolbar) unless this
  // is turned on in settings.
  ghostTextEnabled: false,
  ghostTextDebounceMs: 600,
  ollamaUrl: 'http://localhost:11434'
}
