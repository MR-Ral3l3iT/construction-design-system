import { descriptionToLines, linesToDescription, normalizeLines, resolveLines } from './item-lines'

describe('item lines', () => {
  it('normalize: ตัดท้าย ทิ้งบรรทัดว่าง คงระยะเยื้อง เก็บเฉพาะ flag ที่ true', () => {
    expect(
      normalizeLines([
        { text: 'First concept design  ', bold: true, highlight: false },
        { text: '   ' },
        { text: '  แบบแปลนลงสี' },
        { text: '\tsoft scape', highlight: true },
      ]),
    ).toEqual([
      { text: 'First concept design', bold: true },
      { text: '  แบบแปลนลงสี' },
      { text: '  soft scape', highlight: true },
    ])
  })

  it('description ↔ lines', () => {
    expect(descriptionToLines('ก\n\n  ข  \r\nค')).toEqual([
      { text: 'ก' },
      { text: '  ข' },
      { text: 'ค' },
    ])
    expect(linesToDescription([{ text: 'ก', bold: true }, { text: '  ข' }])).toBe('ก\n  ข')
    expect(linesToDescription([])).toBeNull()
  })

  it('resolveLines: lines มาก่อน description, ไม่ส่งทั้งคู่ = ไม่แก้', () => {
    expect(resolveLines({ lines: [{ text: 'ก', bold: true }], description: 'อื่น' })).toEqual({
      lines: [{ text: 'ก', bold: true }],
      description: 'ก',
    })
    expect(resolveLines({ description: 'ข' })).toEqual({ lines: [{ text: 'ข' }], description: 'ข' })
    expect(resolveLines({})).toBeUndefined()
  })
})
