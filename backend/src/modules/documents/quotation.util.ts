import { Prisma } from '@prisma/client'
import {
  D,
  DecimalLike,
  reverseFromTarget,
  round2,
  sum,
  TaxCalcResult,
} from '../../common/utils/money.util'

/**
 * แบ่งยอดก่อน VAT ของใบเสนอราคาลงแต่ละงวดตามสัดส่วน %
 *
 * ปัดทีละงวด แล้วให้**งวดสุดท้ายรับเศษ** เพื่อให้ผลรวมทุกงวดเท่ากับยอดของเอกสาร
 * ทุกสตางค์ — ถ้าปัดทุกงวดอิสระ 3 งวด 33.33% ของ 100,000 จะรวมได้ 99,999.99
 *
 * สัดส่วนรวมต้องเท่ากับ 100% พอดี (ทศนิยม 2 ตำแหน่ง) ไม่งั้นโยน error
 */
export function allocateInstallments(
  baseAmount: DecimalLike,
  percentages: DecimalLike[],
): Prisma.Decimal[] {
  if (percentages.length === 0) return []

  const totalPct = sum(percentages).toDecimalPlaces(2)
  if (!totalPct.equals(100)) {
    throw new Error(`สัดส่วนงวดรวมต้องเท่ากับ 100% (ตอนนี้ ${totalPct.toFixed(2)}%)`)
  }
  if (percentages.some((p) => D(p).lessThanOrEqualTo(0))) {
    throw new Error('สัดส่วนของทุกงวดต้องมากกว่า 0%')
  }

  const base = round2(baseAmount)
  const amounts = percentages.slice(0, -1).map((p) => round2(base.times(D(p)).dividedBy(100)))
  amounts.push(round2(base.minus(sum(amounts))))
  return amounts
}

export interface InstallmentPlanRow {
  /** ราคาก่อน VAT ของงวด */
  amount: Prisma.Decimal
  vatAmount: Prisma.Decimal
  whtAmount: Prisma.Decimal
  /** ยอดที่ลูกค้าจ่ายจริงในงวดนี้ = amount + vat − wht */
  netAmount: Prisma.Decimal
}

/**
 * แบ่งงวดตาม % ของ**ยอดสุทธิที่ลูกค้าจ่ายจริง** — 30% ของสุทธิ 179,999.99 = 54,000.00
 *
 * งวดที่ไม่ใช่งวดสุดท้าย: ยอดสุทธิของงวด = % × สุทธิ แล้วคิดย้อนหาราคาก่อน VAT / VAT /
 * หัก ณ ที่จ่ายของงวดนั้น (ไว้ออกใบแจ้งหนี้รายงวด) · งวดสุดท้ายรับเศษ**ทุกคอลัมน์** ให้แต่ละ
 * คอลัมน์รวมแล้วเท่ากับเอกสารทุกสตางค์
 *
 * บางยอดคิดย้อนให้ตรงพอดีไม่ได้เพราะการปัด (ดู reverseFromTarget) — ราคาก่อน VAT ของงวดนั้น
 * รับส่วนต่าง ±0.01 แทน ยอดชำระของงวดจึงเป็น % พอดีเสมอ
 *
 * requireFull = true (ออกจริง): % รวมต้อง = 100 · false (preview): แบ่งตาม % ตรง ๆ ไม่มีงวดรับเศษ
 */
export function planInstallmentsByNet(
  totals: Pick<
    TaxCalcResult,
    'baseAmount' | 'vatAmount' | 'whtAmount' | 'netAmount' | 'vatRate' | 'whtRate'
  >,
  percentages: DecimalLike[],
  requireFull = true,
): InstallmentPlanRow[] {
  if (percentages.length === 0) return []
  const totalPct = sum(percentages).toDecimalPlaces(2)
  const full = totalPct.equals(100)
  if (requireFull) {
    if (!full) throw new Error(`สัดส่วนงวดรวมต้องเท่ากับ 100% (ตอนนี้ ${totalPct.toFixed(2)}%)`)
    if (percentages.some((p) => D(p).lessThanOrEqualTo(0))) {
      throw new Error('สัดส่วนของทุกงวดต้องมากกว่า 0%')
    }
  }

  const byPercent = (p: DecimalLike): InstallmentPlanRow => {
    const target = round2(totals.netAmount.times(D(p)).dividedBy(100))
    const r = reverseFromTarget({
      target,
      vatRate: totals.vatRate,
      whtRate: totals.whtRate,
      afterWht: true,
    })
    // ยอดชำระของงวดต้องเป็น % พอดี (54,000.00 ไม่ใช่ 53,999.99) — ถ้าคิดย้อนแล้วคลาด 1 สตางค์
    // จากการปัด ให้ราคาก่อน VAT รับส่วนต่าง VAT และหัก ณ ที่จ่ายยังเป็นไปตามสูตร
    return {
      amount: round2(target.minus(r.totals.vatAmount).plus(r.totals.whtAmount)),
      vatAmount: r.totals.vatAmount,
      whtAmount: r.totals.whtAmount,
      netAmount: target,
    }
  }

  if (!full) return percentages.map(byPercent)

  const rows = percentages.slice(0, -1).map(byPercent)
  const rest = (total: Prisma.Decimal, pick: (r: InstallmentPlanRow) => Prisma.Decimal) =>
    round2(total.minus(sum(rows.map(pick))))
  const last = {
    amount: rest(totals.baseAmount, (r) => r.amount),
    vatAmount: rest(totals.vatAmount, (r) => r.vatAmount),
    whtAmount: rest(totals.whtAmount, (r) => r.whtAmount),
    netAmount: rest(totals.netAmount, (r) => r.netAmount),
  }
  return [...rows, last]
}

/** เลขฉบับแก้ไข — เลขฐานของฉบับแรก + -R{n} เช่น QT2610001-R1 */
export function revisionCode(rootCode: string, revisionNo: number): string {
  return revisionNo === 0 ? rootCode : `${rootCode}-R${revisionNo}`
}

/** ข้อความระยะเวลาของงวด — "ภายใน 2 สัปดาห์" (เงื่อนไขของงวดเขียนไว้ในรายละเอียด) */
export function installmentTimingText(withinWeeks?: number | null): string {
  return withinWeeks ? `ภายใน ${withinWeeks} สัปดาห์` : ''
}
