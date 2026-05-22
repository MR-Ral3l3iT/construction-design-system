import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { CreateApprovalDto } from './dto/create-approval.dto'
import { DecideApprovalDto } from './dto/decide-approval.dto'

const APPROVAL_SELECT = {
  id: true,
  status: true,
  note: true,
  approvedAt: true,
  createdAt: true,
  projectId: true,
  designTaskId: true,
  boqId: true,
  changeRequestId: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.ApprovalSelect

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateApprovalDto, userId: number) {
    if (!dto.designTaskId && !dto.boqId && !dto.changeRequestId) {
      throw new BadRequestException(
        'ต้องระบุ designTaskId, boqId หรือ changeRequestId อย่างน้อยหนึ่งอย่าง',
      )
    }

    const approval = await this.prisma.approval.create({
      data: {
        userId,
        projectId: dto.projectId,
        designTaskId: dto.designTaskId,
        boqId: dto.boqId,
        changeRequestId: dto.changeRequestId,
        note: dto.note,
      },
      select: APPROVAL_SELECT,
    })

    this.activityLog.write({
      userId,
      action: 'approval.requested',
      module: 'Approval',
      refId: approval.id,
      description: `Approval request created`,
    })

    return approval
  }

  async findByProject(projectId: number) {
    return this.prisma.approval.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: APPROVAL_SELECT,
    })
  }

  async findPending(projectId?: number) {
    return this.prisma.approval.findMany({
      where: {
        status: 'PENDING',
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: APPROVAL_SELECT,
    })
  }

  async approve(id: number, dto: DecideApprovalDto, userId: number) {
    const approval = await this.prisma.approval.findFirst({ where: { id } })
    if (!approval) throw new NotFoundException('ไม่พบ approval')
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Approval นี้ถูกดำเนินการไปแล้ว')
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        note: dto.note ?? approval.note,
      },
      select: APPROVAL_SELECT,
    })

    this.activityLog.write({
      userId,
      action: 'approval.approved',
      module: 'Approval',
      refId: id,
      description: dto.note,
    })

    return updated
  }

  async reject(id: number, dto: DecideApprovalDto, userId: number) {
    const approval = await this.prisma.approval.findFirst({ where: { id } })
    if (!approval) throw new NotFoundException('ไม่พบ approval')
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Approval นี้ถูกดำเนินการไปแล้ว')
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        note: dto.note ?? approval.note,
      },
      select: APPROVAL_SELECT,
    })

    this.activityLog.write({
      userId,
      action: 'approval.rejected',
      module: 'Approval',
      refId: id,
      description: dto.note,
    })

    return updated
  }
}
