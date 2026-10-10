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
import { allocateInstallments, installmentTimingText, revisionCode } from './quotation.util'

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
      triggerText: true,
      withinWeeks: true,
      percentage: true,
      amount: true,
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

    const whtRate = dto.whtRateId
      ? await this.prisma.whtRate.findFirst({
          where: { id: dto.whtRateId, isActive: true },
          select: { id: true, rate: true },
        })
      : null
    if (dto.whtRateId && !whtRate) throw new BadRequestException('ไม่พบอัตราหัก ณ ที่จ่ายที่เลือก')

    const vatRate =
      dto.vatPercent !== undefined
        ? round4(D(dto.vatPercent).dividedBy(100))
        : seller.isVatRegistered
          ? D(seller.defaultVatRate)
          : D(0)

    const documentDate = dto.documentDate ? new Date(dto.documentDate) : new Date()
    const dueDate = dto.validDays
      ? new Date(documentDate.getTime() + dto.validDays * 24 * 60 * 60 * 1000)
      : null

    const doc = await this.prisma.$transaction(async (tx) => {
      // ล็อกแถว Estimate กันกดออกพร้อมกันสองครั้งแล้วได้ QT สองใบ
      await tx.$queryRaw`SELECT id FROM "estimates" WHERE id = ${estimateId} FOR UPDATE`

      const estimate = await tx.estimate.findUnique({
        where: { id: estimateId },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
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
        },
      })
      if (!estimate) throw new NotFoundException('ไม่พบใบประเมิน')
      if (estimate.status !== 'DRAFT') {
        throw new BadRequestException(
          'ออกใบเสนอราคาได้เฉพาะใบประเมินสถานะร่าง — ถ้าต้องการแก้ไขฉบับที่ส่งไปแล้ว ให้กด "แก้ไขเพื่อออกฉบับใหม่" ก่อน',
        )
      }
      if (estimate.items.length === 0) {
        throw new BadRequestException('ใบประเมินยังไม่มีรายการ')
      }

      // ── ยอดเงิน ──
      const lines = estimate.items.map((it) => ({
        ...it,
        amount: calcLineAmount(it.quantity, it.unitPrice),
      }))
      const tax = calcTax({
        subtotal: sum(lines.map((l) => l.amount)),
        vatRate,
        whtRate: whtRate?.rate ?? 0,
      })

      let installmentAmounts: Prisma.Decimal[]
      try {
        installmentAmounts = allocateInstallments(
          tax.baseAmount,
          estimate.installments.map((i) => i.percentage),
        )
      } catch (e) {
        throw new BadRequestException((e as Error).message)
      }

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

      const customer = estimate.project.customer
      const now = new Date()

      const created = await tx.document.create({
        data: {
          code,
          docType: 'QUOTATION',
          status: 'CONFIRMED',
          companyId: seller.id,
          customerId: customer?.id,
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

          subtotal: tax.subtotal,
          discountAmount: tax.discountAmount,
          baseAmount: tax.baseAmount,
          vatRate: tax.vatRate,
          vatAmount: tax.vatAmount,
          whtRateId: whtRate?.id,
          whtRate: tax.whtRate,
          whtAmount: tax.whtAmount,
          grandTotal: tax.grandTotal,
          netAmount: tax.netAmount,

          note: dto.note,
          createdById: actorId,
          confirmedAt: now,
          confirmedById: actorId,

          items: {
            create: lines.map((l, idx) => ({
              name: l.name,
              description: l.description,
              quantity: l.quantity,
              unit: l.unit,
              unitPrice: l.unitPrice,
              amount: l.amount,
              sortOrder: idx,
            })),
          },
          installments: {
            create: estimate.installments.map((inst, idx) => ({
              installmentNo: idx + 1,
              description: inst.description,
              triggerText: inst.triggerText,
              withinWeeks: inst.withinWeeks,
              percentage: inst.percentage,
              amount: installmentAmounts[idx],
            })),
          },
          schedule: {
            create: estimate.schedulePhases.map((ph, idx) => ({
              name: ph.name,
              description: ph.description,
              startWeek: ph.startWeek,
              durationWeeks: ph.durationWeeks,
              sortOrder: idx,
            })),
          },
        },
        select: { id: true, code: true, revisionNo: true },
      })

      await tx.estimate.update({ where: { id: estimate.id }, data: { status: 'SENT' } })

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

    const installments = doc.installments.map((inst) => {
      const tax = calcTax({ subtotal: inst.amount, vatRate: doc.vatRate, whtRate: doc.whtRate })
      return {
        ...inst,
        timingText: installmentTimingText(inst.triggerText, inst.withinWeeks),
        vatAmount: tax.vatAmount,
        whtAmount: tax.whtAmount,
        netAmount: tax.netAmount,
      }
    })

    return {
      ...doc,
      installments,
      // โลโก้และลายเซ็นใช้ของปัจจุบัน ไม่ใช่ข้อมูลทางบัญชีจึงไม่ต้อง snapshot
      sellerLogoUrl: seller.logoUrl,
      sellerSignatureName: seller.signatureName,
    }
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
          const timing = installmentTimingText(inst.triggerText, inst.withinWeeks)
          return {
            projectId,
            estimateId,
            documentInstallmentId: inst.id,
            title: `งวดที่ ${inst.installmentNo}: ${inst.description}`,
            description: `จากใบเสนอราคา ${doc.code} (${inst.percentage}%)${timing ? ` — ${timing}` : ''}`,
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
