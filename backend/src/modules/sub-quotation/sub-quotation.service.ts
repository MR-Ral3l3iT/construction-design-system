import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateSubQuotationDto, UpdateSubQuotationDto } from './dto/sub-quotation.dto'

function zeroPad(n: number, len = 3) {
  return String(n).padStart(len, '0')
}

@Injectable()
export class SubQuotationService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.prisma.subQuotation.count({
      where: { code: { startsWith: `SQ-${year}-` } },
    })
    return `SQ-${year}-${zeroPad(count + 1)}`
  }

  private async assertBudget(quotationId: number, amount: number, excludeId?: number) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { totalAmount: true },
    })
    if (!quotation) throw new NotFoundException('ไม่พบใบเสนอราคา')

    const used = await this.prisma.subQuotation.aggregate({
      where: {
        quotationId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _sum: { amount: true },
    })

    const usedAmount = Number(used._sum.amount ?? 0)
    const remaining = Number(quotation.totalAmount) - usedAmount

    if (amount > remaining) {
      throw new BadRequestException(
        `ยอดเกินงบที่เหลือ (เหลือ ${remaining.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท จากทั้งหมด ${Number(quotation.totalAmount).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท)`,
      )
    }
  }

  async findOne(id: number) {
    const sq = await this.prisma.subQuotation.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        amount: true,
        sortOrder: true,
        createdAt: true,
        paymentMilestones: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true, amount: true, dueDate: true },
        },
        quotation: {
          select: {
            id: true,
            code: true,
            title: true,
            totalAmount: true,
            boqId: true,
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
          },
        },
      },
    })
    if (!sq) throw new NotFoundException('ไม่พบใบเสนอราคาย่อย')
    return sq
  }

  async findByQuotation(quotationId: number) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { id: true, code: true, title: true, totalAmount: true, boqId: true },
    })
    if (!quotation) throw new NotFoundException('ไม่พบใบเสนอราคา')

    const items = await this.prisma.subQuotation.findMany({
      where: { quotationId, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        amount: true,
        sortOrder: true,
        createdAt: true,
        paymentMilestones: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true, amount: true },
        },
        estimateItems: {
          select: {
            id: true,
            estimate: { select: { id: true, status: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    const totalUsed = items.reduce((s, i) => s + Number(i.amount), 0)
    const remaining = Number(quotation.totalAmount) - totalUsed

    return {
      quotation: { ...quotation, totalAmount: Number(quotation.totalAmount) },
      items,
      summary: {
        totalAmount: Number(quotation.totalAmount),
        usedAmount: totalUsed,
        remainingAmount: remaining,
      },
    }
  }

  async create(dto: CreateSubQuotationDto) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: dto.quotationId },
      select: { id: true, boqId: true, status: true },
    })
    if (!quotation) throw new NotFoundException('ไม่พบใบเสนอราคา')
    if (!quotation.boqId)
      throw new BadRequestException(
        'สามารถสร้างใบเสนอราคาย่อยได้เฉพาะจากใบเสนอราคาที่มี BOQ เท่านั้น',
      )
    if (quotation.status !== 'ACCEPTED')
      throw new BadRequestException(
        'สามารถสร้างใบเสนอราคาย่อยได้เฉพาะใบเสนอราคาที่ได้รับการอนุมัติแล้วเท่านั้น',
      )

    await this.assertBudget(dto.quotationId, Number(dto.amount))

    const code = await this.generateCode()
    return this.prisma.subQuotation.create({
      data: {
        code,
        quotationId: dto.quotationId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        amount: true,
        sortOrder: true,
        createdAt: true,
      },
    })
  }

  async update(id: number, dto: UpdateSubQuotationDto) {
    const sq = await this.prisma.subQuotation.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        quotationId: true,
        amount: true,
        estimateItems: {
          select: { id: true, estimate: { select: { status: true } } },
        },
      },
    })
    if (!sq) throw new NotFoundException('ไม่พบใบเสนอราคาย่อย')

    const blockedByEstimate = sq.estimateItems.some(
      (ei) => !['DRAFT', 'REJECTED'].includes(ei.estimate.status),
    )
    if (blockedByEstimate) {
      throw new BadRequestException(
        'ไม่สามารถแก้ไขได้ เพราะใบประเมินราคาที่เชื่อมอยู่ได้รับการอนุมัติแล้ว',
      )
    }

    if (dto.amount !== undefined) {
      await this.assertBudget(sq.quotationId, Number(dto.amount), id)
    }

    return this.prisma.subQuotation.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        sortOrder: dto.sortOrder,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        amount: true,
        sortOrder: true,
        createdAt: true,
      },
    })
  }

  async remove(id: number) {
    const sq = await this.prisma.subQuotation.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        estimateItems: {
          select: { id: true, estimate: { select: { status: true } } },
        },
      },
    })
    if (!sq) throw new NotFoundException('ไม่พบใบเสนอราคาย่อย')
    if (sq.estimateItems.length > 0) {
      throw new BadRequestException('ไม่สามารถลบได้ เพราะถูกนำเข้าในใบประเมินราคาแล้ว')
    }
    await this.prisma.subQuotation.update({ where: { id }, data: { deletedAt: new Date() } })
    return { success: true }
  }
}
