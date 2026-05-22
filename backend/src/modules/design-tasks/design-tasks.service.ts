import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { DesignTaskStatus, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateDesignTaskDto, UpdateDesignTaskStatusDto } from './dto/create-design-task.dto'

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  revisionNo: true,
  startDate: true,
  dueDate: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, name: true } },
  _count: { select: { files: true, comments: true } },
} satisfies Prisma.DesignTaskSelect

const STATUS_TRANSITIONS: Partial<Record<DesignTaskStatus, DesignTaskStatus[]>> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['WAITING_REVIEW', 'TODO'],
  WAITING_REVIEW: ['APPROVED', 'REVISION'],
  REVISION: ['IN_PROGRESS'],
  APPROVED: [],
  CANCELLED: [],
}

@Injectable()
export class DesignTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateDesignTaskDto, actorId: number) {
    const task = await this.prisma.designTask.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: TASK_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'design.created',
      targetType: 'DesignTask',
      targetId: task.id,
    })

    return task
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.DesignTaskWhereInput = { projectId }

    const [data, totalItems] = await Promise.all([
      this.prisma.designTask.findMany({
        where,
        select: TASK_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.designTask.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const task = await this.prisma.designTask.findUnique({
      where: { id },
      select: TASK_SELECT,
    })
    if (!task) throw new NotFoundException('ไม่พบงานออกแบบ')
    return task
  }

  async update(id: number, dto: Partial<CreateDesignTaskDto>, actorId: number) {
    await this.findOne(id)

    const task = await this.prisma.designTask.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: TASK_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'design.updated',
      targetType: 'DesignTask',
      targetId: id,
    })

    return task
  }

  async getTaskSummary() {
    const rows = await this.prisma.designTask.groupBy({
      by: ['projectId', 'status'],
      _count: { id: true },
    })
    // Group into { [projectId]: { [status]: count } }
    const map: Record<number, Record<string, number>> = {}
    for (const row of rows) {
      if (!map[row.projectId]) map[row.projectId] = {}
      map[row.projectId][row.status] = row._count.id
    }
    return map
  }

  async remove(id: number) {
    await this.findOne(id)
    await this.prisma.designTask.delete({ where: { id } })
  }

  async updateStatus(id: number, dto: UpdateDesignTaskStatusDto, actorId: number) {
    const task = await this.findOne(id)
    const currentStatus = task.status as DesignTaskStatus
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${dto.status} ได้`,
      )
    }

    const updateData: Prisma.DesignTaskUpdateInput = { status: dto.status }
    if (dto.status === 'APPROVED') updateData.approvedAt = new Date()
    if (dto.status === 'REVISION' || dto.status === 'WAITING_REVIEW') {
      if (dto.status === 'REVISION') updateData.revisionNo = { increment: 1 }
    }

    const updated = await this.prisma.designTask.update({
      where: { id },
      data: updateData,
      select: TASK_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'design.status_changed',
      targetType: 'DesignTask',
      targetId: id,
      metadata: { from: currentStatus, to: dto.status },
    })

    return updated
  }
}
