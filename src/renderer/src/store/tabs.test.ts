import { beforeEach, describe, expect, it } from 'vitest'
import { isDirty, useTabs } from './tabs'

function reset(): void {
  useTabs.setState({ tabs: [], activeId: null, untitledSeq: 0 })
}

describe('tabs store', () => {
  beforeEach(reset)

  it('creates a new untitled tab and makes it active', () => {
    const id = useTabs.getState().newTab()
    const { tabs, activeId } = useTabs.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].id).toBe(id)
    expect(tabs[0].title).toBe('Untitled-1')
    expect(activeId).toBe(id)
  })

  it('increments the untitled sequence across new tabs', () => {
    useTabs.getState().newTab()
    useTabs.getState().newTab()
    const titles = useTabs.getState().tabs.map((t) => t.title)
    expect(titles).toEqual(['Untitled-1', 'Untitled-2'])
  })

  it('opens a file and uses the basename as the title', () => {
    const id = useTabs
      .getState()
      .openFile({ path: 'C:\\notes\\todo.md', content: 'hi', mtimeMs: 1 })
    const tab = useTabs.getState().tabs.find((t) => t.id === id)!
    expect(tab.title).toBe('todo.md')
    expect(tab.content).toBe('hi')
    expect(tab.savedContent).toBe('hi')
  })

  it('dedupes by path when opening an already-open file', () => {
    const a = useTabs.getState().openFile({ path: '/x/a.md', content: '', mtimeMs: 1 })
    const b = useTabs.getState().openFile({ path: '/x/a.md', content: '', mtimeMs: 1 })
    expect(a).toBe(b)
    expect(useTabs.getState().tabs).toHaveLength(1)
  })

  it('reports dirty when content drifts from savedContent', () => {
    const id = useTabs.getState().newTab()
    useTabs.getState().updateContent(id, 'edited')
    const tab = useTabs.getState().tabs.find((t) => t.id === id)!
    expect(isDirty(tab)).toBe(true)

    useTabs.getState().markSaved(id, 'edited', 2, '/tmp/x.md')
    const saved = useTabs.getState().tabs.find((t) => t.id === id)!
    expect(isDirty(saved)).toBe(false)
    expect(saved.title).toBe('x.md')
  })

  it('clamps splitRatio to [0.1, 0.9]', () => {
    const id = useTabs.getState().newTab()
    useTabs.getState().setSplitRatio(id, 0.01)
    expect(useTabs.getState().tabs[0].splitRatio).toBe(0.1)
    useTabs.getState().setSplitRatio(id, 1.5)
    expect(useTabs.getState().tabs[0].splitRatio).toBe(0.9)
  })

  it('on close, activates the neighbour to the right (or left if last)', () => {
    const a = useTabs.getState().newTab()
    const b = useTabs.getState().newTab()
    const c = useTabs.getState().newTab()

    useTabs.getState().setActive(b)
    useTabs.getState().closeTab(b)
    expect(useTabs.getState().activeId).toBe(c)

    useTabs.getState().closeTab(c)
    expect(useTabs.getState().activeId).toBe(a)

    useTabs.getState().closeTab(a)
    expect(useTabs.getState().activeId).toBeNull()
  })

  it('reorders tabs by index', () => {
    const ids = [
      useTabs.getState().newTab(),
      useTabs.getState().newTab(),
      useTabs.getState().newTab()
    ]
    useTabs.getState().reorder(0, 2)
    const order = useTabs.getState().tabs.map((t) => t.id)
    expect(order).toEqual([ids[1], ids[2], ids[0]])
  })

  it('restores from a draft as a dirty tab carrying both buffers', () => {
    const id = useTabs.getState().restoreFromDraft({
      draftId: 'old-tab',
      originPath: '/x/a.md',
      title: 'a.md',
      content: 'edited but unsaved',
      savedContent: 'on-disk',
      mtimeMs: 42,
      savedAt: 100
    })
    const tab = useTabs.getState().tabs.find((t) => t.id === id)!
    expect(tab.path).toBe('/x/a.md')
    expect(tab.title).toBe('a.md')
    expect(tab.content).toBe('edited but unsaved')
    expect(tab.savedContent).toBe('on-disk')
    expect(tab.mtimeMs).toBe(42)
    expect(isDirty(tab)).toBe(true)
    expect(useTabs.getState().activeId).toBe(id)
  })

  it('restores an untitled draft (no originPath)', () => {
    const id = useTabs.getState().restoreFromDraft({
      draftId: 'old-tab',
      title: 'Untitled-3',
      content: 'scratch',
      savedContent: '',
      savedAt: 100
    })
    const tab = useTabs.getState().tabs.find((t) => t.id === id)!
    expect(tab.path).toBeUndefined()
    expect(tab.title).toBe('Untitled-3')
    expect(isDirty(tab)).toBe(true)
  })
})
