import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { BOQStatus, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { generateCode } from '../../common/utils/code-generator.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  CreateBOQCategoryDto,
  CreateBOQDto,
  CreateBOQItemDto,
  CreateBOQSubCategoryDto,
  UpdateBOQCategoryDto,
  UpdateBOQDto,
  UpdateBOQStatusDto,
  UpdateBOQSubCategoryDto,
} from './dto/boq.dto'

const BOQ_SELECT = {
  id: true,
  code: true,
  title: true,
  status: true,
  version: true,
  isLocked: true,
  materialCost: true,
  laborCost: true,
  overheadCost: true,
  profit: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: { id: true, code: true, name: true, customer: { select: { name: true, phone: true } } },
  },
  designTask: { select: { id: true, title: true, revisionNo: true, status: true } },
  categories: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      subCategories: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          items: {
            orderBy: { sortOrder: 'asc' as const },
            select: {
              id: true,
              name: true,
              description: true,
              remark: true,
              quantity: true,
              unit: true,
              materialPrice: true,
              laborPrice: true,
              totalPrice: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BOQSelect

const STATUS_TRANSITIONS: Partial<Record<BOQStatus, BOQStatus[]>> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'DRAFT'],
  APPROVED: ['LOCKED', 'DRAFT'],
  LOCKED: [],
}

@Injectable()
export class BOQService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private calcItemTotal(item: CreateBOQItemDto) {
    const qty = parseFloat(item.quantity ?? '1')
    const mat = parseFloat(item.materialPrice ?? '0')
    const lab = parseFloat(item.laborPrice ?? '0')
    return qty * (mat + lab)
  }

  async create(dto: CreateBOQDto, actorId: number) {
    const code = await this.prisma.$transaction(async (tx) =>
      generateCode(tx as unknown as PrismaService, 'BOQ'),
    )

    const overhead = parseFloat(dto.overheadCost ?? '0')
    const profit = parseFloat(dto.profit ?? '0')

    const boq = await this.prisma.bOQ.create({
      data: {
        code,
        title: dto.title,
        projectId: dto.projectId,
        ...(dto.designTaskId && { designTaskId: dto.designTaskId }),
        overheadCost: overhead.toString(),
        profit: profit.toString(),
      },
      select: BOQ_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'boq.created',
      targetType: 'BOQ',
      targetId: boq.id,
      metadata: { code: boq.code },
    })

    return boq
  }

  async getProjectSummaries() {
    const boqs = await this.prisma.bOQ.findMany({
      where: { deletedAt: null },
      select: {
        projectId: true,
        totalAmount: true,
        materialCost: true,
        laborCost: true,
        _count: { select: { categories: true } },
      },
    })

    const map = new Map<
      number,
      {
        boqCount: number
        categoryCount: number
        totalAmount: number
        materialCost: number
        laborCost: number
      }
    >()
    for (const boq of boqs) {
      const prev = map.get(boq.projectId) ?? {
        boqCount: 0,
        categoryCount: 0,
        totalAmount: 0,
        materialCost: 0,
        laborCost: 0,
      }
      map.set(boq.projectId, {
        boqCount: prev.boqCount + 1,
        categoryCount: prev.categoryCount + boq._count.categories,
        totalAmount: prev.totalAmount + Number(boq.totalAmount),
        materialCost: prev.materialCost + Number(boq.materialCost),
        laborCost: prev.laborCost + Number(boq.laborCost),
      })
    }

    return Array.from(map.entries()).map(([projectId, stats]) => ({ projectId, ...stats }))
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.BOQWhereInput = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.bOQ.findMany({
        where,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          version: true,
          isLocked: true,
          totalAmount: true,
          materialCost: true,
          laborCost: true,
          createdAt: true,
          designTask: { select: { id: true, title: true, revisionNo: true } },
        },
        orderBy: { version: 'desc' },
        skip,
        take,
      }),
      this.prisma.bOQ.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const boq = await this.prisma.bOQ.findFirst({
      where: { id, deletedAt: null },
      select: BOQ_SELECT,
    })
    if (!boq) throw new NotFoundException('ไม่พบ BOQ')
    return boq
  }

  async update(id: number, dto: UpdateBOQDto, actorId: number) {
    const boq = await this.findOne(id)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว ไม่สามารถแก้ไขได้')

    await this.prisma.bOQ.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.overheadCost !== undefined && { overheadCost: dto.overheadCost }),
        ...(dto.profit !== undefined && { profit: dto.profit }),
      },
    })

    if (dto.overheadCost !== undefined || dto.profit !== undefined) {
      await this.recalcTotal(id)
    }

    await this.activityLog.write({
      userId: actorId,
      action: 'boq.updated',
      targetType: 'BOQ',
      targetId: id,
    })

    return this.findOne(id)
  }

  async updateStatus(id: number, dto: UpdateBOQStatusDto, actorId: number) {
    const boq = await this.findOne(id)
    const currentStatus = boq.status as BOQStatus
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${dto.status} ได้`,
      )
    }

    if (currentStatus === 'APPROVED' && dto.status === 'DRAFT') {
      const acceptedCount = await this.prisma.quotation.count({
        where: { boqId: id, status: 'ACCEPTED', deletedAt: null },
      })
      if (acceptedCount > 0) {
        throw new BadRequestException(
          'ไม่สามารถกลับแก้ไข BOQ ได้ เพราะมีใบเสนอราคาที่ลูกค้าตอบรับแล้ว',
        )
      }
    }

    const updated = await this.prisma.bOQ.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'LOCKED' && { isLocked: true }),
      },
      select: BOQ_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'boq.status_changed',
      targetType: 'BOQ',
      targetId: id,
      metadata: { from: currentStatus, to: dto.status },
    })

    return updated
  }

  // ─── Category (หมวดงานใหญ่) ─────────────────────────────────────────────────

  async addCategory(boqId: number, dto: CreateBOQCategoryDto, actorId: number) {
    const boq = await this.findOne(boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    const count = await this.prisma.bOQCategory.count({ where: { boqId } })

    return this.prisma.bOQCategory.create({
      data: {
        boqId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? count,
      },
      select: { id: true, name: true, sortOrder: true, subCategories: true },
    })
  }

  async updateCategory(categoryId: number, dto: UpdateBOQCategoryDto) {
    const category = await this.prisma.bOQCategory.findUnique({
      where: { id: categoryId },
      select: { boqId: true },
    })
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่ BOQ')

    const boq = await this.findOne(category.boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    return this.prisma.bOQCategory.update({
      where: { id: categoryId },
      data: { ...(dto.name && { name: dto.name }) },
      select: { id: true, name: true, sortOrder: true },
    })
  }

  async deleteCategory(categoryId: number) {
    const category = await this.prisma.bOQCategory.findUnique({
      where: { id: categoryId },
      select: { boqId: true },
    })
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่ BOQ')

    const boq = await this.findOne(category.boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    await this.prisma.bOQCategory.delete({ where: { id: categoryId } })
    await this.recalcTotal(category.boqId)
    return { success: true }
  }

  // ─── SubCategory (หัวข้อย่อย) ────────────────────────────────────────────────

  async addSubCategory(categoryId: number, dto: CreateBOQSubCategoryDto) {
    const category = await this.prisma.bOQCategory.findUnique({
      where: { id: categoryId },
      select: { boqId: true },
    })
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่ BOQ')

    const boq = await this.findOne(category.boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    const count = await this.prisma.bOQSubCategory.count({ where: { categoryId } })

    return this.prisma.bOQSubCategory.create({
      data: {
        categoryId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? count,
      },
      select: { id: true, name: true, sortOrder: true },
    })
  }

  async updateSubCategory(subCategoryId: number, dto: UpdateBOQSubCategoryDto) {
    const sub = await this.prisma.bOQSubCategory.findUnique({
      where: { id: subCategoryId },
      select: { category: { select: { boqId: true } } },
    })
    if (!sub) throw new NotFoundException('ไม่พบหัวข้อย่อย')

    const boq = await this.findOne(sub.category.boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    return this.prisma.bOQSubCategory.update({
      where: { id: subCategoryId },
      data: { ...(dto.name && { name: dto.name }) },
      select: { id: true, name: true, sortOrder: true },
    })
  }

  async deleteSubCategory(subCategoryId: number) {
    const sub = await this.prisma.bOQSubCategory.findUnique({
      where: { id: subCategoryId },
      select: { category: { select: { boqId: true } } },
    })
    if (!sub) throw new NotFoundException('ไม่พบหัวข้อย่อย')

    const boq = await this.findOne(sub.category.boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    await this.prisma.bOQSubCategory.delete({ where: { id: subCategoryId } })
    await this.recalcTotal(sub.category.boqId)
    return { success: true }
  }

  // ─── Item (รายการย่อย) ────────────────────────────────────────────────────────

  async addItem(subCategoryId: number, dto: CreateBOQItemDto) {
    const sub = await this.prisma.bOQSubCategory.findUnique({
      where: { id: subCategoryId },
      select: { category: { select: { boqId: true } } },
    })
    if (!sub) throw new NotFoundException('ไม่พบหัวข้อย่อย')

    const boq = await this.findOne(sub.category.boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    const count = await this.prisma.bOQItem.count({ where: { subCategoryId } })
    const item = await this.prisma.bOQItem.create({
      data: {
        subCategoryId,
        name: dto.name,
        description: dto.description,
        remark: dto.remark,
        quantity: dto.quantity ?? '1',
        unit: dto.unit,
        materialPrice: dto.materialPrice ?? '0',
        laborPrice: dto.laborPrice ?? '0',
        totalPrice: this.calcItemTotal(dto).toString(),
        sortOrder: dto.sortOrder ?? count,
      },
    })

    await this.recalcTotal(sub.category.boqId)
    return item
  }

  async updateItem(itemId: number, dto: CreateBOQItemDto) {
    const item = await this.prisma.bOQItem.findUnique({
      where: { id: itemId },
      select: { subCategory: { select: { category: { select: { boqId: true } } } } },
    })
    if (!item) throw new NotFoundException('ไม่พบรายการ')

    const boqId = item.subCategory.category.boqId
    const boq = await this.findOne(boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    const updated = await this.prisma.bOQItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        description: dto.description,
        remark: dto.remark,
        quantity: dto.quantity ?? '1',
        unit: dto.unit,
        materialPrice: dto.materialPrice ?? '0',
        laborPrice: dto.laborPrice ?? '0',
        totalPrice: this.calcItemTotal(dto).toString(),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    })

    await this.recalcTotal(boqId)
    return updated
  }

  async removeItem(itemId: number) {
    const item = await this.prisma.bOQItem.findUnique({
      where: { id: itemId },
      select: { subCategory: { select: { category: { select: { boqId: true } } } } },
    })
    if (!item) throw new NotFoundException('ไม่พบรายการ')

    const boqId = item.subCategory.category.boqId
    const boq = await this.findOne(boqId)
    if (boq.isLocked) throw new BadRequestException('BOQ ถูก lock แล้ว')

    await this.prisma.bOQItem.delete({ where: { id: itemId } })
    await this.recalcTotal(boqId)
    return { success: true }
  }

  private async recalcTotal(boqId: number) {
    const categories = await this.prisma.bOQCategory.findMany({
      where: { boqId },
      include: {
        subCategories: {
          include: {
            items: { select: { materialPrice: true, laborPrice: true, quantity: true } },
          },
        },
      },
    })

    let materialCost = 0
    let laborCost = 0

    for (const cat of categories) {
      for (const sub of cat.subCategories) {
        for (const item of sub.items) {
          const qty = parseFloat(item.quantity.toString())
          materialCost += qty * parseFloat(item.materialPrice.toString())
          laborCost += qty * parseFloat(item.laborPrice.toString())
        }
      }
    }

    const boq = await this.prisma.bOQ.findUnique({
      where: { id: boqId },
      select: { overheadCost: true, profit: true },
    })

    const overhead = parseFloat(boq!.overheadCost.toString())
    const profit = parseFloat(boq!.profit.toString())
    const totalAmount = materialCost + laborCost + overhead + profit

    await this.prisma.bOQ.update({
      where: { id: boqId },
      data: {
        materialCost: materialCost.toString(),
        laborCost: laborCost.toString(),
        totalAmount: totalAmount.toString(),
      },
    })
  }
}
