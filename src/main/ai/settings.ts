import { app, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_AI_SETTINGS,
  type AIProvider,
  type AISettings
} from '@shared/ai'

interface PersistedShape {
  provider?: AIProvider
  models?: Partial<AISettings['models']>
  temperature?: number
  ghostTextEnabled?: boolean
  ghostTextDebounceMs?: number
  ollamaUrl?: string
  encryptedKeys?: Partial<Record<AIProvider, string>> // base64-encoded encrypted blobs
}

let cache: PersistedShape | null = null

function file(): string {
  return join(app.getPath('userData'), 'ai-settings.json')
}

async function read(): Promise<PersistedShape> {
  if (cache) return cache
  try {
    const raw = await fs.readFile(file(), 'utf8')
    cache = JSON.parse(raw) as PersistedShape
  } catch {
    cache = {}
  }
  return cache
}

async function write(data: PersistedShape): Promise<void> {
  cache = data
  await fs.writeFile(file(), JSON.stringify(data, null, 2), 'utf8')
}

function publicSettings(p: PersistedShape): AISettings {
  return {
    provider: p.provider ?? DEFAULT_AI_SETTINGS.provider,
    models: { ...DEFAULT_AI_SETTINGS.models, ...(p.models ?? {}) },
    temperature: p.temperature ?? DEFAULT_AI_SETTINGS.temperature,
    ghostTextEnabled:
      p.ghostTextEnabled ?? DEFAULT_AI_SETTINGS.ghostTextEnabled,
    ghostTextDebounceMs:
      p.ghostTextDebounceMs ?? DEFAULT_AI_SETTINGS.ghostTextDebounceMs,
    ollamaUrl: p.ollamaUrl ?? DEFAULT_AI_SETTINGS.ollamaUrl,
    keys: {
      anthropic: Boolean(p.encryptedKeys?.anthropic),
      openai: Boolean(p.encryptedKeys?.openai),
      google: Boolean(p.encryptedKeys?.google),
      ollama: true // no key required, treated as always available
    }
  }
}

export async function getSettings(): Promise<AISettings> {
  const data = await read()
  return publicSettings(data)
}

export async function updateSettings(
  partial: Partial<Omit<AISettings, 'keys'>>
): Promise<AISettings> {
  const data = await read()
  const next: PersistedShape = {
    ...data,
    ...(partial.provider !== undefined && { provider: partial.provider }),
    ...(partial.models !== undefined && {
      models: { ...(data.models ?? {}), ...partial.models }
    }),
    ...(partial.temperature !== undefined && {
      temperature: partial.temperature
    }),
    ...(partial.ghostTextEnabled !== undefined && {
      ghostTextEnabled: partial.ghostTextEnabled
    }),
    ...(partial.ghostTextDebounceMs !== undefined && {
      ghostTextDebounceMs: partial.ghostTextDebounceMs
    }),
    ...(partial.ollamaUrl !== undefined && { ollamaUrl: partial.ollamaUrl })
  }
  await write(next)
  return publicSettings(next)
}

export async function setKey(
  provider: AIProvider,
  plaintext: string
): Promise<AISettings> {
  const data = await read()
  const encryptedKeys = { ...(data.encryptedKeys ?? {}) }
  if (provider === 'ollama') {
    // ignore — no key required
    return publicSettings(data)
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'OS keychain is unavailable on this system; cannot store API keys securely.'
    )
  }
  const blob = safeStorage.encryptString(plaintext)
  encryptedKeys[provider] = blob.toString('base64')
  const next: PersistedShape = { ...data, encryptedKeys }
  await write(next)
  return publicSettings(next)
}

export async function deleteKey(provider: AIProvider): Promise<AISettings> {
  const data = await read()
  const encryptedKeys = { ...(data.encryptedKeys ?? {}) }
  delete encryptedKeys[provider]
  const next: PersistedShape = { ...data, encryptedKeys }
  await write(next)
  return publicSettings(next)
}

export async function getKey(provider: AIProvider): Promise<string | null> {
  const data = await read()
  const enc = data.encryptedKeys?.[provider]
  if (!enc) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'))
  } catch {
    return null
  }
}
