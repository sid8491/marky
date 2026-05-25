import { describe, expect, it } from 'vitest'
import { uid } from './id'

describe('uid', () => {
  it('uses the default prefix when none is given', () => {
    expect(uid().startsWith('id_')).toBe(true)
  })

  it('uses the supplied prefix', () => {
    expect(uid('tab').startsWith('tab_')).toBe(true)
  })

  it('returns a fresh value on every call', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 1000; i++) seen.add(uid('x'))
    expect(seen.size).toBe(1000)
  })
})
