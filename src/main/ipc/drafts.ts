import { app, ipcMain } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { IPC } from '@shared/ipc-contract'
import type { Draft } from '@shared/types'

const DRAFT_EXT = '.json'

function draftsDir(): string {
  return join(app.getPath('userData'), 'drafts')
}

function draftPath(draftId: string): string {
  return join(draftsDir(), encodeURIComponent(draftId) + DRAFT_EXT)
}

async function ensureDir(): Promise<string> {
  const dir = draftsDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function readOne(filename: string): Promise<Draft | null> {
  try {
    const raw = await fs.readFile(join(draftsDir(), filename), 'utf8')
    const parsed = JSON.parse(raw) as Draft
    if (!parsed.draftId || typeof parsed.content !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function registerDraftsIpc(): void {
  ipcMain.handle(IPC.DRAFTS_LIST, async (): Promise<Draft[]> => {
    const dir = await ensureDir()
    const entries = await fs.readdir(dir)
    const files = entries.filter((f) => f.endsWith(DRAFT_EXT))
    const drafts = await Promise.all(files.map(readOne))
    return drafts
      .filter((d): d is Draft => d !== null)
      .sort((a, b) => b.savedAt - a.savedAt)
  })

  ipcMain.handle(IPC.DRAFTS_SAVE, async (_e, draft: Draft): Promise<void> => {
    await ensureDir()
    const tmp = draftPath(draft.draftId) + '.tmp'
    const final = draftPath(draft.draftId)
    await fs.writeFile(tmp, JSON.stringify(draft), 'utf8')
    await fs.rename(tmp, final)
  })

  ipcMain.handle(IPC.DRAFTS_DELETE, async (_e, draftId: string): Promise<void> => {
    try {
      await fs.unlink(draftPath(draftId))
    } catch {
      // already gone — fine
    }
  })

  ipcMain.handle(IPC.DRAFTS_CLEAR_ALL, async (): Promise<void> => {
    try {
      const dir = draftsDir()
      const entries = await fs.readdir(dir)
      await Promise.all(
        entries
          .filter((f) => f.endsWith(DRAFT_EXT))
          .map((f) => fs.unlink(join(dir, f)).catch(() => undefined))
      )
    } catch {
      // dir missing — fine
    }
  })
}
