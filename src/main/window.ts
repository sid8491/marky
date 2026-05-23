import { app, BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function resolveWindowIcon(): string | undefined {
  // Production builds bake the icon into the executable via electron-builder.
  // For dev, point at the source PNG so the taskbar/dock shows the right art.
  if (is.dev) {
    const devIcon = join(app.getAppPath(), 'build/icons/256x256.png')
    return existsSync(devIcon) ? devIcon : undefined
  }
  return undefined
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon: resolveWindowIcon(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    // No titleBarOverlay — we render the min/max/close controls ourselves
    // in React (see components/TitleBar.tsx). Having both creates duplicate
    // buttons and steals click areas from our drag region.
    trafficLightPosition: { x: 14, y: 12 },
    backgroundColor: '#0b0b0e',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const emitMaxChanged = (): void => {
    win.webContents.send('win:maximize-changed', win.isMaximized())
  }
  win.on('maximize', emitMaxChanged)
  win.on('unmaximize', emitMaxChanged)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
