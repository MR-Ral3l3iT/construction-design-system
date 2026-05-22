import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  CreatePaymentMilestoneDto,
  MarkPaidDto,
  UpdatePaymentMilestoneDto,
} from './dto/payment.dto'

const PAYMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  amount: true,
  dueDate: true,
  paidDate: true,
  status: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  quotation: { select: { id: true, code: true, title: true, boqId: true, totalAmount: true } },
  estimate: { select: { id: true, code: true, title: true } },
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
} satisfies Prisma.PaymentMilestoneSelect

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreatePaymentMilestoneDto, actorId: number) {
    const count = await this.prisma.paymentMilestone.count({
      where: { projectId: dto.projectId, deletedAt: null },
    })

    const payment = await this.prisma.paymentMilestone.create({
      data: {
        projectId: dto.projectId,
        quotationId: dto.quotationId ?? null,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        sortOrder: dto.sortOrder ?? count,
      },
      select: PAYMENT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'payment.created',
      targetType: 'PaymentMilestone',
      targetId: payment.id,
    })

    return payment
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.PaymentMilestoneWhereInput = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.paymentMilestone.findMany({
        where,
        select: PAYMENT_SELECT,
        orderBy: { sortOrder: 'asc' },
        skip,
        take,
      }),
      this.prisma.paymentMilestone.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const payment = await this.prisma.paymentMilestone.findFirst({
      where: { id, deletedAt: null },
      select: PAYMENT_SELECT,
    })
    if (!payment) throw new NotFoundException('ไม่พบงวดเงิน')
    return payment
  }

  async update(id: number, dto: UpdatePaymentMilestoneDto, actorId: number) {
    const payment = await this.findOne(id)
    if (payment.status === 'PAID') {
      throw new BadRequestException('ไม่สามารถแก้ไขงวดเงินที่จ่ายแล้ว')
    }

    const updated = await this.prisma.paymentMilestone.update({
      where: { id },
      data: {
        ...(dto.quotationId !== undefined && { quotationId: dto.quotationId }),
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        sortOrder: dto.sortOrder,
      },
      select: PAYMENT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'payment.updated',
      targetType: 'PaymentMilestone',
      targetId: id,
    })

    return updated
  }

  async markPaid(id: number, dto: MarkPaidDto, actorId: number) {
    const payment = await this.findOne(id)
    if (payment.status === 'PAID') {
      throw new BadRequestException('งวดเงินนี้จ่ายแล้ว')
    }

    const updated = await this.prisma.paymentMilestone.update({
      where: { id },
      data: {
        status: 'PAID',
        paidDate: dto.paidDate ? new Date(dto.paidDate) : new Date(),
      },
      select: PAYMENT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'payment.marked_paid',
      targetType: 'PaymentMilestone',
      targetId: id,
    })

    return updated
  }

  async summary(projectId: number) {
    const milestones = await this.prisma.paymentMilestone.findMany({
      where: { projectId, deletedAt: null },
      select: { amount: true, status: true },
    })

    const now = new Date()
    const total = milestones.reduce((s, m) => s + parseFloat(m.amount.toString()), 0)
    const paid = milestones
      .filter((m) => m.status === 'PAID')
      .reduce((s, m) => s + parseFloat(m.amount.toString()), 0)

    return {
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: total - paid,
      paidCount: milestones.filter((m) => m.status === 'PAID').length,
      totalCount: milestones.length,
    }
  }

  async importFromEstimate(projectId: number, estimateId: number, actorId: number) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, projectId, status: 'APPROVED' },
      select: {
        id: true,
        code: true,
        title: true,
        installments: {
          select: { installmentNo: true, description: true, amount: true, percentage: true },
          orderBy: { installmentNo: 'asc' },
        },
      },
    })

    if (!estimate) {
      throw new Error('ไม่พบใบเสนอราคาที่อนุมัติแล้วสำหรับโครงการนี้')
    }
    if (estimate.installments.length === 0) {
      throw new Error('ใบเสนอราคานี้ยังไม่มีการกำหนดรอบจ่ายเงิน')
    }

    await this.prisma.$transaction(async (tx) => {
      // ลบเฉพาะงวดเงินที่มาจาก estimate ใบนี้เดิม (ถ้า re-import)
      await tx.paymentMilestone.updateMany({
        where: { projectId, estimateId, deletedAt: null, status: 'UNPAID' },
        data: { deletedAt: new Date() },
      })

      await tx.paymentMilestone.createMany({
        data: estimate.installments.map((inst) => ({
          projectId,
          estimateId,
          title: `งวดที่ ${inst.installmentNo}: ${inst.description}`,
          description: `จากใบเสนอราคา ${estimate.code} (${inst.percentage}%)`,
          amount: inst.amount,
          sortOrder: inst.installmentNo,
        })),
      })
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'payment.imported_from_estimate',
      targetType: 'Project',
      targetId: projectId,
      metadata: { estimateId, estimateCode: estimate.code },
    })

    return this.findAllByProject(projectId, { page: 1, pageSize: 50 })
  }

  async findProjectsOverview(pagination: PaginationDto, search?: string) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { customer: { companyName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [projects, totalItems] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          customer: { select: { id: true, name: true, companyName: true } },
          payments: {
            where: { deletedAt: null },
            select: {
              id: true,
              title: true,
              amount: true,
              status: true,
              dueDate: true,
              paidDate: true,
              sortOrder: true,
              quotation: { select: { id: true, code: true, title: true, boqId: true } },
              estimate: { select: { id: true, code: true, title: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.project.count({ where }),
    ])

    const data = projects.map((p) => {
      const milestones = p.payments
      const totalAmount = milestones.reduce((s, m) => s + parseFloat(m.amount.toString()), 0)
      const paidAmount = milestones
        .filter((m) => m.status === 'PAID')
        .reduce((s, m) => s + parseFloat(m.amount.toString()), 0)
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        customer: p.customer,
        totalCount: milestones.length,
        paidCount: milestones.filter((m) => m.status === 'PAID').length,
        overdueCount: milestones.filter((m) => m.status === 'OVERDUE').length,
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        milestones: milestones.map((m) => ({
          id: m.id,
          title: m.title,
          amount: parseFloat(m.amount.toString()),
          status: m.status,
          dueDate: m.dueDate,
          paidDate: m.paidDate,
          sortOrder: m.sortOrder,
          quotation: m.quotation ?? null,
          estimate: m.estimate ?? null,
        })),
      }
    })

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async createFromSubQuotation(
    subQuotationId: number,
    dueDate: string | undefined,
    actorId: number,
  ) {
    const sq = await this.prisma.subQuotation.findFirst({
      where: { id: subQuotationId, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        amount: true,
        quotation: { select: { id: true, projectId: true } },
        paymentMilestones: { where: { deletedAt: null }, select: { id: true } },
      },
    })
    if (!sq) throw new NotFoundException('ไม่พบใบเสนอราคาย่อย')
    if (sq.paymentMilestones.length > 0) {
      throw new BadRequestException('มีงวดเงินสำหรับรายการนี้อยู่แล้ว')
    }

    const count = await this.prisma.paymentMilestone.count({
      where: { projectId: sq.quotation.projectId, deletedAt: null },
    })

    const payment = await this.prisma.paymentMilestone.create({
      data: {
        projectId: sq.quotation.projectId,
        quotationId: sq.quotation.id,
        subQuotationId: sq.id,
        title: sq.title,
        description: sq.description ?? undefined,
        amount: sq.amount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        sortOrder: count,
      },
      select: PAYMENT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'payment.created_from_sub_quotation',
      targetType: 'PaymentMilestone',
      targetId: payment.id,
      metadata: { subQuotationId, subQuotationCode: sq.code },
    })

    return payment
  }

  async checkOverdue() {
    const now = new Date()
    const { count } = await this.prisma.paymentMilestone.updateMany({
      where: {
        status: 'UNPAID',
        dueDate: { lt: now },
        deletedAt: null,
      },
      data: { status: 'OVERDUE' },
    })
    return { updated: count }
  }
}
