import { ipcMain, BrowserWindow, dialog } from 'electron'
import { promises as fs } from 'node:fs'
import { IPC } from '@shared/ipc-contract'
import type { ExportPdfOptions } from '@shared/types'

const MARGINS = {
  default: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
  narrow: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
  none: { top: 0, bottom: 0, left: 0, right: 0 }
} as const

export function registerPdfIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.EXPORT_PDF, async (_e, opts: ExportPdfOptions) => {
    const parent = getMainWindow()
    if (!parent) return { canceled: true }

    const save = await dialog.showSaveDialog(parent, {
      title: 'Export to PDF',
      defaultPath: (opts.defaultName ?? 'document') + '.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (save.canceled || !save.filePath) return { canceled: true }

    const hidden = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true }
    })

    try {
      await hidden.loadURL(
        'data:text/html;charset=utf-8,' + encodeURIComponent(opts.html)
      )
      // give layout / fonts / images a beat to settle
      await new Promise((r) => setTimeout(r, 150))

      const margins = MARGINS[opts.margins ?? 'default']
      const data = await hidden.webContents.printToPDF({
        printBackground: opts.printBackground ?? true,
        pageSize: opts.pageSize ?? 'A4',
        margins: {
          marginType: 'custom',
          top: margins.top,
          bottom: margins.bottom,
          left: margins.left,
          right: margins.right
        },
        preferCSSPageSize: true
      })
      await fs.writeFile(save.filePath, data)
      return { canceled: false, path: save.filePath }
    } finally {
      hidden.destroy()
    }
  })
}
