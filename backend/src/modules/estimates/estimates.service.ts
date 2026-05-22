import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { EstimateStatus, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { CreateEstimateDto, CreateEstimateItemDto } from './dto/create-estimate.dto'
import { UpdateEstimateDto, UpdateEstimateStatusDto } from './dto/update-estimate.dto'
import { PaginationDto } from '../../common/dto/pagination.dto'

const ITEM_SELECT = {
  id: true,
  name: true,
  description: true,
  quantity: true,
  unit: true,
  unitPrice: true,
  totalPrice: true,
  sortOrder: true,
  subQuotationId: true,
} satisfies Prisma.EstimateItemSelect

const ESTIMATE_SELECT = {
  id: true,
  code: true,
  title: true,
  description: true,
  status: true,
  totalAmount: true,
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
    select: { id: true, installmentNo: true, description: true, percentage: true, amount: true },
    orderBy: { installmentNo: 'asc' as const },
  },
} satisfies Prisma.EstimateSelect

const STATUS_TRANSITIONS: Partial<Record<EstimateStatus, EstimateStatus[]>> = {
  DRAFT: ['SENT'],
  SENT: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['DRAFT'],
}

@Injectable()
export class EstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private calcTotal(items: CreateEstimateItemDto[]) {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity ?? '1')
      const price = parseFloat(item.unitPrice)
      return sum + qty * price
    }, 0)
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
        totalAmount: totalAmount.toString(),
        items: {
          create: items.map((item, idx) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity ?? '1',
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: (parseFloat(item.quantity ?? '1') * parseFloat(item.unitPrice)).toString(),
            sortOrder: item.sortOrder ?? idx,
          })),
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
          ...(totalAmount !== undefined && { totalAmount: totalAmount.toString() }),
          ...(items && {
            items: {
              create: items.map((item, idx) => ({
                name: item.name,
                description: item.description,
                quantity: item.quantity ?? '1',
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalPrice: (
                  parseFloat(item.quantity ?? '1') * parseFloat(item.unitPrice)
                ).toString(),
                sortOrder: item.sortOrder ?? idx,
              })),
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

    const totalPrice = parseFloat(dto.quantity ?? '1') * parseFloat(dto.unitPrice)
    const maxOrder = await this.prisma.estimateItem.count({ where: { estimateId } })

    const item = await this.prisma.estimateItem.create({
      data: {
        estimateId,
        name: dto.name,
        description: dto.description,
        quantity: dto.quantity ?? '1',
        unit: dto.unit,
        unitPrice: dto.unitPrice,
        totalPrice: totalPrice.toString(),
        sortOrder: dto.sortOrder ?? maxOrder,
        ...(dto.subQuotationId ? { subQuotationId: dto.subQuotationId } : {}),
      },
      select: ITEM_SELECT,
    })

    await this.recalcTotal(estimateId)
    return item
  }

  async updateItem(estimateId: number, itemId: number, dto: Partial<CreateEstimateItemDto>) {
    const estimate = await this.findOne(estimateId)
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('แก้ไขรายการได้เฉพาะใบประเมินสถานะ DRAFT')
    }

    const item = await this.prisma.estimateItem.findFirst({ where: { id: itemId, estimateId } })
    if (!item) throw new NotFoundException('ไม่พบรายการ')

    const qty = dto.quantity ?? item.quantity.toString()
    const price = dto.unitPrice ?? item.unitPrice.toString()
    const totalPrice = parseFloat(qty) * parseFloat(price)

    const updated = await this.prisma.estimateItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        description: dto.description,
        quantity: dto.quantity,
        unit: dto.unit,
        unitPrice: dto.unitPrice,
        totalPrice: totalPrice.toString(),
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

  async upsertInstallments(
    estimateId: number,
    installments: {
      installmentNo: number
      description: string
      percentage: string
      amount: string
    }[],
  ) {
    await this.findOne(estimateId)
    await this.prisma.estimateInstallment.deleteMany({ where: { estimateId } })
    if (installments.length) {
      await this.prisma.estimateInstallment.createMany({
        data: installments.map((inst) => ({
          estimateId,
          installmentNo: inst.installmentNo,
          description: inst.description,
          percentage: inst.percentage,
          amount: inst.amount,
        })),
      })
    }
    return this.findOne(estimateId)
  }

  private async recalcTotal(estimateId: number) {
    const items = await this.prisma.estimateItem.findMany({
      where: { estimateId },
      select: { totalPrice: true },
    })
    const total = items.reduce((sum, i) => sum + parseFloat(i.totalPrice.toString()), 0)
    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: { totalAmount: total.toString() },
    })
  }
}
