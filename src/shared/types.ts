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
