import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { EstimateStatus, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import {
  CreateEstimateDto,
  CreateEstimateItemDto,
  EstimateInstallmentDto,
  EstimateSchedulePhaseDto,
  UpdateEstimateItemDto,
} from './dto/create-estimate.dto'
import { UpdateEstimateDto, UpdateEstimateStatusDto } from './dto/update-estimate.dto'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { calcLineAmount, calcTax, D, sum } from '../../common/utils/money.util'
import { resolveLines } from './item-lines'
import { CompanyService } from '../company/company.service'

const ITEM_SELECT = {
  id: true,
  name: true,
  description: true,
  lines: true,
  isPriced: true,
  quantity: true,
  unit: true,
  unitPrice: true,
  totalPrice: true,
  sortOrder: true,
  subQuotationId: true,
} satisfies Prisma.EstimateItemSelect

/** ยอดของรายการ — หัวข้อที่ไม่มีราคาเป็น 0 เสมอ ไม่ว่าจะกรอกราคาค้างไว้หรือไม่ */
function itemTotal(isPriced: boolean, quantity: string, unitPrice: string) {
  return isPriced ? calcLineAmount(quantity, unitPrice) : calcLineAmount(0, 0)
}

/** ค่าที่บันทึกของรายการใหม่ — ใช้ร่วมกันทุกทางที่สร้างรายการ */
function newItemData(item: CreateEstimateItemDto, idx: number) {
  const isPriced = item.isPriced ?? true
  const quantity = item.quantity ?? '1'
  return {
    name: item.name,
    ...(resolveLines(item) ?? { description: null }),
    isPriced,
    quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalPrice: itemTotal(isPriced, quantity, item.unitPrice),
    sortOrder: item.sortOrder ?? idx,
  }
}

const ESTIMATE_SELECT = {
  id: true,
  code: true,
  title: true,
  description: true,
  status: true,
  totalAmount: true,
  whtPercent: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      code: true,
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
          province: true,
          district: true,
          subdistrict: true,
          postcode: true,
        },
      },
    },
  },
  items: { select: ITEM_SELECT, orderBy: { sortOrder: 'asc' as const } },
  installments: {
    select: {
      id: true,
      installmentNo: true,
      description: true,
      withinWeeks: true,
      percentage: true,
      amount: true,
    },
    orderBy: { installmentNo: 'asc' as const },
  },
  schedulePhases: {
    select: {
      id: true,
      name: true,
      description: true,
      startWeek: true,
      durationWeeks: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' as const }, { startWeek: 'asc' as const }],
  },
  /// ใบเสนอราคาที่ออกจากใบนี้ทุกฉบับ — ฉบับล่าสุดก่อน (§5.5)
  documents: {
    where: { docType: 'QUOTATION' as const, deletedAt: null },
    select: {
      id: true,
      code: true,
      status: true,
      revisionNo: true,
      documentDate: true,
      grandTotal: true,
      vatRate: true,
      whtRateId: true,
      voidReason: true,
    },
    orderBy: { id: 'desc' as const },
  },
} satisfies Prisma.EstimateSelect

const STATUS_TRANSITIONS: Partial<Record<EstimateStatus, EstimateStatus[]>> = {
  DRAFT: ['SENT'],
  // SENT → DRAFT = "แก้ไขเพื่อออกฉบับใหม่" แล้วออกใบเสนอราคาเป็น -R{n}
  SENT: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: [],
  REJECTED: ['DRAFT'],
}

@Injectable()
export class EstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly company: CompanyService,
  ) {}

  private calcTotal(items: CreateEstimateItemDto[]) {
    return sum(items.map((item, idx) => newItemData(item, idx).totalPrice))
  }

  private async generateQTCode(): Promise<string> {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const prefix = `QT${y}${m}${d}`
    const last = await this.prisma.estimate.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    })
    const seq = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1
    return `${prefix}${String(seq).padStart(3, '0')}`
  }

  async create(dto: CreateEstimateDto, actorId: number) {
    const code = await this.generateQTCode()

    const items = dto.items ?? []
    const totalAmount = this.calcTotal(items)

    const estimate = await this.prisma.estimate.create({
      data: {
        code,
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
        totalAmount,
        items: {
          create: items.map((item, idx) => newItemData(item, idx)),
        },
      },
      select: ESTIMATE_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'estimate.created',
      targetType: 'Estimate',
      targetId: estimate.id,
      metadata: { code: estimate.code },
    })

    return estimate
  }

  async findProjectsOverview(pagination: PaginationDto, search?: string) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where: Prisma.ProjectWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { companyName: { contains: search, mode: 'insensitive' } } },
            { estimates: { some: { code: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {}

    const [data, totalItems] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          customer: { select: { id: true, name: true, companyName: true } },
          estimates: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.project.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where: Prisma.EstimateWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
            { project: { customer: { name: { contains: search, mode: 'insensitive' } } } },
            { project: { customer: { companyName: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {}

    const [data, totalItems] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              customer: { select: { id: true, name: true, companyName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.estimate.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.EstimateWhereInput = { projectId }

    const [data, totalItems] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.estimate.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      select: ESTIMATE_SELECT,
    })
    if (!estimate) throw new NotFoundException('ไม่พบใบประเมิน')
    return estimate
  }

  /**
   * รายละเอียดพร้อมสรุปยอด (VAT / หัก ณ ที่จ่าย / สุทธิ) สำหรับหน้าจอ — คำนวณที่ backend
   * ด้วยวิธีเดียวกับใบเสนอราคา หน้าจอไม่ต้องคิดเงินเอง
   * VAT ใช้ของฉบับที่ออกล่าสุด ถ้ายังไม่เคยออกใช้ค่าตั้งต้นของบริษัท
   */
  async findOneWithSummary(id: number) {
    const [estimate, seller] = await Promise.all([this.findOne(id), this.company.getProfile()])
    const active = await this.prisma.document.findFirst({
      where: { estimateId: id, docType: 'QUOTATION', status: 'CONFIRMED', deletedAt: null },
      orderBy: { revisionNo: 'desc' },
      select: { vatRate: true },
    })
    const vatRate = active?.vatRate ?? (seller.isVatRegistered ? seller.defaultVatRate : 0)
    const summary = calcTax({
      subtotal: estimate.totalAmount,
      vatRate,
      whtRate: estimate.whtPercent ? D(estimate.whtPercent).dividedBy(100) : 0,
    })
    return { ...estimate, summary }
  }

  async update(id: number, dto: UpdateEstimateDto, actorId: number) {
    const estimate = await this.findOne(id)
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('แก้ไขได้เฉพาะใบประเมินที่อยู่ในสถานะ DRAFT')
    }

    const items = dto.items
    const totalAmount = items ? this.calcTotal(items) : undefined

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.estimateItem.deleteMany({ where: { estimateId: id } })
      }

      return tx.estimate.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          ...(dto.whtPercent !== undefined && { whtPercent: dto.whtPercent }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(items && {
            items: {
              create: items.map((item, idx) => newItemData(item, idx)),
            },
          }),
        },
        select: ESTIMATE_SELECT,
      })
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'estimate.updated',
      targetType: 'Estimate',
      targetId: id,
    })

    return updated
  }

  async updateStatus(id: number, dto: UpdateEstimateStatusDto, actorId: number) {
    const estimate = await this.findOne(id)
    const currentStatus = estimate.status as EstimateStatus
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${dto.status} ได้`,
      )
    }
    // ใบที่เคยออกใบเสนอราคาแล้ว ต้องส่งผ่านการออกเอกสารเท่านั้น
    // ไม่งั้นสถานะ SENT จะชี้ไปที่ QT ฉบับเก่าที่เนื้อหาไม่ตรงกับที่แก้ไปแล้ว
    if (currentStatus === 'DRAFT' && dto.status === 'SENT' && estimate.documents.length > 0) {
      throw new BadRequestException(
        'ใบนี้เคยออกใบเสนอราคาแล้ว — กด "ออกใบเสนอราคา" เพื่อออกฉบับแก้ไข',
      )
    }

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: { status: dto.status },
      select: ESTIMATE_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'estimate.status_changed',
      targetType: 'Estimate',
      targetId: id,
      metadata: { from: currentStatus, to: dto.status },
    })

    return updated
  }

  async addItem(estimateId: number, dto: CreateEstimateItemDto, _actorId: number) {
    const estimate = await this.findOne(estimateId)
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('เพิ่มรายการได้เฉพาะใบประเมินสถานะ DRAFT')
    }

    const maxOrder = await this.prisma.estimateItem.count({ where: { estimateId } })

    const item = await this.prisma.estimateItem.create({
      data: {
        estimateId,
        ...newItemData(dto, maxOrder),
        ...(dto.subQuotationId ? { subQuotationId: dto.subQuotationId } : {}),
      },
      select: ITEM_SELECT,
    })

    await this.recalcTotal(estimateId)
    return item
  }

  async updateItem(estimateId: number, itemId: number, dto: UpdateEstimateItemDto) {
    const estimate = await this.findOne(estimateId)
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('แก้ไขรายการได้เฉพาะใบประเมินสถานะ DRAFT')
    }

    const item = await this.prisma.estimateItem.findFirst({ where: { id: itemId, estimateId } })
    if (!item) throw new NotFoundException('ไม่พบรายการ')

    const isPriced = dto.isPriced ?? item.isPriced
    const qty = dto.quantity ?? item.quantity.toString()
    const price = dto.unitPrice ?? item.unitPrice.toString()

    const updated = await this.prisma.estimateItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        ...resolveLines(dto),
        isPriced: dto.isPriced,
        quantity: dto.quantity,
        unit: dto.unit,
        unitPrice: dto.unitPrice,
        totalPrice: itemTotal(isPriced, qty, price),
        sortOrder: dto.sortOrder,
      },
      select: ITEM_SELECT,
    })

    await this.recalcTotal(estimateId)
    return updated
  }

  async remove(id: number, actorId: number) {
    const estimate = await this.findOne(id)
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('ลบได้เฉพาะใบประเมินสถานะ DRAFT')
    }
    if (estimate.documents.length > 0) {
      throw new BadRequestException('ใบนี้เคยออกใบเสนอราคาแล้ว ลบไม่ได้ — ให้ยกเลิกใบเสนอราคาแทน')
    }

    await this.prisma.$transaction([
      this.prisma.estimateItem.deleteMany({ where: { estimateId: id } }),
      this.prisma.estimate.delete({ where: { id } }),
    ])

    await this.activityLog.write({
      userId: actorId,
      action: 'estimate.deleted',
      targetType: 'Estimate',
      targetId: id,
      metadata: { code: estimate.code },
    })
  }

  async removeItem(estimateId: number, itemId: number) {
    const estimate = await this.findOne(estimateId)
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('ลบรายการได้เฉพาะใบประเมินสถานะ DRAFT')
    }

    const item = await this.prisma.estimateItem.findFirst({ where: { id: itemId, estimateId } })
    if (!item) throw new NotFoundException('ไม่พบรายการ')

    await this.prisma.estimateItem.delete({ where: { id: itemId } })
    await this.recalcTotal(estimateId)
  }

  /**
   * ใบที่ออกใบเสนอราคาแล้วแก้งวด/schedule ได้เฉพาะตอนเป็นร่าง (ก่อนออกฉบับแก้ไข)
   * ใบรุ่นเก่าที่ยังไม่เคยออกเอกสารคงพฤติกรรมเดิม — แก้ได้ทุกสถานะ
   */
  private assertScheduleEditable(estimate: { status: string; documents: unknown[] }) {
    if (estimate.status !== 'DRAFT' && estimate.documents.length > 0) {
      throw new BadRequestException(
        'ใบเสนอราคาออกไปแล้ว — กด "แก้ไขเพื่อออกฉบับใหม่" ก่อนจึงจะแก้งวดหรือ schedule ได้',
      )
    }
  }

  async upsertInstallments(estimateId: number, installments: EstimateInstallmentDto[]) {
    this.assertScheduleEditable(await this.findOne(estimateId))
    await this.prisma.$transaction(async (tx) => {
      await tx.estimateInstallment.deleteMany({ where: { estimateId } })
      if (installments.length) {
        await tx.estimateInstallment.createMany({
          data: installments.map((inst) => ({
            estimateId,
            installmentNo: inst.installmentNo,
            description: inst.description,
            withinWeeks: inst.withinWeeks ?? null,
            percentage: inst.percentage,
            amount: inst.amount,
          })),
        })
      }
    })
    return this.findOne(estimateId)
  }

  async upsertSchedule(estimateId: number, phases: EstimateSchedulePhaseDto[]) {
    this.assertScheduleEditable(await this.findOne(estimateId))
    await this.prisma.$transaction(async (tx) => {
      await tx.estimateSchedulePhase.deleteMany({ where: { estimateId } })
      if (phases.length) {
        await tx.estimateSchedulePhase.createMany({
          data: phases.map((ph, idx) => ({
            estimateId,
            name: ph.name,
            description: ph.description?.trim() || null,
            startWeek: ph.startWeek,
            durationWeeks: ph.durationWeeks,
            sortOrder: idx,
          })),
        })
      }
    })
    return this.findOne(estimateId)
  }

  private async recalcTotal(estimateId: number) {
    const items = await this.prisma.estimateItem.findMany({
      where: { estimateId },
      select: { totalPrice: true },
    })
    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: { totalAmount: sum(items.map((i) => i.totalPrice)) },
    })
  }
}
