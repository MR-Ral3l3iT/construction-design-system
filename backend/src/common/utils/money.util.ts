import { Prisma } from '@prisma/client'

/**
 * การคำนวณเงินทั้งระบบบัญชีต้องผ่านไฟล์นี้เท่านั้น
 *
 * เหตุผล: ยอดบนเอกสารภาษีต้องตรงกับยอดที่บันทึกใน DB ทุกสตางค์ การคำนวณด้วย
 * number ของ JS ทำให้ 0.1 + 0.2 !== 0.3 และยอดจะเพี้ยนสะสมเมื่อรวมหลายบรรทัด
 * — ระบบเดิมใน frontend/src/app/print/billing/[id]/page.tsx คำนวณ VAT/WHT
 * ด้วย float ตอน render ซึ่งเป็นสิ่งที่ไฟล์นี้มาแทน
 */

export type DecimalLike = Prisma.Decimal | string | number | null | undefined

/** แปลงเป็น Decimal — null/undefined/ค่าว่าง ถือเป็น 0 */
export function D(value: DecimalLike): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return new Prisma.Decimal(0)
  return new Prisma.Decimal(value)
}

/** ปัดทศนิยม 2 ตำแหน่งแบบ half-up — ใช้กับทุกยอดเงินที่จะบันทึกหรือแสดง */
export function round2(value: DecimalLike): Prisma.Decimal {
  return D(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
}

/** ปัดอัตราภาษี 4 ตำแหน่ง (0.0700 = 7%) */
export function round4(value: DecimalLike): Prisma.Decimal {
  return D(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
}

export function sum(values: DecimalLike[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.plus(D(v)), new Prisma.Decimal(0))
}

export interface TaxCalcInput {
  /** ยอดรวมก่อนหักส่วนลด */
  subtotal: DecimalLike
  discountAmount?: DecimalLike
  /** 0.07 = 7% */
  vatRate?: DecimalLike
  /** 0.03 = 3% — 0 หรือไม่ส่ง = ไม่หัก ณ ที่จ่าย */
  whtRate?: DecimalLike
}

export interface TaxCalcResult {
  subtotal: Prisma.Decimal
  discountAmount: Prisma.Decimal
  /** ฐานภาษี = subtotal - discount */
  baseAmount: Prisma.Decimal
  vatRate: Prisma.Decimal
  vatAmount: Prisma.Decimal
  whtRate: Prisma.Decimal
  whtAmount: Prisma.Decimal
  /** baseAmount + vatAmount — ยอดตามใบกำกับภาษี */
  grandTotal: Prisma.Decimal
  /** grandTotal - whtAmount — ยอดที่รับ/จ่ายจริง */
  netAmount: Prisma.Decimal
}

/**
 * คำนวณภาษีของเอกสารหนึ่งใบ
 *
 * ลำดับสำคัญ: **หัก ณ ที่จ่ายคิดจากฐานก่อน VAT** ไม่ใช่จากยอดรวม VAT
 * เช่น ฐาน 150,000 VAT 7% WHT 3% → VAT 10,500, WHT 4,500 (ไม่ใช่ 4,815)
 * รับเงินจริง = 150,000 + 10,500 - 4,500 = 156,000
 */
export function calcTax(input: TaxCalcInput): TaxCalcResult {
  const subtotal = round2(input.subtotal)
  const discountAmount = round2(input.discountAmount)
  const baseAmount = round2(subtotal.minus(discountAmount))

  const vatRate = round4(input.vatRate)
  const whtRate = round4(input.whtRate)

  const vatAmount = round2(baseAmount.times(vatRate))
  const whtAmount = round2(baseAmount.times(whtRate))

  const grandTotal = round2(baseAmount.plus(vatAmount))
  const netAmount = round2(grandTotal.minus(whtAmount))

  return {
    subtotal,
    discountAmount,
    baseAmount,
    vatRate,
    whtRate,
    vatAmount,
    whtAmount,
    grandTotal,
    netAmount,
  }
}

/**
 * คำนวณยอดของบรรทัดรายการ — quantity × unitPrice
 * ปัดที่ระดับบรรทัด แต่ยอดรวมของเอกสารต้องคำนวณจาก header ลงล่าง ไม่ใช่รวมบรรทัดที่ปัดแล้วขึ้นมา
 */
export function calcLineAmount(quantity: DecimalLike, unitPrice: DecimalLike): Prisma.Decimal {
  return round2(D(quantity).times(D(unitPrice)))
}

export interface ReverseInput {
  /** ยอดที่ลูกค้าต้องการจ่าย */
  target: DecimalLike
  vatRate: DecimalLike
  whtRate?: DecimalLike
  /** true = target คือยอดรับสุทธิหลังหัก ณ ที่จ่าย · false = target คือยอดรวม VAT */
  afterWht: boolean
  /**
   * ถ้าตรงพอดีไม่ได้ เลือกด้านไหน — below = ไม่เกินยอดที่ขอ (ค่าตั้งต้น) · above = ไม่ต่ำกว่า
   */
  prefer?: 'below' | 'above'
}

export interface ReverseResult {
  /** ราคาก่อน VAT ที่หาได้ */
  base: Prisma.Decimal
  totals: TaxCalcResult
  /** ยอดที่ได้จริงเมื่อใช้ base นี้ — เทียบกับ target */
  achieved: Prisma.Decimal
  /** achieved − target (0 = ตรงทุกสตางค์) */
  diff: Prisma.Decimal
}

/**
 * คิดย้อนจากยอดที่ลูกค้าจะจ่าย → ราคาก่อน VAT
 *
 * หารตรง ๆ (target ÷ (1 + VAT − WHT)) ได้ค่าประมาณ แต่ VAT และ WHT ถูกปัดทีละตัว
 * ยอดที่คำนวณกลับจึงอาจคลาดไป 1 สตางค์ — ไล่หาราคารอบค่าประมาณทีละสตางค์ ให้ได้ตัวที่
 * calcTax แล้วตรง target พอดี ถ้าไม่มีตัวไหนตรง (เกิดได้เพราะการปัด) เลือกตัวที่ใกล้ที่สุด
 * ในด้านที่ขอ (prefer) — ใช้ reverseOptions เพื่อดูทั้งสองด้าน
 */
export function reverseFromTarget(input: ReverseInput): ReverseResult {
  const target = round2(input.target)
  const vatRate = D(input.vatRate)
  const whtRate = input.afterWht ? D(input.whtRate) : D(0)
  const factor = D(1).plus(vatRate).minus(whtRate)
  if (factor.lessThanOrEqualTo(0)) throw new Error('อัตราภาษีไม่ถูกต้อง')

  const estimate = round2(target.dividedBy(factor))
  const evaluate = (base: Prisma.Decimal) => {
    const totals = calcTax({ subtotal: base, vatRate, whtRate })
    const achieved = input.afterWht ? totals.netAmount : totals.grandTotal
    return { base: totals.baseAmount, totals, achieved, diff: achieved.minus(target) }
  }

  const prefer = input.prefer ?? 'below'
  let best: ReturnType<typeof evaluate> | null = null
  for (let satang = -5; satang <= 5; satang++) {
    const candidate = evaluate(estimate.plus(D(satang).dividedBy(100)))
    if (candidate.base.lessThan(0)) continue
    if (candidate.diff.isZero()) return candidate
    const onSide = prefer === 'below' ? candidate.diff.isNegative() : candidate.diff.isPositive()
    if (onSide && (!best || candidate.diff.abs().lessThan(best.diff.abs()))) best = candidate
  }
  return best ?? evaluate(estimate)
}

/**
 * ตัวเลือกทั้งสองด้านเมื่อตรงพอดีไม่ได้ — ให้ผู้ใช้เลือกเองว่าจะเอาต่ำกว่าหรือสูงกว่ายอดที่ขอ
 * ตรงพอดีได้ → คืนตัวเดียว
 */
export function reverseOptions(input: Omit<ReverseInput, 'prefer'>): ReverseResult[] {
  const below = reverseFromTarget({ ...input, prefer: 'below' })
  if (below.diff.isZero()) return [below]
  return [below, reverseFromTarget({ ...input, prefer: 'above' })]
}
