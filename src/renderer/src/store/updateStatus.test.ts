import { beforeEach, describe, expect, it } from 'vitest'
import { useUpdateStatus } from './updateStatus'

function reset(): void {
  useUpdateStatus.getState().reset()
}

describe('updateStatus store', () => {
  beforeEach(reset)

  it('starts idle with no version, no error, and 0% progress', () => {
    const s = useUpdateStatus.getState()
    expect(s.phase).toBe('idle')
    expect(s.percent).toBe(0)
    expect(s.version).toBeNull()
    expect(s.errorMessage).toBeNull()
  })

  it('transitions through a normal download lifecycle', () => {
    const apply = useUpdateStatus.getState().apply

    apply({ type: 'checking' })
    expect(useUpdateStatus.getState().phase).toBe('checking')

    apply({ type: 'available', version: '0.3.0' })
    expect(useUpdateStatus.getState()).toMatchObject({
      phase: 'available',
      version: '0.3.0',
      percent: 0
    })

    apply({ type: 'downloading', percent: 42 })
    expect(useUpdateStatus.getState()).toMatchObject({
      phase: 'downloading',
      percent: 42,
      version: '0.3.0'
    })

    apply({ type: 'downloading', percent: 99 })
    expect(useUpdateStatus.getState().percent).toBe(99)

    apply({ type: 'downloaded', version: '0.3.0' })
    expect(useUpdateStatus.getState()).toMatchObject({
      phase: 'downloaded',
      percent: 100,
      version: '0.3.0'
    })
  })

  it('records an error and clears it on the next non-error event', () => {
    const apply = useUpdateStatus.getState().apply
    apply({ type: 'error', message: 'ETIMEDOUT' })
    expect(useUpdateStatus.getState()).toMatchObject({
      phase: 'error',
      errorMessage: 'ETIMEDOUT'
    })

    apply({ type: 'checking' })
    expect(useUpdateStatus.getState()).toMatchObject({
      phase: 'checking',
      errorMessage: null
    })
  })

  it('collapses to not-available on a clean check', () => {
    const apply = useUpdateStatus.getState().apply
    apply({ type: 'checking' })
    apply({ type: 'not-available' })
    expect(useUpdateStatus.getState()).toMatchObject({
      phase: 'not-available',
      percent: 0,
      errorMessage: null
    })
  })

  it('preserves the version across percent updates while downloading', () => {
    const apply = useUpdateStatus.getState().apply
    apply({ type: 'available', version: '0.3.0' })
    apply({ type: 'downloading', percent: 10 })
    apply({ type: 'downloading', percent: 50 })
    expect(useUpdateStatus.getState().version).toBe('0.3.0')
  })
})
