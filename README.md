# Marky

A beautiful cross-platform Markdown editor with first-class AI assistance and pixel-perfect PDF export.

> Status: early — v0.1. Core editor, preview, AI, and PDF export are wired up. Shipping polish (icons, code signing, auto-update) is still pending.

---

## Highlights

- **Multi-tab editor** with side-by-side editor/preview, draggable split, `*` dirty indicator, drag-reorder, middle-click close.
- **AI-native writing** — invoked explicitly, never intrusively.
  - On-demand continuation: press `Ctrl+J` (or use the command palette) to request an AI continuation at the cursor. `Tab` accepts, `Esc` dismisses. Optional auto-suggest as-you-type is available in Settings.
  - Selection refine toolbar (Gmail-style): Rewrite / Shorter / Longer / Grammar / Continue / Tone / Ask AI.
  - Streaming Accept / Reject / Try-again flow.
  - Provider abstraction over **Anthropic, OpenAI, Google, and Ollama** — bring your own key.
- **Pixel-perfect PDF export** via Chromium's print engine — the PDF matches the live preview exactly.
- **Rich Markdown rendering**
  - GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks).
  - LaTeX math via KaTeX (`$inline$` and `$$display$$`).
  - Syntax-highlighted code via Shiki (VS Code grade, dual light/dark theme).
  - Mermaid diagrams (lazy-loaded only when used).
- **Premium look and feel**
  - Frameless window with custom title bar (native traffic lights on macOS, custom controls on Win/Linux).
  - Light / Dark / System theme with smooth crossfade.
  - Spring-animated tabs, palette, toasts, modals (Framer Motion).
- **Power-user UX**
  - Command palette (`Ctrl+K`) with fuzzy search and recent files.
  - Find & replace, image paste/drop, external-file-change detection, recent files.
- **Privacy-first AI key storage**
  - API keys are encrypted with your OS keychain (DPAPI on Windows, Keychain on macOS, libsecret on Linux) via Electron's built-in `safeStorage` — no native modules to compile.
  - All AI calls run in the main process; the renderer never sees your keys.

---

## Install

Pre-built installers are published on the [Releases](https://github.com/sid8491/marky/releases) page. Pick the one for your OS.

### Windows

1. Download `Marky-<version>-setup.exe` from the latest release.
2. Double-click to run the NSIS installer. A desktop shortcut is created by default.
3. Supported: Windows 10 (1903+) and Windows 11, x64.

Until code signing is in place, SmartScreen may warn you on first launch — click **More info → Run anyway**.

### macOS

1. Download `Marky-<version>-arm64.dmg` (Apple Silicon) or `Marky-<version>-x64.dmg` (Intel).
2. Open the DMG and drag **Marky** to your Applications folder.
3. Supported: macOS 11 (Big Sur) and newer.

Until the build is notarized, Gatekeeper will block the first launch. Right-click **Marky.app → Open**, then confirm. Once approved, normal launches work.

### Linux

1. Download `Marky-<version>.AppImage` from the latest release.
2. Make it executable and run:
   ```bash
   chmod +x Marky-*.AppImage
   ./Marky-*.AppImage
   ```
3. Requirements:
   - GTK 3 and `libsecret` (most distros ship these). On Debian/Ubuntu: `sudo apt install libsecret-1-0`. `libsecret` is required for encrypted API key storage.
   - A running secret service (GNOME Keyring or KWallet) for the OS keychain to work. Without it, AI key storage will be disabled.

> A `.deb` package is on the roadmap.

---

## AI setup

1. Open Settings (`Ctrl+,` or the gear icon).
2. Pick a provider and enter your API key.
3. Click **Test** — you should see "connected".

| Provider  | Where to get a key                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Anthropic | https://console.anthropic.com/                                                                                             |
| OpenAI    | https://platform.openai.com/api-keys                                                                                       |
| Google    | https://aistudio.google.com/app/apikey                                                                                     |
| Ollama    | No key required — install Ollama locally and ensure it's running on the configured URL (default `http://localhost:11434`). |

Keys are encrypted at rest and stored in `<userData>/ai-settings.json` using your OS keychain. Removing the file resets all keys and AI settings.

`<userData>` resolves to:

- Windows: `%APPDATA%\Marky\`
- macOS: `~/Library/Application Support/Marky/`
- Linux: `~/.config/Marky/`

---

## Build from source

For development, contributing, or building your own installers.

**Prerequisites**

- Node.js 20.10+ (24.x recommended)
- npm 10+
- A working internet connection on first install (Electron downloads its binary).

**Run in dev mode**

```bash
git clone https://github.com/sid8491/marky.git
cd marky
npm install
npm run dev
```

The Electron window opens with HMR enabled. Press `Ctrl+K` for the command palette.

---

## Keyboard shortcuts

| Shortcut         | Action                            |
| ---------------- | --------------------------------- |
| `Ctrl+N`         | New file                          |
| `Ctrl+O`         | Open file                         |
| `Ctrl+S`         | Save                              |
| `Ctrl+Shift+S`   | Save as                           |
| `Ctrl+W`         | Close active tab                  |
| `Ctrl+E`         | Export to PDF                     |
| `Ctrl+K`         | Command palette                   |
| `Ctrl+,`         | Settings                          |
| `Ctrl+F`         | Find in editor                    |
| `Ctrl+\`         | Toggle split view                 |
| `Ctrl+Shift+E`   | Editor only                       |
| `Ctrl+Shift+V`   | Preview only                      |
| `Ctrl+J`         | Request AI continuation at cursor |
| `Tab` _(editor)_ | Accept ghost-text suggestion      |
| `Esc` _(editor)_ | Dismiss ghost-text suggestion     |

On macOS, substitute `Cmd` for `Ctrl`.

---

## Tech stack

| Layer        | Tech                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| Runtime      | Electron 42 (Chromium + Node.js)                                          |
| Build        | electron-vite, Vite 7, electron-builder                                   |
| UI           | React 19 + TypeScript, Tailwind CSS v4                                    |
| Motion       | Framer Motion (`motion`)                                                  |
| Icons        | Lucide                                                                    |
| Editor       | CodeMirror 6 with custom theme + extensions                               |
| Markdown     | unified · remark-parse · remark-gfm · remark-math · remark-rehype         |
| Highlighting | Shiki (with dual light/dark theme)                                        |
| Math         | KaTeX                                                                     |
| Diagrams     | Mermaid (dynamic import)                                                  |
| State        | Zustand                                                                   |
| AI SDKs      | `@anthropic-ai/sdk`, `openai`, `@google/genai`, native `fetch` for Ollama |
| Key storage  | Electron `safeStorage` (OS keychain)                                      |

---

## Project structure

```
src/
  main/              Electron main process
    index.ts         App lifecycle
    window.ts        Frameless window + native controls
    ipc/             IPC handlers (window, files, pdf, ai)
    ai/              Provider implementations + safeStorage settings
  preload/
    index.ts         contextBridge surface (window.marky)
    index.d.ts
  shared/            Types shared across processes
    ipc-contract.ts
    types.ts
    ai.ts
  renderer/
    index.html
    src/
      App.tsx        Root layout
      main.tsx       React entry
      components/    TitleBar, TabBar, EditorPane, PreviewPane,
                     SplitPane, StatusBar, EmptyState,
                     CommandPalette, SettingsModal,
                     SelectionToolbar, Toaster
      editor/        CodeMirror extensions: theme, imagePaste,
                     ghostText, selectionTracker
      preview/       unified pipeline + Mermaid hydration + styles.css
      store/         Zustand stores (tabs, settings, recent, toasts, ai)
      ai/            Streaming client + prompt templates
      hooks/         useFileCommands, useViewShortcuts, useFileWatching
      lib/           cn, id, exportPdf
      styles.css     Tailwind + theme tokens
```

---

## Architecture notes

### Three processes

- **Main** (Node): window lifecycle, native dialogs, file I/O, file watching, PDF export, OS keychain access, all AI provider calls.
- **Renderer** (Chromium): React UI, CodeMirror, preview rendering. No direct Node access.
- **Preload**: tiny typed bridge that exposes `window.marky` via `contextBridge`. Defined in `src/shared/ipc-contract.ts`.

### Security defaults

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Strict CSP in production (no remote script sources, only inline styles, no remote connect outside dev HMR).
- All AI traffic originates from the main process — API keys never reach the renderer.
- Markdown HTML is generated by the local `remark/rehype` pipeline with `allowDangerousHtml: false`, so HTML embedded in source content is escaped.

### Pixel-perfect PDF

The export pipeline:

1. Re-runs the markdown through the same `remark/rehype` chain used for live preview.
2. Resolves Mermaid blocks to inline SVG so the hidden window doesn't need to bootstrap Mermaid.
3. Spawns a hidden `BrowserWindow`, loads an HTML document with the inlined preview CSS + KaTeX CSS.
4. Calls `webContents.printToPDF` and saves the result via native dialog.

Because the same DOM and CSS are rendered through the same Chromium engine the user sees on screen, the output matches the preview pixel-for-pixel.

### Streaming AI over IPC

`window.marky.ai.stream(id, request)` kicks off a stream in the main process. The main process emits `IPC.AI_STREAM_EVENT` messages back to the renderer with `{ id, event: { type: 'chunk' | 'done' | 'error', ... } }`. The renderer subscribes once at startup and demultiplexes by id. Cancellation flows through `ipcRenderer.send('ai:stream:cancel', id)` which `AbortController.abort()`s the in-flight request.

---

## Building installers

```bash
npm run build:win     # NSIS .exe installer (x64)
npm run build:mac     # DMG (arm64 + x64) — requires macOS host for signing
npm run build:linux   # AppImage
npm run build:unpack  # Unpacked directory, for debugging
```

Code signing certificates and auto-update endpoints are not yet wired up — see [`electron-builder.yml`](./electron-builder.yml).

---

## Scripts

| Script              | What it does                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | Start electron-vite dev server with HMR.                          |
| `npm run build`     | Production bundle to `out/`.                                      |
| `npm run typecheck` | TypeScript check for both Node (main+preload) and Web (renderer). |
| `npm run build:*`   | Produce installers per platform (see above).                      |

---

## Roadmap

Notable items not yet in v0.1:

- Cloud sync (Google Drive / Dropbox / GitHub)
- Crash-recovery drafts to disk
- Vim mode
- Plugin / extension system
- Workspace / folder-tree sidebar
- Auto-save (deliberately omitted in v1)
- App icons, code signing, auto-update

---

## Contributing

Contributions are welcome. Please:

1. Open an issue describing the change before sending a PR for anything non-trivial.
2. Match the existing TypeScript style — strict, no `any` unless unavoidable, prefer named exports.
3. Run `npm run typecheck` and `npm run build` before opening a PR.
4. Keep UI changes consistent with the existing minimal / premium aesthetic (Inter for UI, JetBrains Mono for code, generous whitespace, no visual noise).

For larger features, open an issue first so we can discuss architecture before you build.

---

## License

MIT — see [LICENSE](./LICENSE).
