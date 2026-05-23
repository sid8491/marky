import { useEffect, useState } from 'react'
import { Minus, Square, X, Copy, Moon, Sun, Monitor, Settings2 } from 'lucide-react'
import { useSettings } from '@/store/settings'
import { useAi } from '@/store/ai'
import { cn } from '@/lib/cn'
import { TabBar } from './TabBar'
import type { Platform } from '@shared/ipc-contract'

export function TitleBar(): React.ReactElement {
  const [platform, setPlatform] = useState<Platform>('win32')
  const [isMax, setIsMax] = useState(false)
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)
  const openSettings = useAi((s) => s.openSettings)

  useEffect(() => {
    void window.marky.platform().then(setPlatform)
    void window.marky.win.isMaximized().then(setIsMax)
    return window.marky.win.onMaximizeChanged(setIsMax)
  }, [])

  const isMac = platform === 'darwin'

  const cycleTheme = (): void => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }

  return (
    <div
      className={cn(
        'app-drag flex h-9 items-stretch border-b border-subtle bg-panel select-none',
        isMac && 'pl-20'
      )}
    >
      {/* tab bar fills available space (its own elements opt back out of drag) */}
      <div className="flex-1 min-w-0">
        <TabBar />
      </div>

      <div className="app-no-drag flex items-center gap-1 pr-2">
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className="rounded-md p-1.5 text-faint hover:bg-elevated hover:text-default transition-colors"
        >
          {theme === 'light' ? (
            <Sun className="size-4" />
          ) : theme === 'dark' ? (
            <Moon className="size-4" />
          ) : (
            <Monitor className="size-4" />
          )}
        </button>
        <button
          onClick={openSettings}
          title="Settings (Ctrl+,)"
          className="rounded-md p-1.5 text-faint hover:bg-elevated hover:text-default transition-colors"
        >
          <Settings2 className="size-4" />
        </button>
      </div>

      {!isMac && (
        <div className="app-no-drag flex items-stretch">
          <WinButton onClick={() => window.marky.win.minimize()} label="Minimize">
            <Minus className="size-4" />
          </WinButton>
          <WinButton
            onClick={() => window.marky.win.maximize()}
            label={isMax ? 'Restore' : 'Maximize'}
          >
            {isMax ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
          </WinButton>
          <WinButton
            onClick={() => window.marky.win.close()}
            label="Close"
            danger
          >
            <X className="size-4" />
          </WinButton>
        </div>
      )}
    </div>
  )
}

function WinButton({
  onClick,
  children,
  label,
  danger
}: {
  onClick: () => void
  children: React.ReactNode
  label: string
  danger?: boolean
}): React.ReactElement {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex w-11 items-center justify-center text-faint transition-colors',
        danger ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-elevated hover:text-default'
      )}
    >
      {children}
    </button>
  )
}
