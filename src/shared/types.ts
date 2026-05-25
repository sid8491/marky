export interface FileReadResult {
  path: string
  content: string
  mtimeMs: number
}

export interface OpenFileOptions {
  /** If true, restrict picker to markdown extensions */
  markdownOnly?: boolean
}

export interface SaveFileOptions {
  defaultPath?: string
  defaultName?: string
}

export interface SaveDialogResult {
  canceled: boolean
  path?: string
}

export type PdfPageSize = 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid'
export type PdfMarginPreset = 'default' | 'narrow' | 'none'

export interface ExportPdfOptions {
  html: string
  defaultName?: string
  pageSize?: PdfPageSize
  margins?: PdfMarginPreset
  printBackground?: boolean
  landscape?: boolean
  displayPageNumbers?: boolean
}

/**
 * A snapshot of a dirty editor buffer, persisted to disk so it can be
 * recovered if the app crashes or is killed before the user saves.
 */
export interface Draft {
  draftId: string
  /** Original file path, if the buffer was opened from disk. */
  originPath?: string
  /** Tab title at the time of capture (basename or "Untitled-N"). */
  title: string
  /** Editor content at the time of capture. */
  content: string
  /** The disk-truth content the buffer would compare dirty against. */
  savedContent: string
  /** mtime of the original file when the buffer was opened. */
  mtimeMs?: number
  /** Epoch ms when this snapshot was last written. */
  savedAt: number
}
