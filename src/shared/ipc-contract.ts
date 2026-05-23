import type {
  FileReadResult,
  OpenFileOptions,
  SaveDialogResult,
  ExportPdfOptions
} from './types'
import type { AIChatRequest, AIProvider, AISettings, AIStreamEvent } from './ai'

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export type Platform =
  | 'aix'
  | 'darwin'
  | 'freebsd'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'android'
  | 'cygwin'
  | 'netbsd'
  | 'haiku'

export const IPC = {
  // window controls
  WIN_MINIMIZE: 'win:minimize',
  WIN_MAXIMIZE: 'win:maximize',
  WIN_CLOSE: 'win:close',
  WIN_IS_MAXIMIZED: 'win:is-maximized',
  WIN_MAXIMIZE_CHANGED: 'win:maximize-changed',

  // platform / app
  PLATFORM: 'app:platform',
  APP_VERSION: 'app:version',

  // file ops
  FILE_OPEN_DIALOG: 'file:open-dialog',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_SAVE_DIALOG: 'file:save-dialog',
  FILE_SAVE_IMAGE: 'file:save-image',
  FILE_WATCH: 'file:watch',
  FILE_UNWATCH: 'file:unwatch',
  FILE_CHANGED: 'file:changed',

  // export
  EXPORT_PDF: 'export:pdf',

  // updates
  UPDATE_EVENT: 'update:event',
  UPDATE_INSTALL: 'update:install',
  UPDATE_CHECK: 'update:check',

  // ai
  AI_SETTINGS_GET: 'ai:settings:get',
  AI_SETTINGS_SET: 'ai:settings:set',
  AI_KEY_SET: 'ai:key:set',
  AI_KEY_DELETE: 'ai:key:delete',
  AI_TEST: 'ai:test',
  AI_STREAM_START: 'ai:stream:start',
  AI_STREAM_CANCEL: 'ai:stream:cancel',
  AI_STREAM_EVENT: 'ai:stream:event'
} as const

export interface MarkyApi {
  platform: () => Promise<Platform>
  appVersion: () => Promise<string>

  win: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizeChanged: (cb: (isMax: boolean) => void) => () => void
  }

  files: {
    openDialog: (opts?: OpenFileOptions) => Promise<FileReadResult[]>
    read: (path: string) => Promise<FileReadResult>
    write: (path: string, content: string) => Promise<{ mtimeMs: number }>
    saveDialog: (opts?: { defaultName?: string }) => Promise<SaveDialogResult>
    saveImage: (
      docPath: string | null,
      ext: string,
      dataBase64: string
    ) => Promise<{ absolutePath: string; relativePath: string }>
    watch: (path: string) => void
    unwatch: (path: string) => void
    onChanged: (cb: (path: string, mtimeMs: number) => void) => () => void
  }

  exportPdf: (opts: ExportPdfOptions) => Promise<{ canceled: boolean; path?: string }>

  updates: {
    check: () => void
    install: () => void
    onEvent: (cb: (event: UpdateEvent) => void) => () => void
  }

  ai: {
    getSettings: () => Promise<AISettings>
    setSettings: (partial: Partial<Omit<AISettings, 'keys'>>) => Promise<AISettings>
    setKey: (provider: AIProvider, key: string) => Promise<AISettings>
    deleteKey: (provider: AIProvider) => Promise<AISettings>
    test: (provider: AIProvider) => Promise<{ ok: boolean; error?: string }>
    stream: (
      id: string,
      request: AIChatRequest
    ) => Promise<{ accepted: boolean; error?: string }>
    cancel: (id: string) => void
    onEvent: (cb: (id: string, event: AIStreamEvent) => void) => () => void
  }
}

declare global {
  interface Window {
    marky: MarkyApi
  }
}
