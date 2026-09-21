import { Injectable } from '@nestjs/common'
import { DocType, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

/** {PREFIX}{YY}{MM}{NNN} — prefix ต่อประเภทเอกสาร */
export const DOC_TYPE_PREFIX: Record<DocType, string> = {
  QUOTATION: 'QT',
  INVOICE: 'IV',
  BILLING: 'BN',
  RECEIPT: 'RC',
  PAYMENT_VOUCHER: 'PV',
  RECEIPT_VOUCHER: 'RV',
  WHT_CERT: 'WHT',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
}

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  QUOTATION: 'ใบเสนอราคา',
  INVOICE: 'ใบแจ้งหนี้',
  BILLING: 'ใบวางบิล',
  RECEIPT: 'ใบเสร็จรับเงิน / ใบกำกับภาษี',
  PAYMENT_VOUCHER: 'ใบสำคัญจ่าย',
  RECEIPT_VOUCHER: 'ใบสำคัญรับ',
  WHT_CERT: 'หนังสือรับรองหัก ณ ที่จ่าย',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
}

/** งวดของ running number — YYMM เช่น "2609" */
export function buildPeriod(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yy}${mm}`
}

export function formatDocNumber(docType: DocType, period: string, no: number, digits: number) {
  return `${DOC_TYPE_PREFIX[docType]}${period}${String(no).padStart(digits, '0')}`
}

@Injectable()
export class DocumentSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * จ่ายเลขที่เอกสารถัดไป — **ต้องเรียกจากใน transaction ของ caller เสมอ**
   * เพื่อให้เลขถูกคืนอัตโนมัติเมื่อการยืนยันเอกสารล้มเหลวกลางคัน
   *
   * ใช้ INSERT ... ON CONFLICT DO UPDATE ... RETURNING ซึ่ง Postgres รับประกัน
   * ว่าเป็น atomic ในคำสั่งเดียว — ปลอดภัยกว่า SELECT-max-แล้ว-+1 ที่ถ้าสองคน
   * กดยืนยันพร้อมกันจะได้เลขซ้ำ และปลอดภัยกว่า SELECT FOR UPDATE + upsert ที่
   * ยังชนกันได้ตอนแถวของงวดนั้นยังไม่มีอยู่
   */
  async next(
    tx: Prisma.TransactionClient,
    docType: DocType,
    at: Date = new Date(),
  ): Promise<string> {
    const period = buildPeriod(at)

    const rows = await tx.$queryRaw<Array<{ currentNo: number; digits: number }>>`
      INSERT INTO "document_sequences" ("docType", "period", "currentNo", "digits", "createdAt", "updatedAt")
      VALUES (${docType}::"DocType", ${period}, 1, 3, NOW(), NOW())
      ON CONFLICT ("docType", "period")
      DO UPDATE SET "currentNo" = "document_sequences"."currentNo" + 1, "updatedAt" = NOW()
      RETURNING "currentNo", "digits"
    `

    const row = rows[0]
    if (!row) throw new Error('จ่ายเลขที่เอกสารไม่สำเร็จ')

    // เลขล้นจำนวนหลักที่ตั้งไว้ (เช่น 1000 ใบในเดือนเดียวเมื่อ digits = 3)
    // ไม่บล็อกการออกเอกสาร แต่ปล่อยให้เลขยาวขึ้นเองแทนที่จะตัดหลักทิ้งจนเลขซ้ำ
    return formatDocNumber(docType, period, row.currentNo, row.digits)
  }

  /** ดูว่าเลขถัดไปจะเป็นอะไรโดยไม่กินเลข — ใช้แสดงตัวอย่างในหน้าฟอร์ม */
  async peek(docType: DocType, at: Date = new Date()): Promise<string> {
    const period = buildPeriod(at)
    const seq = await this.prisma.documentSequence.findUnique({
      where: { docType_period: { docType, period } },
      select: { currentNo: true, digits: true },
    })
    return formatDocNumber(docType, period, (seq?.currentNo ?? 0) + 1, seq?.digits ?? 3)
  }

  /** สถานะเลขล่าสุดของทุกประเภทในงวดที่ระบุ — สำหรับหน้าตั้งค่า */
  async listCurrent(at: Date = new Date()) {
    const period = buildPeriod(at)
    const rows = await this.prisma.documentSequence.findMany({
      where: { period },
      select: { docType: true, currentNo: true, digits: true },
    })
    const byType = new Map(rows.map((r) => [r.docType, r]))

    return (Object.keys(DOC_TYPE_PREFIX) as DocType[]).map((docType) => {
      const row = byType.get(docType)
      const currentNo = row?.currentNo ?? 0
      const digits = row?.digits ?? 3
      return {
        docType,
        label: DOC_TYPE_LABEL[docType],
        prefix: DOC_TYPE_PREFIX[docType],
        period,
        currentNo,
        digits,
        issuedCount: currentNo,
        nextNumber: formatDocNumber(docType, period, currentNo + 1, digits),
      }
    })
  }
}
