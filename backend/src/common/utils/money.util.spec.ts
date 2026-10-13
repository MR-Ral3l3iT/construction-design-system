import { Prisma } from '@prisma/client'
import { calcLineAmount, calcTax, D, reverseFromTarget, round2, round4, sum } from './money.util'

describe('money.util', () => {
  describe('D', () => {
    it('ถือว่า null / undefined / ค่าว่าง เป็น 0', () => {
      expect(D(null).toString()).toBe('0')
      expect(D(undefined).toString()).toBe('0')
      expect(D('').toString()).toBe('0')
    })

    it('รับได้ทั้ง string number และ Decimal', () => {
      expect(D('1234.56').toString()).toBe('1234.56')
      expect(D(1234.56).toString()).toBe('1234.56')
      expect(D(new Prisma.Decimal('1234.56')).toString()).toBe('1234.56')
    })
  })

  describe('round2', () => {
    it('ปัดขึ้นแบบ half-up ไม่ใช่ banker rounding', () => {
      expect(round2('1.005').toString()).toBe('1.01')
      expect(round2('2.675').toString()).toBe('2.68')
      expect(round2('1.015').toString()).toBe('1.02')
    })

    it('ไม่เพี้ยนแบบ float — 0.1 + 0.2 ต้องได้ 0.3 พอดี', () => {
      expect(D('0.1').plus(D('0.2')).toString()).toBe('0.3')
      // ยืนยันว่าปัญหานี้มีจริงกับ number ธรรมดา
      expect(0.1 + 0.2).not.toBe(0.3)
    })
  })

  describe('round4', () => {
    it('เก็บอัตราภาษีได้ 4 ตำแหน่ง', () => {
      expect(round4(0.07).toString()).toBe('0.07')
      expect(round4(0.0325).toString()).toBe('0.0325')
    })
  })

  describe('sum', () => {
    it('รวมค่าโดยข้าม null', () => {
      expect(sum(['1.11', '2.22', null, 3.33]).toString()).toBe('6.66')
    })

    it('คืน 0 เมื่อไม่มีค่า', () => {
      expect(sum([]).toString()).toBe('0')
    })
  })

  describe('calcLineAmount', () => {
    it('คูณจำนวนกับราคาต่อหน่วยแล้วปัด 2 ตำแหน่ง', () => {
      expect(calcLineAmount('3', '1250.50').toString()).toBe('3751.5')
      expect(calcLineAmount('0.333', '1000').toString()).toBe('333')
    })
  })

  describe('calcTax', () => {
    it('คิด WHT จากฐานก่อน VAT — เคสมาตรฐาน 150,000 VAT 7% WHT 3%', () => {
      const r = calcTax({ subtotal: '150000', vatRate: '0.07', whtRate: '0.03' })
      expect(r.baseAmount.toString()).toBe('150000')
      expect(r.vatAmount.toString()).toBe('10500')
      // ถ้าคิด WHT จากยอดรวม VAT จะได้ 4815 ซึ่งผิด
      expect(r.whtAmount.toString()).toBe('4500')
      expect(r.grandTotal.toString()).toBe('160500')
      expect(r.netAmount.toString()).toBe('156000')
    })

    it('ไม่หัก ณ ที่จ่ายเมื่อไม่ส่ง whtRate', () => {
      const r = calcTax({ subtotal: '100000', vatRate: '0.07' })
      expect(r.whtAmount.toString()).toBe('0')
      expect(r.netAmount.toString()).toBe(r.grandTotal.toString())
      expect(r.netAmount.toString()).toBe('107000')
    })

    it('หักส่วนลดออกจากฐานภาษีก่อนคิด VAT', () => {
      const r = calcTax({
        subtotal: '100000',
        discountAmount: '10000',
        vatRate: '0.07',
        whtRate: '0.03',
      })
      expect(r.baseAmount.toString()).toBe('90000')
      expect(r.vatAmount.toString()).toBe('6300')
      expect(r.whtAmount.toString()).toBe('2700')
      expect(r.netAmount.toString()).toBe('93600')
    })

    it('บริษัทไม่จด VAT — vatRate 0 ยังหัก ณ ที่จ่ายได้ปกติ', () => {
      const r = calcTax({ subtotal: '30000', vatRate: '0', whtRate: '0.03' })
      expect(r.vatAmount.toString()).toBe('0')
      expect(r.whtAmount.toString()).toBe('900')
      expect(r.netAmount.toString()).toBe('29100')
    })

    it('ปัดเศษถูกต้องกับยอดที่หารไม่ลงตัว', () => {
      const r = calcTax({ subtotal: '333.33', vatRate: '0.07', whtRate: '0.03' })
      expect(r.vatAmount.toString()).toBe('23.33')
      expect(r.whtAmount.toString()).toBe('10')
      expect(r.grandTotal.toString()).toBe('356.66')
      expect(r.netAmount.toString()).toBe('346.66')
    })

    it('ยอด 0 ไม่ทำให้พัง', () => {
      const r = calcTax({ subtotal: 0, vatRate: '0.07', whtRate: '0.03' })
      expect(r.grandTotal.toString()).toBe('0')
      expect(r.netAmount.toString()).toBe('0')
    })
  })
})

describe('reverseFromTarget', () => {
  it('ยอดรับสุทธิหลังหัก ณ ที่จ่ายที่ตรงพอดีได้ — VAT 7% WHT 3%', () => {
    const r = reverseFromTarget({ target: 156000, vatRate: 0.07, whtRate: 0.03, afterWht: true })
    expect(r.diff.isZero()).toBe(true)
    expect(r.base.toFixed(2)).toBe('150000.00')
  })

  it('180,000 สุทธิตรงพอดีไม่ได้เพราะการปัด → 179,999.99 (ไม่เกินยอดที่ขอ)', () => {
    // 173,076.92 → สุทธิ 179,999.99 · 173,076.93 → 180,000.01 ไม่มีราคาไหนให้ 180,000.00
    const r = reverseFromTarget({ target: 180000, vatRate: 0.07, whtRate: 0.03, afterWht: true })
    expect(r.base.toFixed(2)).toBe('173076.92')
    expect(r.achieved.toFixed(2)).toBe('179999.99')
    expect(r.diff.toFixed(2)).toBe('-0.01')
  })

  it('ยอดรวม VAT อย่างเดียว ไม่สน WHT', () => {
    const r = reverseFromTarget({ target: 180000, vatRate: 0.07, whtRate: 0.03, afterWht: false })
    expect(r.diff.isZero()).toBe(true)
    expect(r.totals.grandTotal.toFixed(2)).toBe('180000.00')
    expect(r.base.toFixed(2)).toBe('168224.30')
  })

  it('ยอดที่ไม่มีราคาไหนให้ตรงพอดี → ใกล้ที่สุดและไม่เกินยอดที่ขอ', () => {
    // ไล่ทุกสตางค์ช่วงหนึ่ง: ทุกผลต้องห่างไม่เกิน 1 สตางค์ และถ้าไม่ตรงต้องต่ำกว่า target
    for (let t = 100000; t < 100050; t++) {
      const target = t / 100 + 1000
      const r = reverseFromTarget({ target, vatRate: 0.07, whtRate: 0.03, afterWht: true })
      expect(r.diff.abs().lessThanOrEqualTo(0.01)).toBe(true)
      if (!r.diff.isZero()) expect(r.diff.isNegative()).toBe(true)
    }
  })

  it('ไม่หัก ณ ที่จ่าย + afterWht = เหมือนยอดรวม VAT', () => {
    const r = reverseFromTarget({ target: 107000, vatRate: 0.07, afterWht: true })
    expect(r.base.toFixed(2)).toBe('100000.00')
  })
})
