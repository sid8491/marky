import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { AIChatRequest, AIProvider, AIStreamEvent } from '@shared/ai'
import { deleteKey, getKey, getSettings, setKey, updateSettings } from '../ai/settings'
import { streamAnthropic, testAnthropic } from '../ai/anthropic'
import { streamOpenAI, testOpenAI } from '../ai/openai'
import { streamGoogle, testGoogle } from '../ai/google'
import { streamOllama, testOllama } from '../ai/ollama'

const inflight = new Map<string, AbortController>()

async function getProviderStream(
  req: AIChatRequest
): Promise<(abort: AbortSignal) => AsyncGenerator<string>> {
  const settings = await getSettings()
  switch (req.provider) {
    case 'anthropic': {
      const key = await getKey('anthropic')
      if (!key) throw new Error('Anthropic API key not set')
      return (abort) => streamAnthropic(key, req, abort)
    }
    case 'openai': {
      const key = await getKey('openai')
      if (!key) throw new Error('OpenAI API key not set')
      return (abort) => streamOpenAI(key, req, abort)
    }
    case 'google': {
      const key = await getKey('google')
      if (!key) throw new Error('Google API key not set')
      return (abort) => streamGoogle(key, req, abort)
    }
    case 'ollama':
      return (abort) => streamOllama(settings.ollamaUrl, req, abort)
  }
}

export function registerAiIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.AI_SETTINGS_GET, () => getSettings())

  ipcMain.handle(IPC.AI_SETTINGS_SET, (_e, partial) => updateSettings(partial))

  ipcMain.handle(IPC.AI_KEY_SET, (_e, provider: AIProvider, key: string) =>
    setKey(provider, key)
  )

  ipcMain.handle(IPC.AI_KEY_DELETE, (_e, provider: AIProvider) => deleteKey(provider))

  ipcMain.handle(IPC.AI_TEST, async (_e, provider: AIProvider) => {
    try {
      if (provider === 'ollama') {
        const settings = await getSettings()
        await testOllama(settings.ollamaUrl)
      } else {
        const key = await getKey(provider)
        if (!key) throw new Error('API key not set')
        if (provider === 'anthropic') await testAnthropic(key)
        else if (provider === 'openai') await testOpenAI(key)
        else if (provider === 'google') await testGoogle(key)
      }
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message ?? String(e) }
    }
  })

  ipcMain.handle(IPC.AI_STREAM_START, async (_e, id: string, request: AIChatRequest) => {
    if (inflight.has(id)) {
      return { accepted: false as const, error: 'duplicate id' }
    }
    const ac = new AbortController()
    inflight.set(id, ac)
    // run async, send events
    void (async () => {
      const send = (event: AIStreamEvent): void => {
        getMainWindow()?.webContents.send(IPC.AI_STREAM_EVENT, id, event)
      }
      try {
        const gen = await getProviderStream(request)
        for await (const text of gen(ac.signal)) {
          if (ac.signal.aborted) break
          send({ type: 'chunk', text })
        }
        if (ac.signal.aborted) {
          send({ type: 'error', message: 'cancelled' })
        } else {
          send({ type: 'done' })
        }
      } catch (e) {
        send({ type: 'error', message: (e as Error).message ?? String(e) })
      } finally {
        inflight.delete(id)
      }
    })()
    return { accepted: true as const }
  })

  ipcMain.on(IPC.AI_STREAM_CANCEL, (_e, id: string) => {
    const ac = inflight.get(id)
    if (ac) ac.abort()
  })
}
