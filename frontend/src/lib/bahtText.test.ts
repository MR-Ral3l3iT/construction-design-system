import { describe, expect, it } from 'vitest'
import { bahtText } from './bahtText'

describe('bahtText', () => {
  it('เลขพื้นฐาน', () => {
    expect(bahtText(0)).toBe('ศูนย์บาทถ้วน')
    expect(bahtText(1)).toBe('หนึ่งบาทถ้วน')
    expect(bahtText(10)).toBe('สิบบาทถ้วน')
    expect(bahtText(20)).toBe('ยี่สิบบาทถ้วน')
    expect(bahtText(100)).toBe('หนึ่งร้อยบาทถ้วน')
  })

  it('หลักหน่วยเป็น 1 อ่านว่าเอ็ด', () => {
    expect(bahtText(11)).toBe('สิบเอ็ดบาทถ้วน')
    expect(bahtText(21)).toBe('ยี่สิบเอ็ดบาทถ้วน')
    expect(bahtText(101)).toBe('หนึ่งร้อยเอ็ดบาทถ้วน')
    expect(bahtText(1001)).toBe('หนึ่งพันเอ็ดบาทถ้วน')
  })

  it('หลักล้านขึ้นไป', () => {
    expect(bahtText(1_000_000)).toBe('หนึ่งล้านบาทถ้วน')
    expect(bahtText(1_500_000)).toBe('หนึ่งล้านห้าแสนบาทถ้วน')
    expect(bahtText(21_000_000)).toBe('ยี่สิบเอ็ดล้านบาทถ้วน')
    expect(bahtText(1_000_001)).toBe('หนึ่งล้านหนึ่งบาทถ้วน')
  })

  it('สตางค์', () => {
    expect(bahtText(1250.5)).toBe('หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์')
    expect(bahtText(0.25)).toBe('ยี่สิบห้าสตางค์')
    expect(bahtText(5.01)).toBe('ห้าบาทหนึ่งสตางค์')
    expect(bahtText(0.29)).toBe('ยี่สิบเก้าสตางค์')
  })

  it('ยอดจริงจากใบเสนอราคา', () => {
    expect(bahtText(156000)).toBe('หนึ่งแสนห้าหมื่นหกพันบาทถ้วน')
    expect(bahtText(160500)).toBe('หนึ่งแสนหกหมื่นห้าร้อยบาทถ้วน')
  })
})
