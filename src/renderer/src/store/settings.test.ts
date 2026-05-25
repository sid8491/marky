import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSettings } from './settings'

const KEY = 'marky:settings'

function snapshot(): ReturnType<typeof useSettings.getState> {
  return useSettings.getState()
}

describe('settings store — PDF preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    useSettings.setState({
      pdf: {
        pageSize: 'A4',
        margins: 'default',
        landscape: false,
        printBackground: true,
        displayPageNumbers: false
      }
    })
    localStorage.clear()
  })

  it('seeds sensible defaults when nothing is persisted', () => {
    const { pdf } = snapshot()
    expect(pdf.pageSize).toBe('A4')
    expect(pdf.margins).toBe('default')
    expect(pdf.landscape).toBe(false)
    expect(pdf.printBackground).toBe(true)
    expect(pdf.displayPageNumbers).toBe(false)
  })

  it('setPdf merges partial updates without clobbering other fields', () => {
    snapshot().setPdf({ pageSize: 'Letter', landscape: true })
    const { pdf } = snapshot()
    expect(pdf.pageSize).toBe('Letter')
    expect(pdf.landscape).toBe(true)
    expect(pdf.margins).toBe('default')
    expect(pdf.printBackground).toBe(true)
  })

  it('persists PDF prefs to localStorage so the next session reads them back', () => {
    snapshot().setPdf({ margins: 'narrow', displayPageNumbers: true })
    const raw = localStorage.getItem(KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as { pdf?: Record<string, unknown> }
    expect(parsed.pdf).toMatchObject({
      margins: 'narrow',
      displayPageNumbers: true
    })
  })
})
