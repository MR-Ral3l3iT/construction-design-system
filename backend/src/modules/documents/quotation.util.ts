import { Prisma } from '@prisma/client'
import { D, DecimalLike, round2, sum } from '../../common/utils/money.util'

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

/** เลขฉบับแก้ไข — เลขฐานของฉบับแรก + -R{n} เช่น QT2610001-R1 */
export function revisionCode(rootCode: string, revisionNo: number): string {
  return revisionNo === 0 ? rootCode : `${rootCode}-R${revisionNo}`
}

/** ข้อความระยะเวลาของงวด — "ภายใน 2 สัปดาห์" (เงื่อนไขของงวดเขียนไว้ในรายละเอียด) */
export function installmentTimingText(withinWeeks?: number | null): string {
  return withinWeeks ? `ภายใน ${withinWeeks} สัปดาห์` : ''
}
