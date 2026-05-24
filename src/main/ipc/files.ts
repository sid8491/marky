import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import { promises as fs, watch, type FSWatcher } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { randomBytes } from 'node:crypto'
import { IPC } from '@shared/ipc-contract'
import type { FileReadResult, OpenFileOptions } from '@shared/types'

const MD_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'mdx'] },
  { name: 'Text', extensions: ['txt'] },
  { name: 'All Files', extensions: ['*'] }
]

const watchers = new Map<string, FSWatcher>()

/**
 * Files queued by the OS (Finder open-file event on macOS, argv on Win/Linux,
 * second-instance launches) waiting to be delivered to the renderer.
 */
const pendingFromOs: FileReadResult[] = []

async function readFile(path: string): Promise<FileReadResult> {
  const [content, stat] = await Promise.all([fs.readFile(path, 'utf8'), fs.stat(path)])
  return { path, content, mtimeMs: stat.mtimeMs }
}

/**
 * Read the path off disk and either deliver it to the renderer (if the window
 * is up and loaded) or stash it for the next getPending() / flush call.
 */
export async function queueFileFromOs(
  path: string,
  win: BrowserWindow | null
): Promise<void> {
  let file: FileReadResult
  try {
    file = await readFile(path)
  } catch {
    return // unreadable — silently drop
  }
  const wc = win?.webContents
  if (wc && !wc.isLoading()) {
    wc.send(IPC.FILE_OPEN_FROM_OS, file)
  } else {
    pendingFromOs.push(file)
  }
}

/** Drain the queue and push to the renderer once it's ready to receive. */
export function flushQueuedFilesTo(win: BrowserWindow | null): void {
  const wc = win?.webContents
  if (!wc) return
  for (const file of pendingFromOs.splice(0)) {
    wc.send(IPC.FILE_OPEN_FROM_OS, file)
  }
}

export function registerFileIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.FILE_OPEN_DIALOG, async (_e, opts: OpenFileOptions = {}) => {
    const win = getMainWindow()
    if (!win) return []
    const result = await dialog.showOpenDialog(win, {
      title: 'Open Markdown file',
      properties: ['openFile', 'multiSelections'],
      filters: opts.markdownOnly === false ? undefined : MD_FILTERS
    })
    if (result.canceled || result.filePaths.length === 0) return []
    return Promise.all(result.filePaths.map(readFile))
  })

  ipcMain.handle(IPC.FILE_READ, async (_e, path: string) => readFile(path))

  ipcMain.handle(IPC.FILE_WRITE, async (_e, path: string, content: string) => {
    await fs.writeFile(path, content, 'utf8')
    const stat = await fs.stat(path)
    return { mtimeMs: stat.mtimeMs }
  })

  ipcMain.handle(
    IPC.FILE_SAVE_DIALOG,
    async (_e, opts: { defaultName?: string } = {}) => {
      const win = getMainWindow()
      if (!win) return { canceled: true }
      const result = await dialog.showSaveDialog(win, {
        title: 'Save Markdown file',
        defaultPath: opts.defaultName ?? 'untitled.md',
        filters: MD_FILTERS
      })
      if (result.canceled || !result.filePath) return { canceled: true }
      return { canceled: false, path: result.filePath }
    }
  )

  ipcMain.handle(
    IPC.FILE_SAVE_IMAGE,
    async (_e, docPath: string | null, ext: string, dataBase64: string) => {
      const cleanExt = (ext || 'png').replace(/^\.+/, '').toLowerCase()
      const id = randomBytes(5).toString('hex')
      const filename = `img-${Date.now()}-${id}.${cleanExt}`
      const targetDir = docPath
        ? join(dirname(docPath), 'images')
        : join(app.getPath('userData'), 'pasted-images')
      await fs.mkdir(targetDir, { recursive: true })
      const absolutePath = join(targetDir, filename)
      const buf = Buffer.from(dataBase64, 'base64')
      await fs.writeFile(absolutePath, buf)
      const relativePath = docPath
        ? relative(dirname(docPath), absolutePath).split(/\\/g).join('/')
        : absolutePath.split(/\\/g).join('/')
      return { absolutePath, relativePath }
    }
  )

  ipcMain.on(IPC.FILE_WATCH, (_e, path: string) => {
    if (watchers.has(path)) return
    try {
      const w = watch(path, { persistent: false }, async () => {
        try {
          const stat = await fs.stat(path)
          getMainWindow()?.webContents.send(IPC.FILE_CHANGED, path, stat.mtimeMs)
        } catch {
          // file may have been removed mid-event
        }
      })
      watchers.set(path, w)
    } catch {
      // ignore — path may not exist yet
    }
  })

  ipcMain.on(IPC.FILE_UNWATCH, (_e, path: string) => {
    const w = watchers.get(path)
    if (w) {
      w.close()
      watchers.delete(path)
    }
  })

  // Renderer pulls any queued OS-opened files on mount; we also push via
  // FILE_OPEN_FROM_OS once the window is loaded (see flushQueuedFilesTo).
  ipcMain.handle(IPC.FILE_GET_PENDING, () => pendingFromOs.splice(0))
}

export function disposeFileWatchers(): void {
  for (const w of watchers.values()) w.close()
  watchers.clear()
}

export function fileLabel(path: string): string {
  return basename(path)
}
