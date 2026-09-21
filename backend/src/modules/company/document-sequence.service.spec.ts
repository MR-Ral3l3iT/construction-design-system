import { PrismaClient } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import {
  buildPeriod,
  DOC_TYPE_PREFIX,
  DocumentSequenceService,
  formatDocNumber,
} from './document-sequence.service'

describe('document-sequence helpers', () => {
  describe('buildPeriod', () => {
    it('สร้าง YYMM จากปี ค.ศ.', () => {
      expect(buildPeriod(new Date('2026-09-21'))).toBe('2609')
      expect(buildPeriod(new Date('2026-01-05'))).toBe('2601')
      expect(buildPeriod(new Date('2027-12-31'))).toBe('2712')
    })
  })

  describe('formatDocNumber', () => {
    it('เติมศูนย์หน้าให้ครบตามจำนวนหลัก', () => {
      expect(formatDocNumber('INVOICE', '2609', 1, 3)).toBe('IV2609001')
      expect(formatDocNumber('INVOICE', '2609', 20, 3)).toBe('IV2609020')
      expect(formatDocNumber('RECEIPT', '2609', 999, 3)).toBe('RC2609999')
    })

    it('เลขล้นหลักแล้วยาวขึ้นแทนที่จะตัดหลักทิ้งจนซ้ำ', () => {
      expect(formatDocNumber('INVOICE', '2609', 1000, 3)).toBe('IV26091000')
    })
  })

  describe('DOC_TYPE_PREFIX', () => {
    it('ทุกประเภทมี prefix และไม่ซ้ำกัน', () => {
      const prefixes = Object.values(DOC_TYPE_PREFIX)
      expect(prefixes.every((p) => p.length > 0)).toBe(true)
      expect(new Set(prefixes).size).toBe(prefixes.length)
    })
  })
})

/**
 * การจ่ายเลขต้องไม่ซ้ำเมื่อมีคนกดยืนยันเอกสารพร้อมกัน — พิสูจน์ด้วย DB จริงเท่านั้น
 * mock พิสูจน์ไม่ได้เพราะสิ่งที่กันการซ้ำคือ ON CONFLICT ของ Postgres
 *
 * รันด้วย:  TEST_DATABASE_URL=postgresql://... pnpm test document-sequence
 */
const TEST_DB = process.env.TEST_DATABASE_URL
const describeDb = TEST_DB ? describe : describe.skip

describeDb('DocumentSequenceService (ต้องมี TEST_DATABASE_URL)', () => {
  let prisma: PrismaClient
  let service: DocumentSequenceService

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } })
    await prisma.$connect()
    service = new DocumentSequenceService(prisma as unknown as PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.documentSequence.deleteMany({})
  })

  it('จ่ายเลขไม่ซ้ำและต่อเนื่องเมื่อยิง 60 ครั้งพร้อมกัน', async () => {
    const at = new Date('2026-09-21')
    const COUNT = 60

    const results = await Promise.all(
      Array.from({ length: COUNT }, () =>
        prisma.$transaction((tx) => service.next(tx, 'INVOICE', at)),
      ),
    )

    expect(new Set(results).size).toBe(COUNT)

    const expected = Array.from(
      { length: COUNT },
      (_, i) => `IV2609${String(i + 1).padStart(3, '0')}`,
    )
    expect([...results].sort()).toEqual([...expected].sort())
  })

  it('แต่ละประเภทเอกสารนับแยกกัน', async () => {
    const at = new Date('2026-09-21')
    const iv = await prisma.$transaction((tx) => service.next(tx, 'INVOICE', at))
    const rc = await prisma.$transaction((tx) => service.next(tx, 'RECEIPT', at))

    expect(iv).toBe('IV2609001')
    expect(rc).toBe('RC2609001')
  })

  it('ขึ้นเดือนใหม่แล้วเริ่มนับ 001 ใหม่', async () => {
    const sep = await prisma.$transaction((tx) =>
      service.next(tx, 'INVOICE', new Date('2026-09-30')),
    )
    const oct = await prisma.$transaction((tx) =>
      service.next(tx, 'INVOICE', new Date('2026-10-01')),
    )

    expect(sep).toBe('IV2609001')
    expect(oct).toBe('IV2610001')
  })

  it('peek ไม่กินเลข', async () => {
    const at = new Date('2026-09-21')
    await prisma.$transaction((tx) => service.next(tx, 'INVOICE', at))

    const first = await service.peek('INVOICE', at)
    const second = await service.peek('INVOICE', at)
    expect(first).toBe('IV2609002')
    expect(second).toBe('IV2609002')

    const actual = await prisma.$transaction((tx) => service.next(tx, 'INVOICE', at))
    expect(actual).toBe('IV2609002')
  })

  it('เลขถูกคืนเมื่อ transaction ของ caller ล้มเหลว', async () => {
    const at = new Date('2026-09-21')
    await prisma.$transaction((tx) => service.next(tx, 'INVOICE', at))

    await expect(
      prisma.$transaction(async (tx) => {
        await service.next(tx, 'INVOICE', at)
        throw new Error('ยืนยันเอกสารล้มเหลวกลางคัน')
      }),
    ).rejects.toThrow('ยืนยันเอกสารล้มเหลวกลางคัน')

    // rollback แล้วเลขต้องกลับไปที่ 002 ไม่ใช่ข้ามไป 003
    expect(await service.peek('INVOICE', at)).toBe('IV2609002')
  })

  it('listCurrent รายงานครบทุกประเภทแม้ยังไม่เคยออกเอกสาร', async () => {
    const rows = await service.listCurrent(new Date('2026-09-21'))
    expect(rows).toHaveLength(Object.keys(DOC_TYPE_PREFIX).length)
    const invoice = rows.find((r) => r.docType === 'INVOICE')
    expect(invoice).toMatchObject({ issuedCount: 0, nextNumber: 'IV2609001', digits: 3 })
  })
})
