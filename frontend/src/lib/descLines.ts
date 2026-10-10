/**
 * รายละเอียดของรายการแบบหลายบรรทัด — 1 บรรทัด = 1 รายการย่อย
 * พอร์ตจาก lib/docDescLines.ts ของ KK (docs/billing-accounting-spec.md §13.2)
 *
 * ต่างจาก KK: UAT เก็บรายละเอียดเป็นข้อความก้อนเดียวใน EstimateItem.description
 * และไม่มีตัวหนา จึงไม่ต้องรักษารูปแบบของบรรทัดเดิม
 */

/** ระยะเยื้อง 1 ระดับ — ใช้ space ไม่ใช่ tab เพราะ PDF ไม่มี tab stop */
export const DESC_INDENT = '  '

/** bullet เก็บเป็นข้อความจริง จึงติดไปถึงหน้าพิมพ์ */
export const DESC_BULLET = '- '

/**
 * จัดข้อความจาก Raw Editor ให้อยู่ในรูปที่บันทึก
 * - บรรทัดว่างถูกตัดทิ้ง (วางข้อความจากที่อื่นมักมีบรรทัดคั่น)
 * - ตัดช่องว่างท้ายบรรทัด แต่**คงช่องว่างหน้าบรรทัด**ไว้เป็นระยะเยื้อง
 * - tab นำหน้าแปลงเป็นระยะเยื้อง 1 ระดับต่อ 1 tab
 */
export function normalizeDescription(text: string): string {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\t+/, (tabs) => DESC_INDENT.repeat(tabs.length)))
    .map((line) => line.replace(/[ \t]+$/, ''))
    .filter((line) => line.trim() !== '')
    .join('\n')
}

export function countDescriptionLines(text: string): number {
  return (text ?? '').split(/\r?\n/).filter((l) => l.trim() !== '').length
}

/** บรรทัดนี้มี bullet นำหน้าอยู่แล้วหรือไม่ (นับหลังระยะเยื้อง) */
export function hasBullet(text: string): boolean {
  return /^\s*-(\s|$)/.test(text ?? '')
}

/**
 * เติม/เอา bullet ออกจากบรรทัดเดียว โดยวางไว้**หลังระยะเยื้อง**เสมอ
 * "  รายการ" → "  - รายการ" → "  รายการ"
 */
export function toggleBullet(text: string): string {
  const raw = text ?? ''
  const indent = raw.match(/^\s*/)?.[0] ?? ''
  const rest = raw.slice(indent.length)
  if (rest === '-') return indent
  if (rest.startsWith(DESC_BULLET)) return indent + rest.slice(DESC_BULLET.length)
  if (rest.startsWith('-')) return indent + rest.slice(1).replace(/^\s+/, '')
  return indent + DESC_BULLET + rest
}

/** เติม (on) หรือเอา bullet ออก (off) ทุกบรรทัด — ปุ่มลัดของ Raw Editor */
export function setBulletAll(text: string, on: boolean): string {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => {
      if (line.trim() === '') return line
      if (on === hasBullet(line)) return line
      return toggleBullet(line)
    })
    .join('\n')
}
