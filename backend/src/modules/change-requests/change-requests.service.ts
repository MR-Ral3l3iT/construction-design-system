import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ChangeRequestStatus, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  ApproveChangeRequestDto,
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
  UpdateChangeRequestStatusDto,
} from './dto/change-request.dto'

const CR_SELECT = {
  id: true,
  title: true,
  description: true,
  reason: true,
  status: true,
  estimatedAmount: true,
  approvedAmount: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, name: true } },
  _count: { select: { files: true, comments: true } },
} satisfies Prisma.ChangeRequestSelect

const STATUS_TRANSITIONS: Partial<Record<ChangeRequestStatus, ChangeRequestStatus[]>> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
}

@Injectable()
export class ChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateChangeRequestDto, actorId: number) {
    const cr = await this.prisma.changeRequest.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        reason: dto.reason,
        estimatedAmount: dto.estimatedAmount,
      },
      select: CR_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'change_request.created',
      targetType: 'ChangeRequest',
      targetId: cr.id,
    })

    return cr
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.ChangeRequestWhereInput = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.changeRequest.findMany({
        where,
        select: CR_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.changeRequest.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const cr = await this.prisma.changeRequest.findFirst({
      where: { id, deletedAt: null },
      select: CR_SELECT,
    })
    if (!cr) throw new NotFoundException('ไม่พบ Change Request')
    return cr
  }

  async update(id: number, dto: UpdateChangeRequestDto, actorId: number) {
    const cr = await this.findOne(id)
    if (cr.status !== 'REQUESTED') {
      throw new BadRequestException('แก้ไขได้เฉพาะ CR ที่รอการอนุมัติ')
    }

    return this.prisma.changeRequest.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        reason: dto.reason,
        estimatedAmount: dto.estimatedAmount,
      },
      select: CR_SELECT,
    })
  }

  async approve(id: number, dto: ApproveChangeRequestDto, actorId: number) {
    const cr = await this.findOne(id)
    if (cr.status !== 'REQUESTED') {
      throw new BadRequestException('อนุมัติได้เฉพาะ CR ที่สถานะ REQUESTED')
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAmount: dto.approvedAmount,
        approvedAt: new Date(),
      },
      select: CR_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'change_request.approved',
      targetType: 'ChangeRequest',
      targetId: id,
      metadata: { approvedAmount: dto.approvedAmount },
    })

    return updated
  }

  async updateStatus(id: number, dto: UpdateChangeRequestStatusDto, actorId: number) {
    const cr = await this.findOne(id)
    const currentStatus = cr.status as ChangeRequestStatus
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${dto.status} ได้`,
      )
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: { status: dto.status },
      select: CR_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'change_request.status_changed',
      targetType: 'ChangeRequest',
      targetId: id,
      metadata: { from: currentStatus, to: dto.status },
    })

    return updated
  }
}
