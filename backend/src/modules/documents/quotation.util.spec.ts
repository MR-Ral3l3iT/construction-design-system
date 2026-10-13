import { allocateInstallments, installmentTimingText, revisionCode } from './quotation.util'

describe('allocateInstallments', () => {
  it('แบ่งตามสัดส่วนเมื่อหารลงตัว', () => {
    expect(allocateInstallments('100000', ['30', '40', '30']).map(String)).toEqual([
      '30000',
      '40000',
      '30000',
    ])
  })

  it('งวดสุดท้ายรับเศษ ผลรวมเท่ากับยอดเอกสารพอดี', () => {
    const amounts = allocateInstallments('100000', ['33.33', '33.33', '33.34'])
    expect(amounts.map((a) => a.toFixed(2))).toEqual(['33330.00', '33330.00', '33340.00'])

    const odd = allocateInstallments('1000.01', ['50', '50'])
    expect(odd.map((a) => a.toFixed(2))).toEqual(['500.01', '500.00'])
    expect(odd[0].plus(odd[1]).toFixed(2)).toBe('1000.01')
  })

  it('ไม่มีงวด → array ว่าง', () => {
    expect(allocateInstallments('5000', [])).toEqual([])
  })

  it('สัดส่วนรวมไม่ถึงหรือเกิน 100% → error', () => {
    expect(() => allocateInstallments('100', ['50', '40'])).toThrow('100%')
    expect(() => allocateInstallments('100', ['60', '50'])).toThrow('100%')
  })

  it('งวดที่ 0% หรือติดลบ → error', () => {
    expect(() => allocateInstallments('100', ['100', '0'])).toThrow('มากกว่า 0%')
  })
})

describe('revisionCode', () => {
  it('ฉบับแรกใช้เลขฐาน ฉบับแก้ไขต่อท้าย -R{n}', () => {
    expect(revisionCode('QT2610001', 0)).toBe('QT2610001')
    expect(revisionCode('QT2610001', 2)).toBe('QT2610001-R2')
  })
})

describe('installmentTimingText', () => {
  it('แสดงระยะเวลาเมื่อมี', () => {
    expect(installmentTimingText(2)).toBe('ภายใน 2 สัปดาห์')
    expect(installmentTimingText(null)).toBe('')
    expect(installmentTimingText(0)).toBe('')
  })
})
