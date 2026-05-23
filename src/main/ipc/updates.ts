import { ipcMain, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { IPC } from '@shared/ipc-contract'
import type { UpdateEvent } from '@shared/ipc-contract'

export function registerUpdatesIpc(getMainWindow: () => BrowserWindow | null): void {
  // disable autoUpdater in dev — it has no metadata to compare against
  if (is.dev) {
    ipcMain.on(IPC.UPDATE_CHECK, () => {
      getMainWindow()?.webContents.send(IPC.UPDATE_EVENT, {
        type: 'not-available'
      } satisfies UpdateEvent)
    })
    ipcMain.on(IPC.UPDATE_INSTALL, () => {})
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const send = (event: UpdateEvent): void => {
    getMainWindow()?.webContents.send(IPC.UPDATE_EVENT, event)
  }

  autoUpdater.on('checking-for-update', () => send({ type: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    send({ type: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => send({ type: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    send({ type: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    send({ type: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (err) =>
    send({ type: 'error', message: err.message ?? String(err) })
  )

  ipcMain.on(IPC.UPDATE_CHECK, () => {
    void autoUpdater.checkForUpdates().catch((err) => {
      send({ type: 'error', message: (err as Error).message ?? String(err) })
    })
  })

  ipcMain.on(IPC.UPDATE_INSTALL, () => {
    autoUpdater.quitAndInstall()
  })

  // Initial silent check after a short delay so we don't slow startup.
  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch(() => {
      // swallow — initial check failures are non-fatal
    })
  }, 5000)
}
