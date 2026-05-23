import { EditorView } from '@codemirror/view'

export interface ImagePasteOpts {
  getDocPath: () => string | undefined
}

function extFromFile(file: File): string {
  const fromName = file.name.match(/\.([^.]+)$/)
  if (fromName) return fromName[1].toLowerCase()
  const fromType = file.type.match(/^image\/(.+)$/)
  if (fromType) return fromType[1].toLowerCase()
  return 'png'
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(bin)
}

async function insertImage(
  view: EditorView,
  file: File,
  opts: ImagePasteOpts
): Promise<void> {
  const ext = extFromFile(file)
  const b64 = await fileToBase64(file)
  const docPath = opts.getDocPath() ?? null
  const altText = file.name.replace(/\.[^.]+$/, '') || 'image'
  let url: string
  try {
    const result = await window.marky.files.saveImage(docPath, ext, b64)
    url = result.relativePath
  } catch {
    // fall back to inline data URL
    url = `data:${file.type || 'image/png'};base64,${b64}`
  }
  const insertText = `![${altText}](${url})\n`
  const head = view.state.selection.main.head
  view.dispatch({
    changes: { from: head, insert: insertText },
    selection: { anchor: head + insertText.length }
  })
}

export function imagePasteExtension(opts: ImagePasteOpts) {
  return EditorView.domEventHandlers({
    paste(e, view) {
      const files = e.clipboardData?.files
      if (!files || files.length === 0) return false
      const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (imgs.length === 0) return false
      e.preventDefault()
      void Promise.all(imgs.map((f) => insertImage(view, f, opts)))
      return true
    },
    drop(e, view) {
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return false
      const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (imgs.length === 0) return false
      e.preventDefault()
      void Promise.all(imgs.map((f) => insertImage(view, f, opts)))
      return true
    }
  })
}
