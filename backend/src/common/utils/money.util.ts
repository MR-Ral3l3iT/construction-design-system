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
