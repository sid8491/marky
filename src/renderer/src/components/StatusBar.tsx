import { useTabs, type Tab } from '@/store/tabs'
import { useSettings } from '@/store/settings'
import { Columns2, FileText, Eye, ArrowDownUp } from 'lucide-react'
import { cn } from '@/lib/cn'

export function StatusBar({ tab }: { tab: Tab | null }): React.ReactElement {
  const setViewMode = useTabs((s) => s.setViewMode)
  const syncScroll = useSettings((s) => s.syncScroll)
  const toggleSyncScroll = useSettings((s) => s.toggleSyncScroll)

  const wordCount = tab ? countWords(tab.content) : 0
  const charCount = tab?.content.length ?? 0

  return (
    <div className="flex h-7 items-center justify-between border-t border-subtle bg-panel px-3 text-xs text-faint select-none">
      <div className="flex items-center gap-4">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{charCount.toLocaleString()} chars</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleSyncScroll}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
            syncScroll ? 'text-accent' : 'hover:text-default'
          )}
          title="Sync scroll editor & preview"
        >
          <ArrowDownUp className="size-3" />
          <span>Sync</span>
        </button>

        {tab && (
          <div className="ml-2 flex items-center rounded-md bg-elevated p-0.5">
            <ViewToggle
              active={tab.viewMode === 'edit'}
              onClick={() => setViewMode(tab.id, 'edit')}
              icon={<FileText className="size-3" />}
              label="Edit"
            />
            <ViewToggle
              active={tab.viewMode === 'split'}
              onClick={() => setViewMode(tab.id, 'split')}
              icon={<Columns2 className="size-3" />}
              label="Split"
            />
            <ViewToggle
              active={tab.viewMode === 'preview'}
              onClick={() => setViewMode(tab.id, 'preview')}
              icon={<Eye className="size-3" />}
              label="Preview"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ViewToggle({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
        active ? 'bg-surface text-default shadow-sm' : 'hover:text-default'
      )}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
