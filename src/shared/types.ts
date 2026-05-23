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

export interface ExportPdfOptions {
  html: string
  defaultName?: string
  pageSize?: 'A4' | 'Letter'
  margins?: 'default' | 'narrow' | 'none'
  printBackground?: boolean
}
