import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateDailyUpdateDto, UpdateDailyUpdateDto } from './dto/daily-update.dto'

const UPDATE_SELECT = {
  id: true,
  updateDate: true,
  title: true,
  workDone: true,
  nextPlan: true,
  problem: true,
  progress: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { files: true, comments: true } },
} satisfies Prisma.DailyUpdateSelect

@Injectable()
export class DailyUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateDailyUpdateDto, actorId: number) {
    const update = await this.prisma.dailyUpdate.create({
      data: {
        projectId: dto.projectId,
        createdById: actorId,
        updateDate: new Date(dto.updateDate),
        title: dto.title,
        workDone: dto.workDone,
        nextPlan: dto.nextPlan,
        problem: dto.problem,
        progress: dto.progress ?? 0,
      },
      select: UPDATE_SELECT,
    })

    return update
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.DailyUpdateWhereInput = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.dailyUpdate.findMany({
        where,
        select: UPDATE_SELECT,
        orderBy: { updateDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.dailyUpdate.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const update = await this.prisma.dailyUpdate.findFirst({
      where: { id, deletedAt: null },
      select: UPDATE_SELECT,
    })
    if (!update) throw new NotFoundException('ไม่พบอัปเดตรายวัน')
    return update
  }

  async update(id: number, dto: UpdateDailyUpdateDto, actorId: number) {
    const existing = await this.findOne(id)
    if (existing.status === 'PUBLISHED') {
      throw new BadRequestException('ไม่สามารถแก้ไข update ที่เผยแพร่แล้ว')
    }

    return this.prisma.dailyUpdate.update({
      where: { id },
      data: {
        title: dto.title,
        workDone: dto.workDone,
        nextPlan: dto.nextPlan,
        problem: dto.problem,
        progress: dto.progress,
      },
      select: UPDATE_SELECT,
    })
  }

  async publish(id: number, actorId: number) {
    const existing = await this.findOne(id)
    if (existing.status === 'PUBLISHED') {
      throw new BadRequestException('เผยแพร่แล้ว')
    }

    const update = await this.prisma.dailyUpdate.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      select: UPDATE_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'daily.published',
      targetType: 'DailyUpdate',
      targetId: id,
    })

    return update
  }
}
