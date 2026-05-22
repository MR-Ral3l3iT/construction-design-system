import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatCurrency, formatNumber } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skipped', 'included')).toBe('base included')
  })
})

describe('formatDate', () => {
  it('formats a date string in Thai locale', () => {
    const result = formatDate('2026-01-15')
    // Thai locale: "15 มกราคม พ.ศ. 2569" or similar — just verify year is present
    expect(result).toContain('2569')
  })

  it('accepts a Date object', () => {
    const result = formatDate(new Date('2026-06-01'))
    expect(result).toContain('2569')
  })
})

describe('formatCurrency', () => {
  it('formats THB currency', () => {
    const result = formatCurrency(100000)
    expect(result).toContain('100')
    expect(result).toContain('000')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })
})

describe('formatNumber', () => {
  it('formats numbers with Thai locale', () => {
    const result = formatNumber(1000)
    // Thai locale uses , as thousands separator
    expect(result).toContain('1')
    expect(result).toContain('000')
  })
})
