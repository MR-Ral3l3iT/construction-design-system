import { PrismaClient } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { PrismaService } from '../../database/prisma.service'
import { CompanyService } from '../company/company.service'
import { EstimatesService } from './estimates.service'

/**
 * คิดย้อนราคาจากยอดที่ลูกค้าจะจ่าย — ต้องใช้ DB จริงเพราะบันทึกราคาและคำนวณยอดใหม่
 * รันด้วย:  TEST_DATABASE_URL=postgresql://... pnpm test estimates.reverse
 */
const TEST_DB = process.env.TEST_DATABASE_URL
const describeDb = TEST_DB ? describe : describe.skip

describeDb('EstimatesService.reversePrice (ต้องมี TEST_DATABASE_URL)', () => {
  let prisma: PrismaClient
  let service: EstimatesService
  let projectId: number

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } })
    await prisma.$connect()
    const db = prisma as unknown as PrismaService
    const log = new ActivityLogService(db)
    service = new EstimatesService(db, log, new CompanyService(db, log))

    await prisma.companyProfile.upsert({
      where: { code: 'UAT' },
      update: {},
      create: { code: 'UAT', name: 'บริษัท ฃวด จำกัด', isDefault: true, defaultVatRate: 0.07 },
    })
    const customer = await prisma.customer.create({ data: { name: 'ลูกค้าคิดย้อน' } })
    projectId = (
      await prisma.project.create({
        data: {
          code: `REV-${Date.now()}`,
          name: 'คิดย้อน',
          type: 'DESIGN_ONLY',
          customerId: customer.id,
        },
      })
    ).id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function makeEstimate(whtPercent: number | null) {
    return prisma.estimate.create({
      data: {
        projectId,
        code: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: 'คิดย้อน',
        whtPercent,
        items: {
          create: [
            { name: 'ค่าออกแบบ', quantity: 1, unitPrice: 100000, totalPrice: 100000 },
            { name: 'หัวข้อไม่มีราคา', isPriced: false, sortOrder: 1 },
            {
              name: 'ค่าที่ปรึกษา',
              quantity: 1,
              unitPrice: 20000,
              totalPrice: 20000,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { items: true },
    })
  }

  it('ดูผลอย่างเดียวไม่บันทึก · ปรับรายการแรก รายการอื่นคงเดิม', async () => {
    const est = await makeEstimate(3)
    const r = await service.reversePrice(est.id, { targetAmount: 156000, afterWht: true }, 1)

    // ฐานรวม 150,000 → ค่าออกแบบ = 150,000 − 20,000
    expect(r.item.unitPrice.toFixed(2)).toBe('130000.00')
    expect(r.achieved.toFixed(2)).toBe('156000.00')
    expect(r.diff.toFixed(2)).toBe('0.00')
    const item = await prisma.estimateItem.findUniqueOrThrow({ where: { id: est.items[0].id } })
    expect(item.unitPrice.toFixed(2)).toBe('100000.00')
  })

  it('apply บันทึกราคาและยอดรวมใหม่', async () => {
    const est = await makeEstimate(null)
    const target = est.items.find((i) => i.name === 'ค่าที่ปรึกษา')!
    const r = await service.reversePrice(
      est.id,
      { targetAmount: 180000, afterWht: false, itemId: target.id, apply: true },
      1,
    )
    expect(r.achieved.toFixed(2)).toBe('180000.00')
    const saved = await service.findOneWithSummary(est.id)
    expect(saved.summary.grandTotal.toFixed(2)).toBe('180000.00')
    expect(saved.items.find((i) => i.id === target.id)!.unitPrice.toFixed(2)).toBe('68224.30')
  })

  it('ยอดที่ขอต่ำกว่าราคาของรายการอื่น → ปฏิเสธ', async () => {
    const est = await makeEstimate(null)
    await expect(
      service.reversePrice(est.id, { targetAmount: 10000, afterWht: false }, 1),
    ).rejects.toThrow('ต่ำกว่าราคารวมของรายการอื่น')
  })

  it('ตรงพอดีไม่ได้ → คืนสองตัวเลือก และ prefer above ใช้ด้านสูงกว่า', async () => {
    const est = await prisma.estimate.create({
      data: {
        projectId,
        code: `REV-OPT-${Date.now()}`,
        title: 'P2612',
        whtPercent: 3,
        items: { create: [{ name: 'ออกแบบ', quantity: 1, unitPrice: 1, totalPrice: 1 }] },
      },
    })
    const below = await service.reversePrice(est.id, { targetAmount: 180000, afterWht: true }, 1)
    expect(below.options.map((o) => [o.prefer, o.achieved.toFixed(2)])).toEqual([
      ['below', '179999.99'],
      ['above', '180000.01'],
    ])
    expect(below.achieved.toFixed(2)).toBe('179999.99')

    const above = await service.reversePrice(
      est.id,
      { targetAmount: 180000, afterWht: true, prefer: 'above', apply: true },
      1,
    )
    expect(above.item.unitPrice.toFixed(2)).toBe('173076.93')
    const saved = await service.findOneWithSummary(est.id)
    expect(saved.summary.netAmount.toFixed(2)).toBe('180000.01')
  })
})
