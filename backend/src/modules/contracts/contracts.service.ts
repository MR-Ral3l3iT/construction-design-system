import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ContractStatus, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { generateCode } from '../../common/utils/code-generator.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateContractDto, UpdateContractDto, UpdateContractStatusDto } from './dto/contract.dto'

const CONTRACT_SELECT = {
  id: true,
  code: true,
  title: true,
  status: true,
  totalAmount: true,
  contractDate: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, name: true } },
} satisfies Prisma.ContractSelect

const STATUS_TRANSITIONS: Partial<Record<ContractStatus, ContractStatus[]>> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateContractDto, actorId: number) {
    const code = await this.prisma.$transaction(async (tx) =>
      generateCode(tx as unknown as PrismaService, 'CON'),
    )

    const contract = await this.prisma.contract.create({
      data: {
        code,
        title: dto.title,
        projectId: dto.projectId,
        totalAmount: dto.totalAmount ?? '0',
        contractDate: dto.contractDate ? new Date(dto.contractDate) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      select: CONTRACT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'contract.created',
      targetType: 'Contract',
      targetId: contract.id,
      metadata: { code: contract.code },
    })

    return contract
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.ContractWhereInput = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        select: CONTRACT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.contract.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      select: CONTRACT_SELECT,
    })
    if (!contract) throw new NotFoundException('ไม่พบสัญญา')
    return contract
  }

  async update(id: number, dto: UpdateContractDto, actorId: number) {
    const contract = await this.findOne(id)
    if (contract.status !== 'DRAFT') {
      throw new BadRequestException('แก้ไขได้เฉพาะสัญญาสถานะ DRAFT')
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        title: dto.title,
        totalAmount: dto.totalAmount,
        contractDate: dto.contractDate ? new Date(dto.contractDate) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      select: CONTRACT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'contract.updated',
      targetType: 'Contract',
      targetId: id,
    })

    return updated
  }

  async updateStatus(id: number, dto: UpdateContractStatusDto, actorId: number) {
    const contract = await this.findOne(id)
    const currentStatus = contract.status as ContractStatus
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${dto.status} ได้`,
      )
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: dto.status },
      select: CONTRACT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'contract.status_changed',
      targetType: 'Contract',
      targetId: id,
      metadata: { from: currentStatus, to: dto.status },
    })

    return updated
  }
}
