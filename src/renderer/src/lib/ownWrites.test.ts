import { beforeEach, describe, expect, it } from 'vitest'
import {
  OWN_WRITE_GRACE_MS,
  beginOwnWrite,
  endOwnWrite,
  isOwnWrite,
  resetOwnWrites
} from './ownWrites'

describe('ownWrites', () => {
  beforeEach(resetOwnWrites)

  it('is not an own write by default', () => {
    expect(isOwnWrite('/a.md')).toBe(false)
  })

  it('flags a path while a write is in flight', () => {
    beginOwnWrite('/a.md')
    expect(isOwnWrite('/a.md')).toBe(true)
    expect(isOwnWrite('/b.md')).toBe(false)
  })

  it('keeps flagging for the grace window after the write completes', () => {
    beginOwnWrite('/a.md')
    endOwnWrite('/a.md', 1000)
    expect(isOwnWrite('/a.md', 1000 + OWN_WRITE_GRACE_MS - 1)).toBe(true)
    expect(isOwnWrite('/a.md', 1000 + OWN_WRITE_GRACE_MS)).toBe(false)
  })

  it('refcounts overlapping writes to the same path', () => {
    beginOwnWrite('/a.md')
    beginOwnWrite('/a.md')
    endOwnWrite('/a.md', 0)
    // one still in flight, so still "own" even far outside the grace window
    expect(isOwnWrite('/a.md', 10_000_000)).toBe(true)
    endOwnWrite('/a.md', 0)
    expect(isOwnWrite('/a.md', 10_000_000)).toBe(false)
  })
})
