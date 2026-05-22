import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { CommentTargetType, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { ListCommentDto } from './dto/list-comment.dto'

const COMMENT_SELECT = {
  id: true,
  message: true,
  targetType: true,
  targetId: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, avatar: true } },
} satisfies Prisma.CommentSelect

// Maps targetType to the relation field to set
const TARGET_FIELD: Record<CommentTargetType, string> = {
  PROJECT: 'projectId',
  DESIGN_TASK: 'designTaskId',
  DAILY_UPDATE: 'dailyUpdateId',
  ISSUE: 'issueId',
  CHANGE_REQUEST: 'changeRequestId',
  BOQ: 'boqId',
  PAYMENT: 'paymentId',
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateCommentDto, userId: number) {
    const relField = TARGET_FIELD[dto.targetType]

    const comment = await this.prisma.comment.create({
      data: {
        message: dto.message,
        targetType: dto.targetType,
        targetId: dto.targetId,
        userId,
        projectId: dto.projectId,
        [relField]: dto.targetId,
      },
      select: COMMENT_SELECT,
    })

    this.activityLog.write({
      userId,
      action: 'comment.created',
      module: 'Comment',
      refId: comment.id,
      description: `Comment on ${dto.targetType}#${dto.targetId}`,
    })

    return comment
  }

  async findByTarget(dto: ListCommentDto) {
    return this.prisma.comment.findMany({
      where: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: COMMENT_SELECT,
    })
  }

  async update(id: number, dto: UpdateCommentDto, userId: number) {
    const existing = await this.prisma.comment.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundException('ไม่พบ comment')
    if (existing.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไข comment นี้')

    return this.prisma.comment.update({
      where: { id },
      data: { message: dto.message },
      select: COMMENT_SELECT,
    })
  }

  async remove(id: number, userId: number, isAdmin: boolean) {
    const existing = await this.prisma.comment.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundException('ไม่พบ comment')
    if (!isAdmin && existing.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์ลบ comment นี้')
    }

    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
