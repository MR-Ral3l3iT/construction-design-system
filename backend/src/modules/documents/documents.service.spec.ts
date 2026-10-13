import { PrismaClient } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { PrismaService } from '../../database/prisma.service'
import { CompanyService } from '../company/company.service'
import { DocumentSequenceService } from '../company/document-sequence.service'
import { DocumentsService } from './documents.service'
import { EstimatesService } from '../estimates/estimates.service'

/**
 * สายใบเสนอราคา Estimate → Document QT ทั้งเส้น — ต้องใช้ DB จริง
 * เพราะสิ่งที่ทดสอบคือ transaction, row lock และ unique constraint ของ Postgres
 *
 * รันด้วย:  TEST_DATABASE_URL=postgresql://... pnpm test documents.service
 */
const TEST_DB = process.env.TEST_DATABASE_URL
const describeDb = TEST_DB ? describe : describe.skip

describeDb('DocumentsService — ใบเสนอราคาจาก Estimate (ต้องมี TEST_DATABASE_URL)', () => {
  let prisma: PrismaClient
  let service: DocumentsService
  let estimates: EstimatesService
  let projectId: number
  const ACTOR = 1
  // งวดของเลขที่ที่ไม่ชนกับ suite อื่น — ทุกใบในไฟล์นี้ออกด้วยวันที่นี้
  const DOC_DATE = '2030-01-15'
  const issue = (
    estimateId: number,
    dto: Parameters<DocumentsService['issueFromEstimate']>[1] = {},
  ) => service.issueFromEstimate(estimateId, { documentDate: DOC_DATE, ...dto }, ACTOR)

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } })
    await prisma.$connect()
    const db = prisma as unknown as PrismaService
    const log = new ActivityLogService(db)
    estimates = new EstimatesService(db, log, new CompanyService(db, log))
    service = new DocumentsService(
      db,
      new CompanyService(db, log),
      new DocumentSequenceService(db),
      log,
    )

    // รันซ้ำบน DB เดิมได้ — ล้างของที่ไฟล์นี้สร้างไว้รอบก่อน
    await prisma.paymentMilestone.deleteMany({
      where: { documentInstallment: { document: { code: { startsWith: 'QT3001' } } } },
    })
    await prisma.document.updateMany({
      where: { code: { startsWith: 'QT3001' } },
      data: { supersedesDocId: null, rootDocId: null },
    })
    await prisma.document.deleteMany({ where: { code: { startsWith: 'QT3001' } } })
    await prisma.documentSequence.deleteMany({ where: { period: '3001' } })

    await prisma.companyProfile.upsert({
      where: { code: 'UAT' },
      update: {},
      create: {
        code: 'UAT',
        name: 'บริษัท ฃวด จำกัด',
        taxId: '0105564177133',
        isDefault: true,
        defaultVatRate: 0.07,
      },
    })
    const customer = await prisma.customer.create({
      data: { name: 'คุณทดสอบ', companyName: 'บริษัท ลูกค้า จำกัด', taxId: '0100000000001' },
    })
    const project = await prisma.project.create({
      data: {
        code: `TEST-${Date.now()}`,
        name: 'บ้านทดสอบ',
        type: 'DESIGN_ONLY',
        customerId: customer.id,
      },
    })
    projectId = project.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function makeEstimate(installmentPcts = ['30', '40', '30']) {
    return prisma.estimate.create({
      data: {
        projectId,
        code: `EST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: 'ค่าออกแบบ',
        items: {
          create: [
            { name: 'ออกแบบสถาปัตยกรรม', quantity: 1, unitPrice: 100000, totalPrice: 100000 },
            { name: 'จัดทำ BOQ', quantity: 1, unitPrice: 50000, totalPrice: 50000, sortOrder: 1 },
          ],
        },
        installments: {
          create: installmentPcts.map((p, i) => ({
            installmentNo: i + 1,
            description: `งวด ${i + 1}`,
            withinWeeks: i === 0 ? 1 : 4,
            percentage: p,
            amount: 0,
          })),
        },
        schedulePhases: {
          create: [
            { name: 'แบบร่าง', startWeek: 1, durationWeeks: 4 },
            { name: 'แบบก่อสร้าง', startWeek: 5, durationWeeks: 6, sortOrder: 1 },
          ],
        },
      },
    })
  }

  it('ออก QT: snapshot ครบ ยอดคำนวณด้วย Decimal และ Estimate เป็น SENT', async () => {
    const est = await makeEstimate()
    const doc = await issue(est.id)

    expect(doc.code).toMatch(/^QT3001\d{3}$/)
    expect(doc.status).toBe('CONFIRMED')
    expect(doc.revisionNo).toBe(0)
    expect(doc.partyName).toBe('บริษัท ลูกค้า จำกัด')
    expect(doc.partyContact).toBe('คุณทดสอบ')
    expect(doc.sellerName).toBe('บริษัท ฃวด จำกัด')
    expect(doc.baseAmount.toFixed(2)).toBe('150000.00')
    expect(doc.vatAmount.toFixed(2)).toBe('10500.00')
    expect(doc.grandTotal.toFixed(2)).toBe('160500.00')
    expect(doc.items).toHaveLength(2)
    expect(doc.installments.map((i) => i.amount.toFixed(2))).toEqual([
      '45000.00',
      '60000.00',
      '45000.00',
    ])
    expect(doc.installments[0]).toMatchObject({ description: 'งวด 1', withinWeeks: 1 })
    expect(doc.schedule.map((s) => s.name)).toEqual(['แบบร่าง', 'แบบก่อสร้าง'])

    const after = await prisma.estimate.findUniqueOrThrow({ where: { id: est.id } })
    expect(after.status).toBe('SENT')
  })

  it('snapshot ไม่เปลี่ยนตามเมื่อแก้ Estimate ทีหลัง', async () => {
    const est = await makeEstimate()
    const doc = await issue(est.id)

    await prisma.estimateItem.updateMany({
      where: { estimateId: est.id },
      data: { name: 'แก้ทีหลัง', unitPrice: 1 },
    })

    const again = await service.findOne(doc.id)
    expect(again.items[0].name).toBe('ออกแบบสถาปัตยกรรม')
    expect(again.baseAmount.toFixed(2)).toBe('150000.00')
  })

  it('ออกซ้ำหลังแก้ → -R1 เลขฐานเดิม ฉบับเก่า SUPERSEDED', async () => {
    const est = await makeEstimate()
    const first = await issue(est.id)

    await prisma.estimate.update({ where: { id: est.id }, data: { status: 'DRAFT' } })
    const r1 = await issue(est.id)

    await prisma.estimate.update({ where: { id: est.id }, data: { status: 'DRAFT' } })
    const r2 = await issue(est.id)

    expect(r1.code).toBe(`${first.code}-R1`)
    expect(r2.code).toBe(`${first.code}-R2`)
    expect(r2.rootDocId).toBe(first.id)
    expect(r2.supersedesDocId).toBe(r1.id)
    expect((await service.findOne(first.id)).status).toBe('SUPERSEDED')
    expect((await service.findOne(r1.id)).status).toBe('SUPERSEDED')
    expect((await service.findActiveQuotation(est.id))?.id).toBe(r2.id)
  })

  it('กดออกพร้อมกันสองครั้ง → ได้ใบเดียว อีกครั้งถูกปฏิเสธ', async () => {
    const est = await makeEstimate()
    const results = await Promise.allSettled([issue(est.id), issue(est.id)])

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await prisma.document.count({ where: { estimateId: est.id } })).toBe(1)
  })

  it('ปฏิเสธเมื่อสัดส่วนงวดรวมไม่เท่ากับ 100% และไม่กินเลข', async () => {
    const est = await makeEstimate(['50', '40'])
    await expect(issue(est.id)).rejects.toThrow('100%')
    expect(await prisma.document.count({ where: { estimateId: est.id } })).toBe(0)
  })

  it('ปฏิเสธเมื่อ Estimate ไม่ใช่ร่าง', async () => {
    const est = await makeEstimate()
    await issue(est.id)
    await expect(issue(est.id)).rejects.toThrow('สถานะร่าง')
  })

  it('หัก ณ ที่จ่ายคิดจากฐานก่อน VAT และ print-data มียอดต่องวด', async () => {
    const wht = await prisma.whtRate.upsert({
      where: { code: 'TEST3' },
      update: {},
      create: { code: 'TEST3', rate: 0.03, description: 'ค่าบริการ 3%' },
    })
    const est = await makeEstimate(['100'])
    const doc = await issue(est.id, { whtRateId: wht.id })

    expect(doc.whtAmount.toFixed(2)).toBe('4500.00')
    expect(doc.netAmount.toFixed(2)).toBe('156000.00')

    const print = await service.printData(doc.id)
    expect(print.installments[0].netAmount.toFixed(2)).toBe('156000.00')
    expect(print.installments[0].timingText).toBe('ภายใน 1 สัปดาห์')
  })

  it('นำเข้างวดเงินจาก snapshot หลังลูกค้าอนุมัติ และนำเข้าซ้ำได้ไม่ซ้อน', async () => {
    const est = await makeEstimate()
    const doc = await issue(est.id)

    await expect(service.importMilestones(doc.id, ACTOR)).rejects.toThrow('ยังไม่อนุมัติ')

    await prisma.estimate.update({ where: { id: est.id }, data: { status: 'APPROVED' } })
    await service.importMilestones(doc.id, ACTOR)
    await service.importMilestones(doc.id, ACTOR)

    const milestones = await prisma.paymentMilestone.findMany({
      where: { estimateId: est.id, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    })
    expect(milestones).toHaveLength(3)
    expect(milestones.map((m) => m.amount.toFixed(2))).toEqual(['45000.00', '60000.00', '45000.00'])
    expect(milestones.every((m) => m.documentInstallmentId)).toBe(true)
    expect(milestones[0].description).toContain('ภายใน 1 สัปดาห์')
  })

  it('ยกเลิก QT: ลบงวดที่ยังไม่รับเงิน และ Estimate กลับเป็นร่าง', async () => {
    const est = await makeEstimate()
    const doc = await issue(est.id)
    await prisma.estimate.update({ where: { id: est.id }, data: { status: 'APPROVED' } })
    await service.importMilestones(doc.id, ACTOR)

    const voided = await service.void(doc.id, 'ลูกค้ายกเลิกงาน', ACTOR)

    expect(voided.status).toBe('VOIDED')
    expect(voided.code).toBe(doc.code)
    expect(
      await prisma.paymentMilestone.count({ where: { estimateId: est.id, deletedAt: null } }),
    ).toBe(0)
    expect((await prisma.estimate.findUniqueOrThrow({ where: { id: est.id } })).status).toBe(
      'DRAFT',
    )
  })

  it('ยกเลิกไม่ได้ถ้ามีงวดที่รับเงินแล้ว', async () => {
    const est = await makeEstimate()
    const doc = await issue(est.id)
    await prisma.estimate.update({ where: { id: est.id }, data: { status: 'APPROVED' } })
    await service.importMilestones(doc.id, ACTOR)
    await prisma.paymentMilestone.updateMany({
      where: { estimateId: est.id, sortOrder: 1 },
      data: { status: 'PAID' },
    })

    await expect(service.void(doc.id, 'ทดสอบ', ACTOR)).rejects.toThrow('รับชำระแล้ว')
  })

  it('หมวดที่ไม่มีราคาไม่นับในยอด และ snapshot รูปแบบบรรทัดไปด้วย', async () => {
    const est = await prisma.estimate.create({
      data: {
        projectId,
        code: `EST-LINES-${Date.now()}`,
        title: 'P2612 - pet hotel rama3',
        items: {
          create: [
            {
              name: 'หมวดงานออกแบบและจัดทำแบบ',
              quantity: 1,
              unitPrice: 173076.92,
              totalPrice: 173076.92,
              lines: [
                { text: 'First concept design', bold: true },
                { text: '  แบบแปลนลงสีสำหรับหมวดงานออกแบบ' },
                { text: '  ออกแบบงาน soft scape', highlight: true },
              ],
            },
            // ราคาค้างในฟอร์มแต่ตั้งเป็นไม่มีราคา → ต้องไม่ถูกนับ
            { name: 'For Permission', isPriced: false, unitPrice: 9999, sortOrder: 1 },
          ],
        },
      },
    })

    const preview = await service.previewFromEstimate(est.id, {})
    const doc = await issue(est.id)

    expect(doc.baseAmount.toFixed(2)).toBe('173076.92')
    expect(doc.items[1]).toMatchObject({ isPriced: false })
    expect(doc.items[1].amount.toFixed(2)).toBe('0.00')
    expect(doc.items[0].lines).toEqual([
      { text: 'First concept design', bold: true },
      { text: '  แบบแปลนลงสีสำหรับหมวดงานออกแบบ' },
      { text: '  ออกแบบงาน soft scape', highlight: true },
    ])
    // preview ต้องได้ยอดเท่าฉบับจริงทุกสตางค์
    expect(preview.grandTotal.toFixed(2)).toBe(doc.grandTotal.toFixed(2))
    expect(preview.status).toBe('PREVIEW')
  })

  it('preview แสดงได้แม้งวดยังไม่ครบ 100% โดยแนบคำเตือน แต่ออกจริงไม่ได้', async () => {
    const est = await makeEstimate(['50', '40'])
    const preview = await service.previewFromEstimate(est.id, {})
    expect(preview.warnings[0]).toContain('100%')
    expect(preview.installments).toHaveLength(2)
    await expect(issue(est.id)).rejects.toThrow('100%')
  })

  it('หัก ณ ที่จ่ายตาม % ที่ตั้งในใบประเมิน และจับคู่อัตราในตาราง', async () => {
    const rate = await prisma.whtRate.upsert({
      where: { code: 'TEST3' },
      update: {},
      create: { code: 'TEST3', rate: 0.03, description: 'ค่าบริการ 3%' },
    })
    const est = await makeEstimate(['100'])
    await prisma.estimate.update({ where: { id: est.id }, data: { whtPercent: 3 } })

    const preview = await service.previewFromEstimate(est.id, {})
    const doc = await issue(est.id)

    expect(doc.whtAmount.toFixed(2)).toBe('4500.00')
    expect(doc.netAmount.toFixed(2)).toBe('156000.00')
    expect(doc.whtRateId).toBe(rate.id)
    expect(preview.netAmount.toFixed(2)).toBe('156000.00')
  })

  it('% ที่ไม่มีในตาราง — ยังหักได้ แต่ไม่ผูก whtRateId', async () => {
    const est = await makeEstimate(['100'])
    await prisma.estimate.update({ where: { id: est.id }, data: { whtPercent: 1.5 } })
    const doc = await issue(est.id)
    expect(doc.whtAmount.toFixed(2)).toBe('2250.00')
    expect(doc.whtRateId).toBeNull()
  })

  it('งวดคิดจาก % ของยอดสุทธิ — ใบ P2612 (สุทธิ 179,999.99, งวด 30/35/20/15)', async () => {
    const est = await prisma.estimate.create({
      data: {
        projectId,
        code: `EST-NET-${Date.now()}`,
        title: 'P2612',
        whtPercent: 3,
        items: {
          create: [{ name: 'ออกแบบ', quantity: 1, unitPrice: 173076.92, totalPrice: 173076.92 }],
        },
        installments: {
          create: ['30', '35', '20', '15'].map((p, i) => ({
            installmentNo: i + 1,
            description: `งวด ${i + 1}`,
            withinWeeks: i === 0 ? null : 3,
            percentage: p,
            amount: 0,
          })),
        },
      },
    })
    const doc = await issue(est.id)

    expect(doc.netAmount.toFixed(2)).toBe('179999.99')
    expect(doc.installments.map((i) => i.netAmount.toFixed(2))).toEqual([
      '54000.00',
      '63000.00',
      '36000.00',
      '26999.99',
    ])
    const col = (k: 'amount' | 'vatAmount' | 'whtAmount') =>
      doc.installments.reduce((a, i) => a + Number(i[k]), 0).toFixed(2)
    expect(col('amount')).toBe(doc.baseAmount.toFixed(2))
    expect(col('vatAmount')).toBe(doc.vatAmount.toFixed(2))
    expect(col('whtAmount')).toBe(doc.whtAmount.toFixed(2))

    const print = await service.printData(doc.id)
    expect(print.installments[0].timingText).toBe('') // งวดแรกไม่ระบุสัปดาห์
  })

  it('schedule แก้ได้หลังออกใบเสนอราคา: นับครั้งเมื่อเปลี่ยนจริง snapshot เดิมไม่เปลี่ยน ออกใหม่แล้วรีเซ็ต', async () => {
    const est = await makeEstimate()
    const doc = await issue(est.id)
    const phases = [
      { name: 'แบบร่าง', startWeek: 1, durationWeeks: 5 },
      { name: 'แบบก่อสร้าง', startWeek: 6, durationWeeks: 6 },
    ]

    await estimates.upsertSchedule(est.id, phases)
    await estimates.upsertSchedule(est.id, phases) // บันทึกซ้ำ ไม่เปลี่ยน → ไม่นับ
    let e = await estimates.findOne(est.id)
    expect(e.scheduleRevision).toBe(1)
    expect(e.scheduleUpdatedAt).not.toBeNull()
    expect(e.status).toBe('SENT') // แก้ schedule ไม่ต้องกลับเป็นร่าง

    // ใบเสนอราคายังเป็นฉบับตอนออก
    expect((await service.findOne(doc.id)).schedule[0].durationWeeks).toBe(4)
    const print = await estimates.schedulePrint(est.id)
    expect(print.phases[0].durationWeeks).toBe(5)
    expect(print.quotation?.code).toBe(doc.code)

    // งวดยังล็อกอยู่
    await expect(estimates.upsertInstallments(est.id, [])).rejects.toThrow('แก้งวด')

    // ออกฉบับแก้ไข → schedule ล่าสุดกลายเป็นฉบับในใบใหม่ ตัวนับเริ่มใหม่
    await prisma.estimate.update({ where: { id: est.id }, data: { status: 'DRAFT' } })
    const r1 = await issue(est.id)
    e = await estimates.findOne(est.id)
    expect(e.scheduleRevision).toBe(0)
    expect(r1.schedule[0].durationWeeks).toBe(5)
  })
})
