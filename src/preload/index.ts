import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Platform, type UpdateEvent } from '@shared/ipc-contract'
import type {
  ExportPdfOptions,
  FileReadResult,
  OpenFileOptions,
  SaveDialogResult,
  Draft
} from '@shared/types'
import type { AIChatRequest, AIProvider, AISettings, AIStreamEvent } from '@shared/ai'

const api = {
  platform: () => ipcRenderer.invoke(IPC.PLATFORM) as Promise<Platform>,
  appVersion: () => ipcRenderer.invoke(IPC.APP_VERSION) as Promise<string>,

  win: {
    minimize: () => ipcRenderer.send(IPC.WIN_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC.WIN_MAXIMIZE),
    close: () => ipcRenderer.send(IPC.WIN_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC.WIN_IS_MAXIMIZED) as Promise<boolean>,
    onMaximizeChanged: (cb: (isMax: boolean) => void) => {
      const listener = (_: unknown, isMax: boolean): void => cb(isMax)
      ipcRenderer.on(IPC.WIN_MAXIMIZE_CHANGED, listener)
      return () => ipcRenderer.off(IPC.WIN_MAXIMIZE_CHANGED, listener)
    }
  },

  files: {
    openDialog: (opts?: OpenFileOptions) =>
      ipcRenderer.invoke(IPC.FILE_OPEN_DIALOG, opts) as Promise<FileReadResult[]>,
    read: (path: string) =>
      ipcRenderer.invoke(IPC.FILE_READ, path) as Promise<FileReadResult>,
    write: (path: string, content: string) =>
      ipcRenderer.invoke(IPC.FILE_WRITE, path, content) as Promise<{ mtimeMs: number }>,
    saveDialog: (opts?: { defaultName?: string }) =>
      ipcRenderer.invoke(IPC.FILE_SAVE_DIALOG, opts) as Promise<SaveDialogResult>,
    saveImage: (docPath: string | null, ext: string, dataBase64: string) =>
      ipcRenderer.invoke(IPC.FILE_SAVE_IMAGE, docPath, ext, dataBase64) as Promise<{
        absolutePath: string
        relativePath: string
      }>,
    watch: (path: string) => ipcRenderer.send(IPC.FILE_WATCH, path),
    unwatch: (path: string) => ipcRenderer.send(IPC.FILE_UNWATCH, path),
    onChanged: (cb: (path: string, mtimeMs: number) => void) => {
      const listener = (_: unknown, path: string, mtimeMs: number): void =>
        cb(path, mtimeMs)
      ipcRenderer.on(IPC.FILE_CHANGED, listener)
      return () => ipcRenderer.off(IPC.FILE_CHANGED, listener)
    },
    getPending: () =>
      ipcRenderer.invoke(IPC.FILE_GET_PENDING) as Promise<FileReadResult[]>,
    onOpenFromOs: (cb: (file: FileReadResult) => void) => {
      const listener = (_: unknown, file: FileReadResult): void => cb(file)
      ipcRenderer.on(IPC.FILE_OPEN_FROM_OS, listener)
      return () => ipcRenderer.off(IPC.FILE_OPEN_FROM_OS, listener)
    }
  },

  exportPdf: (opts: ExportPdfOptions) =>
    ipcRenderer.invoke(IPC.EXPORT_PDF, opts) as Promise<{
      canceled: boolean
      path?: string
    }>,

  drafts: {
    list: () => ipcRenderer.invoke(IPC.DRAFTS_LIST) as Promise<Draft[]>,
    save: (draft: Draft) => ipcRenderer.invoke(IPC.DRAFTS_SAVE, draft) as Promise<void>,
    delete: (draftId: string) =>
      ipcRenderer.invoke(IPC.DRAFTS_DELETE, draftId) as Promise<void>,
    clearAll: () => ipcRenderer.invoke(IPC.DRAFTS_CLEAR_ALL) as Promise<void>
  },

  updates: {
    check: () => ipcRenderer.send(IPC.UPDATE_CHECK),
    install: () => ipcRenderer.send(IPC.UPDATE_INSTALL),
    onEvent: (cb: (event: UpdateEvent) => void) => {
      const listener = (_: unknown, event: UpdateEvent): void => cb(event)
      ipcRenderer.on(IPC.UPDATE_EVENT, listener)
      return () => ipcRenderer.off(IPC.UPDATE_EVENT, listener)
    }
  },

  ai: {
    getSettings: () => ipcRenderer.invoke(IPC.AI_SETTINGS_GET) as Promise<AISettings>,
    setSettings: (partial: Partial<Omit<AISettings, 'keys'>>) =>
      ipcRenderer.invoke(IPC.AI_SETTINGS_SET, partial) as Promise<AISettings>,
    setKey: (provider: AIProvider, key: string) =>
      ipcRenderer.invoke(IPC.AI_KEY_SET, provider, key) as Promise<AISettings>,
    deleteKey: (provider: AIProvider) =>
      ipcRenderer.invoke(IPC.AI_KEY_DELETE, provider) as Promise<AISettings>,
    test: (provider: AIProvider) =>
      ipcRenderer.invoke(IPC.AI_TEST, provider) as Promise<{
        ok: boolean
        error?: string
      }>,
    stream: (id: string, request: AIChatRequest) =>
      ipcRenderer.invoke(IPC.AI_STREAM_START, id, request) as Promise<{
        accepted: boolean
        error?: string
      }>,
    cancel: (id: string) => ipcRenderer.send(IPC.AI_STREAM_CANCEL, id),
    onEvent: (cb: (id: string, event: AIStreamEvent) => void) => {
      const listener = (_: unknown, id: string, event: AIStreamEvent): void =>
        cb(id, event)
      ipcRenderer.on(IPC.AI_STREAM_EVENT, listener)
      return () => ipcRenderer.off(IPC.AI_STREAM_EVENT, listener)
    }
  }
}

contextBridge.exposeInMainWorld('marky', api)
