import { Prisma } from '@prisma/client'

/**
 * บรรทัดรายละเอียดของรายการ — ระยะเยื้องคือ space หน้า text (PDF ไม่มี tab stop)
 * bold / highlight เก็บเฉพาะเมื่อเป็น true เพื่อให้ JSON สั้นและเทียบกันง่าย
 */
export interface ItemLine {
  text: string
  bold?: boolean
  /** ไฮไลต์สีแดง */
  highlight?: boolean
}

/** ตัดช่องว่างท้ายบรรทัด ทิ้งบรรทัดว่าง และเก็บเฉพาะ flag ที่เป็น true */
export function normalizeLines(lines: ItemLine[]): ItemLine[] {
  return lines
    .map((l) => ({ ...l, text: (l.text ?? '').replace(/^\t+/, (t) => '  '.repeat(t.length)) }))
    .map((l) => ({ ...l, text: l.text.replace(/[ \t]+$/, '') }))
    .filter((l) => l.text.trim() !== '')
    .map((l) => ({
      text: l.text,
      ...(l.bold && { bold: true }),
      ...(l.highlight && { highlight: true }),
    }))
}

/** ข้อความล้วนของรายละเอียด — เก็บคู่ไว้ใน description ให้ส่วนที่อ่านแบบเดิม */
export function linesToDescription(lines: ItemLine[]): string | null {
  const text = lines.map((l) => l.text).join('\n')
  return text === '' ? null : text
}

/** รายละเอียดแบบเดิม (ข้อความล้วน) → lines ไม่มีรูปแบบ */
export function descriptionToLines(description?: string | null): ItemLine[] {
  return normalizeLines((description ?? '').split(/\r?\n/).map((text) => ({ text })))
}

/**
 * เตรียมค่าสำหรับบันทึก — รับได้ทั้ง lines (ใหม่) และ description (client เดิม)
 * คืน undefined ถ้าไม่ได้ส่งมาทั้งคู่ (ไม่แก้รายละเอียด)
 */
export function resolveLines(input: { lines?: ItemLine[] | null; description?: string | null }) {
  if (input.lines !== undefined && input.lines !== null) {
    const lines = normalizeLines(input.lines)
    return {
      lines: lines as unknown as Prisma.InputJsonValue,
      description: linesToDescription(lines),
    }
  }
  if (input.description !== undefined) {
    const lines = descriptionToLines(input.description)
    return {
      lines: lines as unknown as Prisma.InputJsonValue,
      description: linesToDescription(lines),
    }
  }
  return undefined
}
