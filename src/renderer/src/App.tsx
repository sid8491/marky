import { useEffect } from 'react'
import { TitleBar } from '@/components/TitleBar'
import { StatusBar } from '@/components/StatusBar'
import { SplitPane } from '@/components/SplitPane'
import { EditorPane } from '@/components/EditorPane'
import { PreviewPane } from '@/components/PreviewPane'
import { EmptyState } from '@/components/EmptyState'
import { CommandPalette } from '@/components/CommandPalette'
import { Toaster } from '@/components/Toaster'
import { SettingsModal } from '@/components/SettingsModal'
import { useTabs } from '@/store/tabs'
import { useSettings } from '@/store/settings'
import { useAi } from '@/store/ai'
import { useFileCommands } from '@/hooks/useFileCommands'
import { useViewShortcuts } from '@/hooks/useViewShortcuts'
import { useFileWatching } from '@/hooks/useFileWatching'
import { useUpdates } from '@/hooks/useUpdates'

export function App(): React.ReactElement {
  const tabs = useTabs((s) => s.tabs)
  const activeId = useTabs((s) => s.activeId)
  const setSplitRatio = useTabs((s) => s.setSplitRatio)
  const applyTheme = useSettings((s) => s.applyTheme)
  const loadAi = useAi((s) => s.load)

  useFileCommands()
  useViewShortcuts()
  useFileWatching()
  useUpdates()

  useEffect(() => {
    applyTheme()
    void loadAi()
  }, [applyTheme, loadAi])

  const active = tabs.find((t) => t.id === activeId) ?? null

  return (
    <div className="flex h-screen w-screen flex-col bg-surface text-default">
      <TitleBar />
      <main className="relative flex-1 overflow-hidden">
        {active ? (
          <SplitPane
            ratio={active.splitRatio}
            onRatioChange={(r) => setSplitRatio(active.id, r)}
            showLeft={active.viewMode !== 'preview'}
            showRight={active.viewMode !== 'edit'}
            left={<EditorPane tab={active} />}
            right={<PreviewPane tab={active} />}
          />
        ) : (
          <EmptyState />
        )}
      </main>
      <StatusBar tab={active} />
      <CommandPalette />
      <SettingsModal />
      <Toaster />
    </div>
  )
}
