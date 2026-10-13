import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { calcLineAmount, calcTax, D, round4, sum } from '../../common/utils/money.util'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { CompanyService } from '../company/company.service'
import { DocumentSequenceService } from '../company/document-sequence.service'
import { IssueQuotationDto, ListDocumentsQueryDto } from './dto/documents.dto'
import {
  installmentTimingText,
  InstallmentPlanRow,
  planInstallmentsByNet,
  revisionCode,
} from './quotation.util'

const DOCUMENT_LIST_SELECT = {
  id: true,
  code: true,
  docType: true,
  status: true,
  revisionNo: true,
  documentDate: true,
  dueDate: true,
  partyName: true,
  projectName: true,
  grandTotal: true,
  netAmount: true,
  projectId: true,
  estimateId: true,
  confirmedAt: true,
  voidedAt: true,
  createdAt: true,
} satisfies Prisma.DocumentSelect

const DOCUMENT_DETAIL_SELECT = {
  ...DOCUMENT_LIST_SELECT,
  customerId: true,
  rootDocId: true,
  supersedesDocId: true,
  sellerName: true,
  sellerBranchCode: true,
  sellerTaxId: true,
  sellerAddress: true,
  sellerContact: true,
  partyBranchCode: true,
  partyTaxId: true,
  partyAddress: true,
  partyContact: true,
  partyPhone: true,
  partyEmail: true,
  subtotal: true,
  discountAmount: true,
  baseAmount: true,
  vatRate: true,
  vatAmount: true,
  whtRateId: true,
  whtRate: true,
  whtAmount: true,
  note: true,
  internalNote: true,
  voidReason: true,
  supersededBy: { select: { id: true, code: true } },
  items: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      lines: true,
      isPriced: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      amount: true,
      isNote: true,
      sortOrder: true,
    },
  },
  installments: {
    orderBy: { installmentNo: 'asc' },
    select: {
      id: true,
      installmentNo: true,
      description: true,
      withinWeeks: true,
      percentage: true,
      amount: true,
      vatAmount: true,
      whtAmount: true,
      netAmount: true,
    },
  },
  schedule: {
    orderBy: [{ sortOrder: 'asc' }, { startWeek: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      startWeek: true,
      durationWeeks: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.DocumentSelect

/** QT ที่ยังมีผลอยู่ของ Estimate — ฉบับล่าสุดที่ยังไม่ถูกแทนหรือยกเลิก */
const ACTIVE_QUOTATION = (estimateId: number): Prisma.DocumentWhereInput => ({
  estimateId,
  docType: 'QUOTATION',
  status: 'CONFIRMED',
  deletedAt: null,
})

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter((p) => p && p.trim()).join(' ')
}

function documentDates(dto: Pick<IssueQuotationDto, 'documentDate' | 'validDays'>) {
  const documentDate = dto.documentDate ? new Date(dto.documentDate) : new Date()
  const dueDate = dto.validDays
    ? new Date(documentDate.getTime() + dto.validDays * 24 * 60 * 60 * 1000)
    : null
  return { documentDate, dueDate }
}

/** ข้อมูลของ Estimate ที่ต้องใช้สร้างใบเสนอราคา — ใช้ทั้งตอนออกจริงและตอน preview */
const ESTIMATE_FOR_QUOTATION = {
  id: true,
  code: true,
  title: true,
  status: true,
  whtPercent: true,
  project: {
    select: {
      id: true,
      name: true,
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          taxId: true,
          email: true,
          phone: true,
          address: true,
          subdistrict: true,
          district: true,
          province: true,
          postcode: true,
        },
      },
    },
  },
  items: { orderBy: { sortOrder: 'asc' } },
  installments: { orderBy: { installmentNo: 'asc' } },
  schedulePhases: { orderBy: [{ sortOrder: 'asc' }, { startWeek: 'asc' }] },
} satisfies Prisma.EstimateSelect

type EstimateForQuotation = Prisma.EstimateGetPayload<{ select: typeof ESTIMATE_FOR_QUOTATION }>

interface TaxSettings {
  vatRate: Prisma.Decimal
  /** id = อัตราในตาราง wht_rates ที่ตรงกัน (ไว้ออก 50 ทวิ) — null ถ้าเป็น % ที่ไม่มีในตาราง */
  whtRate: { id: number | null; rate: Prisma.Decimal } | null
}

/**
 * คำนวณเนื้อหาใบเสนอราคาจาก Estimate — ฟังก์ชันเดียวที่ทั้ง "ออกจริง" และ "preview" ใช้
 * เพื่อให้สิ่งที่เห็นใน preview ตรงกับฉบับที่ออกทุกสตางค์
 *
 * strict = true (ออกจริง): งวดรวมไม่ครบ 100% → error
 * strict = false (preview): แบ่งตาม % ตรง ๆ แล้วแนบคำเตือนแทน ให้เห็นหน้าตาก่อนกรอกครบ
 */
function buildQuotation(estimate: EstimateForQuotation, tax: TaxSettings, strict: boolean) {
  const items = estimate.items.map((it, idx) => ({
    name: it.name,
    description: it.description,
    lines: it.lines ?? Prisma.JsonNull,
    isPriced: it.isPriced,
    quantity: it.quantity,
    unit: it.unit,
    unitPrice: it.unitPrice,
    // หัวข้อที่ไม่มีราคาเป็น 0 เสมอ แม้มีราคาค้างอยู่ในฟอร์ม
    amount: it.isPriced ? calcLineAmount(it.quantity, it.unitPrice) : calcLineAmount(0, 0),
    sortOrder: idx,
  }))
  const totals = calcTax({
    subtotal: sum(items.map((l) => l.amount)),
    vatRate: tax.vatRate,
    whtRate: tax.whtRate?.rate ?? 0,
  })

  const warnings: string[] = []
  const pcts = estimate.installments.map((i) => i.percentage)
  // งวดคิดจาก % ของยอดสุทธิที่ลูกค้าจ่ายจริง (§13.7)
  let plan: InstallmentPlanRow[]
  try {
    plan = planInstallmentsByNet(totals, pcts)
  } catch (e) {
    if (strict) throw new BadRequestException((e as Error).message)
    warnings.push((e as Error).message)
    plan = planInstallmentsByNet(totals, pcts, false)
  }
  if (items.length === 0) {
    if (strict) throw new BadRequestException('ใบประเมินยังไม่มีรายการ')
    warnings.push('ใบประเมินยังไม่มีรายการ')
  }

  const customer = estimate.project.customer
  const party = {
    customerId: customer?.id,
    partyName: customer?.companyName || customer?.name,
    partyTaxId: customer?.taxId,
    partyAddress: joinAddress([
      customer?.address,
      customer?.subdistrict && `ต.${customer.subdistrict}`,
      customer?.district && `อ.${customer.district}`,
      customer?.province,
      customer?.postcode,
    ]),
    partyContact: customer?.companyName ? customer.name : null,
    partyPhone: customer?.phone,
    partyEmail: customer?.email,
    projectName: estimate.project.name,
  }

  const installments = estimate.installments.map((inst, idx) => ({
    installmentNo: idx + 1,
    description: inst.description,
    withinWeeks: inst.withinWeeks,
    percentage: inst.percentage,
    ...plan[idx],
  }))
  const schedule = estimate.schedulePhases.map((ph, idx) => ({
    name: ph.name,
    description: ph.description,
    startWeek: ph.startWeek,
    durationWeeks: ph.durationWeeks,
    sortOrder: idx,
  }))

  return { items, totals, installments, schedule, party, warnings }
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly company: CompanyService,
    private readonly sequence: DocumentSequenceService,
    private readonly activityLog: ActivityLogService,
  ) {}

  // ---------------------------------------------------------------------------
  // ออกใบเสนอราคาจาก Estimate — docs/billing-accounting-spec.md §5.5
  // ---------------------------------------------------------------------------

  /**
   * snapshot Estimate เป็น Document QT ที่ยืนยันแล้วในคำสั่งเดียว
   *
   * ถ้า Estimate นี้มี QT ที่มีผลอยู่แล้ว ฉบับใหม่จะเป็น -R{n} ของสายเดิม
   * และฉบับเก่าเปลี่ยนเป็น SUPERSEDED — ลูกค้าเห็นเลขฐานเดียวตลอดสาย
   */
  async issueFromEstimate(estimateId: number, dto: IssueQuotationDto, actorId: number) {
    const seller = await this.company.getProfile()
    const { documentDate, dueDate } = documentDates(dto)

    const doc = await this.prisma.$transaction(async (tx) => {
      // ล็อกแถว Estimate กันกดออกพร้อมกันสองครั้งแล้วได้ QT สองใบ
      await tx.$queryRaw`SELECT id FROM "estimates" WHERE id = ${estimateId} FOR UPDATE`

      const estimate = await tx.estimate.findUnique({
        where: { id: estimateId },
        select: ESTIMATE_FOR_QUOTATION,
      })
      if (!estimate) throw new NotFoundException('ไม่พบใบประเมิน')
      if (estimate.status !== 'DRAFT') {
        throw new BadRequestException(
          'ออกใบเสนอราคาได้เฉพาะใบประเมินสถานะร่าง — ถ้าต้องการแก้ไขฉบับที่ส่งไปแล้ว ให้กด "แก้ไขเพื่อออกฉบับใหม่" ก่อน',
        )
      }

      const taxSettings = await this.resolveTaxSettings(dto, seller, estimate.whtPercent)
      const built = buildQuotation(estimate, taxSettings, true)
      const tax = built.totals

      // ── เลขที่: ฉบับแรกจ่ายเลขใหม่, ฉบับแก้ไขใช้เลขฐาน + -R{n} ──
      const previous = await tx.document.findFirst({
        where: ACTIVE_QUOTATION(estimateId),
        orderBy: { revisionNo: 'desc' },
        select: { id: true, rootDocId: true },
      })

      let code: string
      let rootDocId: number | null = null
      let revisionNo = 0
      if (previous) {
        rootDocId = previous.rootDocId ?? previous.id
        const root = await tx.document.findUniqueOrThrow({
          where: { id: rootDocId },
          select: { code: true },
        })
        const last = await tx.document.aggregate({
          where: { OR: [{ id: rootDocId }, { rootDocId }] },
          _max: { revisionNo: true },
        })
        revisionNo = (last._max.revisionNo ?? 0) + 1
        code = revisionCode(root.code!, revisionNo)

        await tx.document.update({
          where: { id: previous.id },
          data: { status: 'SUPERSEDED' },
        })
      } else {
        code = await this.sequence.next(tx, 'QUOTATION', documentDate)
      }

      const now = new Date()

      const created = await tx.document.create({
        data: {
          code,
          docType: 'QUOTATION',
          status: 'CONFIRMED',
          companyId: seller.id,
          projectId: estimate.project.id,
          estimateId: estimate.id,
          rootDocId,
          revisionNo,
          supersedesDocId: previous?.id,
          documentDate,
          dueDate,

          sellerName: seller.name,
          sellerBranchCode: seller.branchCode,
          sellerTaxId: seller.taxId,
          sellerAddress: seller.address,
          sellerContact: seller.contactLine,

          ...built.party,

          subtotal: tax.subtotal,
          discountAmount: tax.discountAmount,
          baseAmount: tax.baseAmount,
          vatRate: tax.vatRate,
          vatAmount: tax.vatAmount,
          whtRateId: taxSettings.whtRate?.id,
          whtRate: tax.whtRate,
          whtAmount: tax.whtAmount,
          grandTotal: tax.grandTotal,
          netAmount: tax.netAmount,

          note: dto.note,
          createdById: actorId,
          confirmedAt: now,
          confirmedById: actorId,

          items: { create: built.items },
          installments: { create: built.installments },
          schedule: { create: built.schedule },
        },
        select: { id: true, code: true, revisionNo: true },
      })

      // schedule ตอนนี้กลายเป็นฉบับในใบเสนอราคาใหม่ — ตัวนับการปรับปรุงเริ่มใหม่
      await tx.estimate.update({
        where: { id: estimate.id },
        data: { status: 'SENT', scheduleRevision: 0, scheduleUpdatedAt: null },
      })

      return created
    })

    await this.activityLog.write({
      userId: actorId,
      action: doc.revisionNo > 0 ? 'document.revised' : 'document.confirmed',
      targetType: 'Document',
      targetId: doc.id,
      metadata: { code: doc.code, estimateId },
    })

    return this.findOne(doc.id)
  }

  /**
   * VAT / หัก ณ ที่จ่ายของใบเสนอราคา
   * - VAT: อัตราของบริษัทเสมอ (7%)
   * - หัก ณ ที่จ่าย: whtRateId ที่ส่งมา (API เดิม) มาก่อน ไม่งั้นใช้ % ที่ตั้งไว้ในใบประเมิน
   */
  private async resolveTaxSettings(
    dto: Pick<IssueQuotationDto, 'whtRateId'>,
    seller: { isVatRegistered: boolean; defaultVatRate: Prisma.Decimal },
    estimateWhtPercent: Prisma.Decimal | null,
  ): Promise<TaxSettings> {
    let whtRate: TaxSettings['whtRate'] = null
    if (dto.whtRateId) {
      whtRate = await this.prisma.whtRate.findFirst({
        where: { id: dto.whtRateId, isActive: true },
        select: { id: true, rate: true },
      })
      if (!whtRate) throw new BadRequestException('ไม่พบอัตราหัก ณ ที่จ่ายที่เลือก')
    } else if (estimateWhtPercent && D(estimateWhtPercent).greaterThan(0)) {
      const rate = round4(D(estimateWhtPercent).dividedBy(100))
      const match = await this.prisma.whtRate.findFirst({
        where: { rate, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      })
      whtRate = { id: match?.id ?? null, rate }
    }

    // ออกในนามบริษัทจดทะเบียน VAT — ทุกใบคิดอัตราของบริษัท (7%) ไม่ให้เลือกเอง
    const vatRate = seller.isVatRegistered ? D(seller.defaultVatRate) : D(0)
    return { vatRate, whtRate }
  }

  /**
   * ตัวอย่างใบเสนอราคาจากร่าง — คำนวณด้วย buildQuotation ตัวเดียวกับตอนออกจริงแต่ไม่บันทึก
   * ไม่ระบุภาษี: ใช้ค่าของฉบับที่มีผลอยู่ (ถ้ามี) ไม่งั้นใช้ค่าตั้งต้นของบริษัทและไม่หัก ณ ที่จ่าย
   */
  async previewFromEstimate(estimateId: number, dto: IssueQuotationDto) {
    const [seller, estimate, active] = await Promise.all([
      this.company.getProfile(),
      this.prisma.estimate.findUnique({
        where: { id: estimateId },
        select: ESTIMATE_FOR_QUOTATION,
      }),
      this.prisma.document.findFirst({
        where: ACTIVE_QUOTATION(estimateId),
        orderBy: { revisionNo: 'desc' },
        select: { code: true },
      }),
    ])
    if (!estimate) throw new NotFoundException('ไม่พบใบประเมิน')

    const taxSettings = await this.resolveTaxSettings(dto, seller, estimate.whtPercent)
    const { documentDate, dueDate } = documentDates(dto)
    const built = buildQuotation(estimate, taxSettings, false)

    return this.decoratePrint(
      {
        id: 0,
        code: null,
        docType: 'QUOTATION' as const,
        status: 'PREVIEW' as const,
        revisionNo: 0,
        documentDate,
        dueDate,
        estimateId,
        projectId: estimate.project.id,
        sellerName: seller.name,
        sellerBranchCode: seller.branchCode,
        sellerTaxId: seller.taxId,
        sellerAddress: seller.address,
        sellerContact: seller.contactLine,
        ...built.party,
        ...built.totals,
        whtRateId: taxSettings.whtRate?.id ?? null,
        note: dto.note ?? null,
        voidReason: null,
        supersededBy: null,
        items: built.items.map((it, idx) => ({ ...it, id: idx + 1, isNote: false })),
        installments: built.installments.map((inst, idx) => ({ ...inst, id: idx + 1 })),
        schedule: built.schedule.map((ph, idx) => ({ ...ph, id: idx + 1 })),
        warnings: built.warnings,
        // ออกตอนนี้จะได้เลขอะไร — แสดงให้รู้ว่าเป็นฉบับแก้ไขหรือฉบับแรก
        willRevise: active?.code ?? null,
      },
      seller,
    )
  }

  /** เติมข้อมูลที่หน้าพิมพ์ต้องใช้: ภาษีต่องวด ข้อความเวลางวด โลโก้ */
  private decoratePrint<
    T extends {
      vatRate: Prisma.Decimal
      whtRate: Prisma.Decimal
      installments: Array<{ withinWeeks: number | null }>
    },
  >(doc: T, seller: { logoUrl: string | null; signatureName: string | null }) {
    // ยอดของแต่ละงวดมาจาก snapshot (หรือ buildQuotation ตอน preview) ไม่คำนวณใหม่ที่นี่
    return {
      ...doc,
      installments: doc.installments.map((inst) => ({
        ...inst,
        timingText: installmentTimingText(inst.withinWeeks),
      })),
      // โลโก้และลายเซ็นใช้ของปัจจุบัน ไม่ใช่ข้อมูลทางบัญชีจึงไม่ต้อง snapshot
      sellerLogoUrl: seller.logoUrl,
      sellerSignatureName: seller.signatureName,
    }
  }

  // ---------------------------------------------------------------------------
  // อ่าน
  // ---------------------------------------------------------------------------

  async findAll(query: ListDocumentsQueryDto) {
    const { page, pageSize, docType, status, projectId, estimateId, search } = query
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      ...(docType && { docType }),
      ...(status && { status }),
      ...(projectId && { projectId }),
      ...(estimateId && { estimateId }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { partyName: { contains: search, mode: 'insensitive' } },
          { projectName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.document.findMany({
        where,
        select: DOCUMENT_LIST_SELECT,
        orderBy: [{ documentDate: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.document.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: DOCUMENT_DETAIL_SELECT,
    })
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร')
    return doc
  }

  /**
   * payload ของหน้าพิมพ์ — ยอดทุกตัวคำนวณจาก backend แล้ว หน้าพิมพ์แค่จัดรูปแบบ
   * ภาษีของแต่ละงวดคิดด้วยอัตราเดียวกับเอกสาร เพื่อให้ลูกค้าเห็นยอดรับจริงต่องวด
   */
  async printData(id: number) {
    const [doc, seller] = await Promise.all([this.findOne(id), this.company.getProfile()])
    return this.decoratePrint({ ...doc, warnings: [] as string[], willRevise: null }, seller)
  }

  // ---------------------------------------------------------------------------
  // ยกเลิก
  // ---------------------------------------------------------------------------

  /**
   * ยกเลิก QT ที่มีผลอยู่ — คงเลขที่ไว้ งวดเงินที่ยังไม่ได้รับเงินจาก QT นี้ถูกลบออก
   * และ Estimate กลับเป็นร่างเพื่อแก้แล้วออกใหม่ได้
   */
  async void(id: number, reason: string, actorId: number) {
    const doc = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, code: true, status: true, docType: true, estimateId: true },
      })
      if (!doc) throw new NotFoundException('ไม่พบเอกสาร')
      if (doc.status !== 'CONFIRMED') {
        throw new BadRequestException('ยกเลิกได้เฉพาะเอกสารที่มีผลอยู่ (ไม่ใช่ฉบับที่ถูกแทนแล้ว)')
      }

      const fromThisDoc: Prisma.PaymentMilestoneWhereInput = {
        documentInstallment: { documentId: id },
        deletedAt: null,
      }
      const touched = await tx.paymentMilestone.count({
        where: { ...fromThisDoc, status: { not: 'UNPAID' } },
      })
      if (touched > 0) {
        throw new ConflictException(
          'มีงวดเงินจากใบเสนอราคานี้ที่รับชำระแล้วบางส่วน — ยกเลิกไม่ได้ ต้องจัดการงวดเงินก่อน',
        )
      }

      await tx.paymentMilestone.updateMany({
        where: fromThisDoc,
        data: { deletedAt: new Date() },
      })
      await tx.document.update({
        where: { id },
        data: { status: 'VOIDED', voidedAt: new Date(), voidedById: actorId, voidReason: reason },
      })
      if (doc.estimateId) {
        await tx.estimate.update({ where: { id: doc.estimateId }, data: { status: 'DRAFT' } })
      }
      return doc
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'document.voided',
      targetType: 'Document',
      targetId: id,
      metadata: { code: doc.code, reason },
    })

    return this.findOne(id)
  }

  // ---------------------------------------------------------------------------
  // งวดเงิน
  // ---------------------------------------------------------------------------

  /** QT ที่มีผลอยู่ของ Estimate — null ถ้ายังไม่เคยออก (Estimate รุ่นก่อน Phase 2) */
  findActiveQuotation(estimateId: number) {
    return this.prisma.document.findFirst({
      where: ACTIVE_QUOTATION(estimateId),
      orderBy: { revisionNo: 'desc' },
      select: { id: true, code: true },
    })
  }

  /**
   * สร้าง PaymentMilestone จากงวดใน snapshot ของ QT — ไม่ใช่จาก Estimate ที่ยังแก้ได้
   * นำเข้าซ้ำได้: งวดเดิมของ Estimate นี้ที่ยังไม่ได้รับเงินถูกแทนที่ทั้งชุด
   */
  async importMilestones(id: number, actorId: number) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        docType: true,
        status: true,
        projectId: true,
        estimateId: true,
        estimate: { select: { status: true } },
        installments: { orderBy: { installmentNo: 'asc' } },
      },
    })
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร')
    if (doc.docType !== 'QUOTATION' || doc.status !== 'CONFIRMED') {
      throw new BadRequestException('นำเข้างวดเงินได้จากใบเสนอราคาฉบับที่มีผลอยู่เท่านั้น')
    }
    if (!doc.projectId || !doc.estimateId) {
      throw new BadRequestException('ใบเสนอราคานี้ไม่ได้ผูกกับโครงการ')
    }
    if (doc.estimate?.status !== 'APPROVED') {
      throw new BadRequestException('ลูกค้ายังไม่อนุมัติใบเสนอราคานี้')
    }
    if (doc.installments.length === 0) {
      throw new BadRequestException('ใบเสนอราคานี้ไม่มีงวดจ่าย')
    }

    const { projectId, estimateId } = doc
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMilestone.updateMany({
        where: { projectId, estimateId, deletedAt: null, status: 'UNPAID' },
        data: { deletedAt: new Date() },
      })
      await tx.paymentMilestone.createMany({
        data: doc.installments.map((inst) => {
          const timing = installmentTimingText(inst.withinWeeks)
          return {
            projectId,
            estimateId,
            documentInstallmentId: inst.id,
            title: `งวดที่ ${inst.installmentNo}: ${inst.description}`,
            // amount ของงวดเงินคือราคาก่อน VAT · ยอดที่ลูกค้าจ่ายจริงแนบไว้ในคำอธิบาย
            description: `จากใบเสนอราคา ${doc.code} (${inst.percentage}%) ยอดชำระ ${Number(inst.netAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท${timing ? ` — ${timing}` : ''}`,
            amount: inst.amount,
            sortOrder: inst.installmentNo,
          }
        }),
      })
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'payment.imported_from_document',
      targetType: 'Project',
      targetId: projectId,
      metadata: { documentId: id, code: doc.code },
    })

    return { imported: doc.installments.length }
  }
}
