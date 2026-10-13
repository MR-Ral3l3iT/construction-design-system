import { describe, expect, it } from 'vitest'
import {
  DESC_BULLET,
  countDescriptionLines,
  hasBullet,
  normalizeDescription,
  setBulletAll,
  toggleBullet,
  linesToText,
  textToLines,
} from './descLines'

describe('normalizeDescription', () => {
  it('1 บรรทัดคงเป็น 1 บรรทัด', () => {
    expect(normalizeDescription('ผังพื้น\nรูปด้าน\nรูปตัด')).toBe('ผังพื้น\nรูปด้าน\nรูปตัด')
  })

  it('ตัดบรรทัดว่างทิ้ง', () => {
    expect(normalizeDescription('ก\n\n\nข\n   \nค')).toBe('ก\nข\nค')
  })

  it('คงช่องว่างหน้าบรรทัด แต่ตัดช่องว่างท้ายบรรทัด', () => {
    expect(normalizeDescription('  เยื้อง   \nปกติ\t')).toBe('  เยื้อง\nปกติ')
  })

  it('tab นำหน้า → 2 space ต่อ 1 tab', () => {
    expect(normalizeDescription('\tหนึ่ง\n\t\tสอง')).toBe('  หนึ่ง\n    สอง')
  })

  it('รองรับ CRLF และข้อความว่าง', () => {
    expect(normalizeDescription('ก\r\nข')).toBe('ก\nข')
    expect(normalizeDescription('\n  \n')).toBe('')
  })
})

describe('countDescriptionLines', () => {
  it('นับเฉพาะบรรทัดที่มีข้อความ', () => {
    expect(countDescriptionLines('ก\n\nข\n  ')).toBe(2)
    expect(countDescriptionLines('')).toBe(0)
  })
})

describe('toggleBullet / hasBullet', () => {
  it('เติมแล้วกดซ้ำเอาออก', () => {
    expect(toggleBullet('ผังพื้น')).toBe(`${DESC_BULLET}ผังพื้น`)
    expect(toggleBullet('- ผังพื้น')).toBe('ผังพื้น')
    expect(hasBullet('- ผังพื้น')).toBe(true)
    expect(hasBullet('ผังพื้น')).toBe(false)
  })

  it('bullet อยู่หลังระยะเยื้องเสมอ', () => {
    expect(toggleBullet('  ลูก')).toBe('  - ลูก')
    expect(toggleBullet('  - ลูก')).toBe('  ลูก')
  })

  it('ไม่นับขีดกลางคำว่าเป็น bullet', () => {
    expect(hasBullet('ค่า-แรง')).toBe(false)
    expect(toggleBullet('-ติดกัน')).toBe('ติดกัน')
  })
})

describe('setBulletAll', () => {
  it('เติมทุกบรรทัดโดยไม่ซ้อนบรรทัดที่มีอยู่แล้ว', () => {
    expect(setBulletAll('ก\n- ข\n  ค', true)).toBe('- ก\n- ข\n  - ค')
  })

  it('เอาออกทุกบรรทัด', () => {
    expect(setBulletAll('- ก\nข\n  - ค', false)).toBe('ก\nข\n  ค')
  })

  it('บรรทัดว่างไม่ถูกเติม', () => {
    expect(setBulletAll('ก\n\nข', true)).toBe('- ก\n\n- ข')
  })
})

describe('textToLines / linesToText', () => {
  const prev = [
    { text: 'First concept design', bold: true },
    { text: '  แบบแปลนลงสี' },
    { text: '  soft scape', highlight: true },
  ]

  it('ไปกลับได้ และคงรูปแบบเมื่อไม่ได้แก้', () => {
    expect(textToLines(linesToText(prev), prev)).toEqual(prev)
  })

  it('แทรกบรรทัดกลางแล้วรูปแบบของบรรทัดด้านล่างไม่หลุด', () => {
    const text = 'First concept design\n  บรรทัดใหม่\n  แบบแปลนลงสี\n  soft scape'
    expect(textToLines(text, prev)).toEqual([
      { text: 'First concept design', bold: true },
      { text: '  บรรทัดใหม่' },
      { text: '  แบบแปลนลงสี' },
      { text: '  soft scape', highlight: true },
    ])
  })

  it('บรรทัดที่ถูกแก้ข้อความ → ไม่ติดรูปแบบเดิม', () => {
    expect(textToLines('First concept design (แก้)', prev)).toEqual([
      { text: 'First concept design (แก้)' },
    ])
  })

  it('ข้อความซ้ำกันจับคู่ทีละบรรทัด ไม่ใช้รูปแบบซ้ำ', () => {
    const dup = [{ text: 'ก', bold: true }, { text: 'ก' }]
    expect(textToLines('ก\nก\nก', dup)).toEqual([
      { text: 'ก', bold: true },
      { text: 'ก' },
      { text: 'ก' },
    ])
  })

  it('ข้อความว่าง → ไม่มีบรรทัด', () => {
    expect(textToLines('\n  \n', prev)).toEqual([])
  })
})
