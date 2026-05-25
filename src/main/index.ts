import { app, BrowserWindow, session } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerWindowIpc } from './ipc/window'
import {
  registerFileIpc,
  disposeFileWatchers,
  queueFileFromOs,
  flushQueuedFilesTo
} from './ipc/files'
import { registerPdfIpc } from './ipc/pdf'
import { registerAiIpc } from './ipc/ai'
import { registerUpdatesIpc } from './ipc/updates'
import { registerDraftsIpc } from './ipc/drafts'

const MD_EXTENSIONS = /\.(md|markdown|mdx|txt)$/i

function installCsp(): void {
  // Dev needs unsafe-eval/unsafe-inline for Vite HMR + Fast Refresh.
  // Prod allows wasm-unsafe-eval for Shiki + Mermaid; blocks everything else strict.
  const csp = is.dev
    ? [
        "default-src 'self' http://localhost:* ws://localhost:* data: blob:",
        "script-src 'self' http://localhost:* 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: http://localhost:*",
        "img-src 'self' data: blob: file: http://localhost:*",
        "connect-src 'self' http://localhost:* ws://localhost:* https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com http://localhost:11434",
        "worker-src 'self' blob:"
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "img-src 'self' data: blob: file:",
        "connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com http://localhost:11434",
        "worker-src 'self' blob:"
      ].join('; ')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

let mainWindow: BrowserWindow | null = null

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function extractMarkdownPathsFromArgv(argv: string[]): string[] {
  // Skip the executable and any switches; keep anything that looks like a
  // markdown-flavoured file path.
  return argv.slice(1).filter((arg) => !arg.startsWith('-') && MD_EXTENSIONS.test(arg))
}

function focusMainWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

// Single-instance lock so double-clicking a .md file while Marky is already
// running forwards the path to the existing instance instead of spawning a
// second app.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    for (const path of extractMarkdownPathsFromArgv(argv)) {
      void queueFileFromOs(path, mainWindow)
    }
    focusMainWindow()
  })

  // macOS: Finder hands us a path via this event. May fire BEFORE the app is
  // ready (when the app launches in response to a double-click).
  app.on('open-file', (event, path) => {
    event.preventDefault()
    void queueFileFromOs(path, mainWindow)
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.marky.app')
    installCsp()

    app.on('browser-window-created', (_, win) => {
      optimizer.watchWindowShortcuts(win)
    })

    registerWindowIpc(getMainWindow)
    registerFileIpc(getMainWindow)
    registerPdfIpc(getMainWindow)
    registerAiIpc(getMainWindow)
    registerUpdatesIpc(getMainWindow)
    registerDraftsIpc()

    // Windows/Linux: file path is passed as argv when the OS launches us via
    // a file association. Queue these before showing the window.
    for (const path of extractMarkdownPathsFromArgv(process.argv)) {
      void queueFileFromOs(path, null)
    }

    mainWindow = createMainWindow()
    mainWindow.on('closed', () => {
      mainWindow = null
    })
    mainWindow.webContents.once('did-finish-load', () => {
      // Renderer also pulls via files.getPending() on mount, but push too so
      // late-arriving open-file events surface promptly.
      flushQueuedFilesTo(mainWindow)
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    disposeFileWatchers()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
