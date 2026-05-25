import { ipcMain, BrowserWindow, dialog } from 'electron'
import { promises as fs } from 'node:fs'
import { IPC } from '@shared/ipc-contract'
import type { ExportPdfOptions } from '@shared/types'

const MARGINS = {
  default: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
  narrow: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
  none: { top: 0, bottom: 0, left: 0, right: 0 }
} as const

// Minimum top/bottom margin (in inches) when page numbers are enabled so the
// header/footer don't print on top of content.
const PAGE_NUMBER_MIN_VERTICAL = 0.5

const FOOTER_TEMPLATE =
  '<div style="font-size:9px;color:#888;width:100%;text-align:center;padding:4px 0;font-family:Inter,system-ui,sans-serif;">' +
  '<span class="pageNumber"></span> / <span class="totalPages"></span>' +
  '</div>'
// printToPDF requires both header and footer templates when displayHeaderFooter
// is true. An empty <div> renders nothing visible but satisfies the API.
const EMPTY_HEADER_TEMPLATE = '<div></div>'

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

      const presetMargins = MARGINS[opts.margins ?? 'default']
      const displayPageNumbers = opts.displayPageNumbers ?? false
      const margins = displayPageNumbers
        ? {
            top: Math.max(presetMargins.top, PAGE_NUMBER_MIN_VERTICAL),
            bottom: Math.max(presetMargins.bottom, PAGE_NUMBER_MIN_VERTICAL),
            left: presetMargins.left,
            right: presetMargins.right
          }
        : presetMargins

      const data = await hidden.webContents.printToPDF({
        printBackground: opts.printBackground ?? true,
        pageSize: opts.pageSize ?? 'A4',
        landscape: opts.landscape ?? false,
        margins: {
          marginType: 'custom',
          top: margins.top,
          bottom: margins.bottom,
          left: margins.left,
          right: margins.right
        },
        // preferCSSPageSize is incompatible with displayHeaderFooter — the @page
        // CSS rule overrides the runtime header/footer area.
        preferCSSPageSize: !displayPageNumbers,
        displayHeaderFooter: displayPageNumbers,
        ...(displayPageNumbers && {
          headerTemplate: EMPTY_HEADER_TEMPLATE,
          footerTemplate: FOOTER_TEMPLATE
        })
      })
      await fs.writeFile(save.filePath, data)
      return { canceled: false, path: save.filePath }
    } finally {
      hidden.destroy()
    }
  })
}
