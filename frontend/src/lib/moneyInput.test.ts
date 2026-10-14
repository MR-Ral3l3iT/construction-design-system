import { describe, expect, it } from 'vitest'
import { caretAfterFormat, formatMoneyInput, parseMoneyInput } from './moneyInput'

describe('money input', () => {
  it('parse: เก็บเฉพาะตัวเลขกับจุดแรก ทศนิยมไม่เกิน 2', () => {
    expect(parseMoneyInput('180,000')).toBe('180000')
    expect(parseMoneyInput('1,234.567')).toBe('1234.56')
    expect(parseMoneyInput('12.3.4')).toBe('12.34')
    expect(parseMoneyInput('abc')).toBe('')
    expect(parseMoneyInput('007')).toBe('7')
    expect(parseMoneyInput('.5')).toBe('0.5')
  })

  it('format: คั่นหลักพัน คงจุดท้ายระหว่างพิมพ์', () => {
    expect(formatMoneyInput('180000')).toBe('180,000')
    expect(formatMoneyInput('1234567.8')).toBe('1,234,567.8')
    expect(formatMoneyInput('1000.')).toBe('1,000.')
    expect(formatMoneyInput('')).toBe('')
  })

  it('cursor อยู่ที่เดิมเมื่อมี , เพิ่ม', () => {
    // พิมพ์ "1000" → "1,000" cursor ท้ายสุด
    expect(caretAfterFormat('1000', 4, '1,000')).toBe(5)
    // แทรก 9 หลังเลข 1 ใน "1,000" → "19,000" cursor หลัง 9
    expect(caretAfterFormat('19,000', 2, '19,000')).toBe(2)
    expect(caretAfterFormat('1,9000', 3, '19,000')).toBe(2)
  })
})
