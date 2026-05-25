import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('honours conditional object form', () => {
    expect(cn('a', { b: true, c: false })).toBe('a b')
  })

  it('lets later tailwind utilities win over earlier ones', () => {
    expect(cn('px-2 px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})
