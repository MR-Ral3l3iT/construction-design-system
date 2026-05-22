import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateIssueDto, UpdateIssueDto, UpdateIssueStatusDto } from './dto/issue.dto'

const ISSUE_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, name: true } },
  _count: { select: { files: true, comments: true } },
} satisfies Prisma.IssueSelect

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateIssueDto, actorId: number) {
    const issue = await this.prisma.issue.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: ISSUE_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'issue.created',
      targetType: 'Issue',
      targetId: issue.id,
    })

    return issue
  }

  async findAllByProject(projectId: number, pagination: PaginationDto) {
    const { page, pageSize } = pagination
    const { skip, take } = paginationSkipTake(page, pageSize)
    const where: Prisma.IssueWhereInput = { projectId, deletedAt: null }

    const [data, totalItems] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        select: ISSUE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.issue.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const issue = await this.prisma.issue.findFirst({
      where: { id, deletedAt: null },
      select: ISSUE_SELECT,
    })
    if (!issue) throw new NotFoundException('ไม่พบปัญหา')
    return issue
  }

  async update(id: number, dto: UpdateIssueDto, actorId: number) {
    await this.findOne(id)

    return this.prisma.issue.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: ISSUE_SELECT,
    })
  }

  async updateStatus(id: number, dto: UpdateIssueStatusDto, actorId: number) {
    await this.findOne(id)

    const updated = await this.prisma.issue.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
      select: ISSUE_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'issue.status_changed',
      targetType: 'Issue',
      targetId: id,
      metadata: { status: dto.status },
    })

    return updated
  }
}
