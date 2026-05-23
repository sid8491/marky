import { app, BrowserWindow, session } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerWindowIpc } from './ipc/window'
import { registerFileIpc, disposeFileWatchers } from './ipc/files'
import { registerPdfIpc } from './ipc/pdf'
import { registerAiIpc } from './ipc/ai'
import { registerUpdatesIpc } from './ipc/updates'

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

  mainWindow = createMainWindow()
  mainWindow.on('closed', () => {
    mainWindow = null
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
