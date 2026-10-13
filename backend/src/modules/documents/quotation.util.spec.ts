import { calcTax } from '../../common/utils/money.util'
import {
  allocateInstallments,
  installmentTimingText,
  planInstallmentsByNet,
  revisionCode,
} from './quotation.util'

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

describe('planInstallmentsByNet', () => {
  const totals = calcTax({ subtotal: '173076.92', vatRate: 0.07, whtRate: 0.03 }) // สุทธิ 179,999.99

  it('ยอดสุทธิของงวด = % ของยอดสุทธิเอกสาร และทุกคอลัมน์รวมได้เท่าเอกสาร', () => {
    const rows = planInstallmentsByNet(totals, ['30', '35', '20', '15'])
    expect(rows.map((r) => r.netAmount.toFixed(2))).toEqual([
      '54000.00',
      '63000.00',
      '36000.00',
      '26999.99', // งวดสุดท้ายรับเศษ: 179,999.99 − 153,000.00
    ])
    const total = (k: 'amount' | 'vatAmount' | 'whtAmount' | 'netAmount') =>
      rows.reduce((a, r) => a.plus(r[k]), totals.baseAmount.minus(totals.baseAmount)).toFixed(2)
    expect(total('amount')).toBe(totals.baseAmount.toFixed(2))
    expect(total('vatAmount')).toBe(totals.vatAmount.toFixed(2))
    expect(total('whtAmount')).toBe(totals.whtAmount.toFixed(2))
    expect(total('netAmount')).toBe(totals.netAmount.toFixed(2))
  })

  it('VAT และหัก ณ ที่จ่ายของงวดห่างจากสูตรไม่เกิน 1 สตางค์ (ราคาก่อน VAT รับส่วนต่างจากการปัด)', () => {
    for (const r of planInstallmentsByNet(totals, ['30', '35', '20', '15']).slice(0, -1)) {
      const exact = calcTax({ subtotal: r.amount, vatRate: 0.07, whtRate: 0.03 })
      expect(exact.vatAmount.minus(r.vatAmount).abs().lessThanOrEqualTo(0.01)).toBe(true)
      expect(exact.whtAmount.minus(r.whtAmount).abs().lessThanOrEqualTo(0.01)).toBe(true)
    }
  })

  it('แต่ละงวด ราคา + VAT − หัก = สุทธิ', () => {
    for (const r of planInstallmentsByNet(totals, ['30', '35', '20', '15'])) {
      expect(r.amount.plus(r.vatAmount).minus(r.whtAmount).toFixed(2)).toBe(r.netAmount.toFixed(2))
    }
  })

  it('ไม่หัก ณ ที่จ่าย → สุทธิ = ยอดรวม VAT', () => {
    const t = calcTax({ subtotal: 100000, vatRate: 0.07 })
    const rows = planInstallmentsByNet(t, ['50', '50'])
    expect(rows.map((r) => r.netAmount.toFixed(2))).toEqual(['53500.00', '53500.00'])
    expect(rows.every((r) => r.whtAmount.isZero())).toBe(true)
  })

  it('ออกจริงต้องครบ 100% · preview แบ่งตาม % ได้แม้ไม่ครบ', () => {
    expect(() => planInstallmentsByNet(totals, ['50', '40'])).toThrow('100%')
    expect(planInstallmentsByNet(totals, ['50', '40'], false)).toHaveLength(2)
  })
})
