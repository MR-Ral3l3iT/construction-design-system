import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { QuotationStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { generateCode } from '../../common/utils/code-generator.util'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
} from './dto/quotation.dto'

const STATUS_TRANSITIONS: Partial<Record<QuotationStatus, QuotationStatus[]>> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'DRAFT'],
  ACCEPTED: [],
  REJECTED: ['DRAFT'],
  EXPIRED: ['DRAFT'],
}

const QUOTATION_SELECT = {
  id: true,
  code: true,
  title: true,
  status: true,
  validUntil: true,
  note: true,
  mgmtRate: true,
  vatRate: true,
  subtotal: true,
  mgmtCost: true,
  vat: true,
  totalAmount: true,
  boqId: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      code: true,
      name: true,
      customer: {
        select: {
          name: true,
          companyName: true,
          phone: true,
          email: true,
          taxId: true,
          address: true,
          subdistrict: true,
          district: true,
          province: true,
          postcode: true,
        },
      },
    },
  },
  boq: { select: { id: true, code: true, title: true } },
  categories: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      totalAmount: true,
      subCategories: {
        orderBy: { sortOrder: 'asc' as const },
        select: { id: true, name: true, sortOrder: true, totalAmount: true },
      },
    },
  },
}

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateQuotationDto, actorId: number) {
    const code = await this.prisma.$transaction(async (tx) =>
      generateCode(tx as unknown as PrismaService, 'QT'),
    )

    const mgmtRate = parseFloat(dto.mgmtRate ?? '0.10')
    const vatRate = parseFloat(dto.vatRate ?? '0.07')

    // ── snapshot จาก BOQ ────────────────────────────────────────────────────────
    let categories: {
      name: string
      sortOrder: number
      totalAmount: number
      subs: { name: string; sortOrder: number; totalAmount: number }[]
    }[] = []
    let subtotal = 0

    if (dto.boqId) {
      const boq = await this.prisma.bOQ.findFirst({
        where: { id: dto.boqId, deletedAt: null },
        select: {
          totalAmount: true,
          categories: {
            orderBy: { sortOrder: 'asc' },
            select: {
              name: true,
              sortOrder: true,
              subCategories: {
                orderBy: { sortOrder: 'asc' },
                select: {
                  name: true,
                  sortOrder: true,
                  items: { select: { totalPrice: true } },
                },
              },
            },
          },
        },
      })
      if (!boq) throw new NotFoundException('ไม่พบ BOQ')

      subtotal = Number(boq.totalAmount)

      categories = boq.categories.map((cat) => {
        const subs = cat.subCategories.map((sub) => ({
          name: sub.name,
          sortOrder: sub.sortOrder,
          totalAmount: sub.items.reduce((s, it) => s + Number(it.totalPrice), 0),
        }))
        return {
          name: cat.name,
          sortOrder: cat.sortOrder,
          totalAmount: subs.reduce((s, sub) => s + sub.totalAmount, 0),
          subs,
        }
      })
    }

    const mgmtCost = Math.round(subtotal * mgmtRate * 100) / 100
    const beforeVat = subtotal + mgmtCost
    const vat = Math.round(beforeVat * vatRate * 100) / 100
    const totalAmount = beforeVat + vat

    const quotation = await this.prisma.quotation.create({
      data: {
        code,
        title: dto.title,
        projectId: dto.projectId,
        ...(dto.boqId && { boqId: dto.boqId }),
        ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
        note: dto.note,
        mgmtRate: mgmtRate.toString(),
        vatRate: vatRate.toString(),
        subtotal: subtotal.toString(),
        mgmtCost: mgmtCost.toString(),
        vat: vat.toString(),
        totalAmount: totalAmount.toString(),
        categories: {
          create: categories.map((cat) => ({
            name: cat.name,
            sortOrder: cat.sortOrder,
            totalAmount: cat.totalAmount.toString(),
            subCategories: {
              create: cat.subs.map((sub) => ({
                name: sub.name,
                sortOrder: sub.sortOrder,
                totalAmount: sub.totalAmount.toString(),
              })),
            },
          })),
        },
      },
      select: QUOTATION_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'quotation.created',
      targetType: 'Quotation',
      targetId: quotation.id,
      metadata: { code: quotation.code },
    })

    return quotation
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          validUntil: true,
          totalAmount: true,
          boqId: true,
          boq: { select: { code: true, title: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.quotation.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      select: QUOTATION_SELECT,
    })
    if (!q) throw new NotFoundException('ไม่พบใบเสนอราคา')
    return q
  }

  async update(id: number, dto: UpdateQuotationDto, actorId: number) {
    await this.findOne(id)

    const mgmtRate = dto.mgmtRate !== undefined ? parseFloat(dto.mgmtRate) : undefined
    const vatRate = dto.vatRate !== undefined ? parseFloat(dto.vatRate) : undefined

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.validUntil !== undefined && {
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        }),
        ...(mgmtRate !== undefined && { mgmtRate: mgmtRate.toString() }),
        ...(vatRate !== undefined && { vatRate: vatRate.toString() }),
      },
      select: QUOTATION_SELECT,
    })

    if (mgmtRate !== undefined || vatRate !== undefined) {
      await this.recalcTotals(id)
      return this.findOne(id)
    }

    await this.activityLog.write({
      userId: actorId,
      action: 'quotation.updated',
      targetType: 'Quotation',
      targetId: id,
    })
    return updated
  }

  async updateStatus(id: number, dto: UpdateQuotationStatusDto, actorId: number) {
    const q = await this.findOne(id)
    const allowed = STATUS_TRANSITIONS[q.status as QuotationStatus] ?? []
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`ไม่สามารถเปลี่ยนสถานะจาก ${q.status} เป็น ${dto.status} ได้`)
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status: dto.status },
      select: QUOTATION_SELECT,
    })

    if (dto.status === 'ACCEPTED' && q.boqId) {
      await this.prisma.bOQ.update({
        where: { id: q.boqId },
        data: { status: 'LOCKED', isLocked: true },
      })
    }

    await this.activityLog.write({
      userId: actorId,
      action: 'quotation.status_changed',
      targetType: 'Quotation',
      targetId: id,
      metadata: { from: q.status, to: dto.status },
    })

    return updated
  }

  async remove(id: number) {
    await this.findOne(id)
    await this.prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } })
    return { success: true }
  }

  private async recalcTotals(id: number) {
    const q = await this.prisma.quotation.findUnique({
      where: { id },
      select: { subtotal: true, mgmtRate: true, vatRate: true },
    })
    if (!q) return

    const subtotal = Number(q.subtotal)
    const mgmtRate = Number(q.mgmtRate)
    const vatRate = Number(q.vatRate)
    const mgmtCost = Math.round(subtotal * mgmtRate * 100) / 100
    const beforeVat = subtotal + mgmtCost
    const vat = Math.round(beforeVat * vatRate * 100) / 100

    await this.prisma.quotation.update({
      where: { id },
      data: {
        mgmtCost: mgmtCost.toString(),
        vat: vat.toString(),
        totalAmount: (beforeVat + vat).toString(),
      },
    })
  }
}
