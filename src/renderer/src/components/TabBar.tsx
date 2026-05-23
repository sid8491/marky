import { useTabs, isDirty, type Tab } from '@/store/tabs'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function TabBar(): React.ReactElement {
  const tabs = useTabs((s) => s.tabs)
  const activeId = useTabs((s) => s.activeId)
  const newTab = useTabs((s) => s.newTab)
  const setActive = useTabs((s) => s.setActive)

  return (
    // Inherits app-drag from the title bar; individual interactive children
    // re-opt-out with app-no-drag so they remain clickable, leaving the empty
    // area after the last tab/button as a drag handle (for window move +
    // double-click to maximize).
    <div className="flex h-full items-stretch overflow-x-auto">
      {tabs.map((t) => (
        <TabItem
          key={t.id}
          tab={t}
          active={t.id === activeId}
          onClick={() => setActive(t.id)}
        />
      ))}
      <button
        onClick={() => newTab()}
        title="New tab (Ctrl+N)"
        className="app-no-drag flex w-9 shrink-0 items-center justify-center text-faint transition-colors hover:text-default"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

function TabItem({
  tab,
  active,
  onClick
}: {
  tab: Tab
  active: boolean
  onClick: () => void
}): React.ReactElement {
  const closeTab = useTabs((s) => s.closeTab)
  const dirty = isDirty(tab)

  return (
    <div
      onClick={onClick}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault()
          closeTab(tab.id)
        }
      }}
      className={cn(
        'app-no-drag group relative flex h-full max-w-56 min-w-32 shrink-0 cursor-pointer items-center gap-2 border-r border-subtle px-3 text-sm transition-colors',
        active
          ? 'bg-surface text-default'
          : 'text-muted hover:bg-elevated/60 hover:text-default'
      )}
    >
      <span className="truncate">
        {tab.title}
        {dirty && <span className="ml-1 text-accent">*</span>}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          closeTab(tab.id)
        }}
        className={cn(
          'ml-auto rounded p-0.5 transition-opacity',
          'opacity-0 group-hover:opacity-100',
          'hover:bg-ink-700/20'
        )}
        aria-label="Close tab"
      >
        <X className="size-3" />
      </button>
      {active && <span className="absolute inset-x-0 bottom-0 h-px bg-accent" />}
    </div>
  )
}
