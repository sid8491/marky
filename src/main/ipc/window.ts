import { app, ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-contract'

export function registerWindowIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.on(IPC.WIN_MINIMIZE, () => getMainWindow()?.minimize())
  ipcMain.on(IPC.WIN_MAXIMIZE, () => {
    const w = getMainWindow()
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.on(IPC.WIN_CLOSE, () => getMainWindow()?.close())
  ipcMain.handle(IPC.WIN_IS_MAXIMIZED, () => Boolean(getMainWindow()?.isMaximized()))
  ipcMain.handle(IPC.PLATFORM, () => process.platform)
  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion())
}
