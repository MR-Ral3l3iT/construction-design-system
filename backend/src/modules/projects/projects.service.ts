import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProjectStatus, ProjectType } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { generateCode } from '../../common/utils/code-generator.util'
import { PrismaService } from '../../database/prisma.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { FilterProjectDto } from './dto/filter-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import {
  AddProjectMemberDto,
  UpdateProjectProgressDto,
  UpdateProjectStatusDto,
} from './dto/update-project-status.dto'

const PROJECT_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  status: true,
  addressLine: true,
  province: true,
  district: true,
  subdistrict: true,
  postcode: true,
  latitude: true,
  longitude: true,
  areaSize: true,
  description: true,
  budgetMin: true,
  budgetMax: true,
  startDate: true,
  endDate: true,
  designStartDate: true,
  designEndDate: true,
  progress: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, companyName: true, phone: true } },
  members: {
    select: {
      id: true,
      roleName: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  _count: {
    select: { estimates: true, designTasks: true, boqs: true, issues: true },
  },
} satisfies Prisma.ProjectSelect

const PROJECT_LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  status: true,
  progress: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  customer: { select: { id: true, name: true, companyName: true } },
  _count: { select: { members: true, issues: true, designTasks: true } },
  plan: {
    select: {
      id: true,
      templateType: true,
      phases: {
        select: {
          tasks: {
            where: { deletedAt: null },
            select: { status: true, progress: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

function getProjectCodePrefix(type: ProjectType): 'DS' | 'CN' | 'DC' {
  if (type === ProjectType.DESIGN_ONLY) return 'DS'
  if (type === ProjectType.CONSTRUCTION) return 'CN'
  return 'DC'
}

// Valid status transitions based on actual ProjectStatus enum
const STATUS_TRANSITIONS: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
  LEAD: ['ESTIMATING'],
  ESTIMATING: ['DESIGNING', 'LEAD'],
  DESIGNING: ['WAITING_APPROVAL', 'ESTIMATING'],
  WAITING_APPROVAL: ['BOQ', 'DESIGNING'],
  BOQ: ['CONTRACT', 'DESIGNING'],
  CONTRACT: ['CONSTRUCTION', 'BOQ'],
  CONSTRUCTION: ['HANDOVER', 'CANCELLED'],
  HANDOVER: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateProjectDto, actorId: number) {
    const prefix = getProjectCodePrefix(dto.type)
    const code = await this.prisma.$transaction(async (tx) =>
      generateCode(tx as unknown as PrismaService, prefix),
    )

    const project = await this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        customerId: dto.customerId,
        budgetMin: dto.budgetMin ?? undefined,
        budgetMax: dto.budgetMax ?? undefined,
        addressLine: dto.addressLine,
        province: dto.province,
        district: dto.district,
        subdistrict: dto.subdistrict,
        postcode: dto.postcode,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        areaSize: dto.areaSize ?? undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        designStartDate: dto.designStartDate ? new Date(dto.designStartDate) : undefined,
        designEndDate: dto.designEndDate ? new Date(dto.designEndDate) : undefined,
      },
      select: PROJECT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.created',
      targetType: 'Project',
      targetId: project.id,
      metadata: { code: project.code, name: project.name },
    })

    return project
  }

  async findAll(filter: FilterProjectDto) {
    const {
      page,
      pageSize,
      search,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    }

    const [raw, totalItems] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: PROJECT_LIST_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      this.prisma.project.count({ where }),
    ])

    const data = raw.map((p) => {
      if (!p.plan) return { ...p, plan: null }
      const allTasks = p.plan.phases.flatMap((ph) => ph.tasks)
      const planProgress =
        allTasks.length > 0
          ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)
          : 0
      const planTaskCounts = {
        total: allTasks.length,
        completed: allTasks.filter((t) => t.status === 'COMPLETED').length,
        inProgress: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
        blocked: allTasks.filter((t) => t.status === 'BLOCKED').length,
      }
      return {
        ...p,
        plan: {
          id: p.plan.id,
          templateType: p.plan.templateType,
          progress: planProgress,
          taskCounts: planTaskCounts,
        },
      }
    })

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: PROJECT_SELECT,
    })

    if (!project) throw new NotFoundException('ไม่พบโครงการ')
    return project
  }

  async update(id: number, dto: UpdateProjectDto, actorId: number) {
    await this.findOne(id)

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        customerId: dto.customerId,
        budgetMin: dto.budgetMin ?? undefined,
        budgetMax: dto.budgetMax ?? undefined,
        addressLine: dto.addressLine,
        province: dto.province,
        district: dto.district,
        subdistrict: dto.subdistrict,
        postcode: dto.postcode,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        areaSize: dto.areaSize ?? undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        designStartDate: dto.designStartDate ? new Date(dto.designStartDate) : undefined,
        designEndDate: dto.designEndDate ? new Date(dto.designEndDate) : undefined,
      },
      select: PROJECT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.updated',
      targetType: 'Project',
      targetId: id,
    })

    return project
  }

  async updateStatus(id: number, dto: UpdateProjectStatusDto, actorId: number) {
    const project = await this.findOne(id)
    const currentStatus = project.status as ProjectStatus
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${dto.status} ได้`,
      )
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: dto.status },
      select: PROJECT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.status_changed',
      targetType: 'Project',
      targetId: id,
      metadata: { from: currentStatus, to: dto.status },
    })

    return updated
  }

  async updateProgress(id: number, dto: UpdateProjectProgressDto, actorId: number) {
    await this.findOne(id)

    // ถ้าโครงการมีแผนงาน ห้ามแก้ % เอง — ให้ใช้ค่าจาก task แทน
    const hasPlan = await this.prisma.projectPlan.findFirst({ where: { projectId: id } })
    if (hasPlan) {
      const phases = await this.prisma.projectPlanPhase.findMany({
        where: { planId: hasPlan.id },
        select: { tasks: { where: { deletedAt: null }, select: { progress: true } } },
      })
      const tasks = phases.flatMap((ph) => ph.tasks)
      dto.progress =
        tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: { progress: dto.progress },
      select: PROJECT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.progress_updated',
      targetType: 'Project',
      targetId: id,
      metadata: { progress: dto.progress },
    })

    return project
  }

  async addMember(id: number, dto: AddProjectMemberDto, actorId: number) {
    await this.findOne(id)

    const existing = await this.prisma.projectMember.findFirst({
      where: { projectId: id, userId: dto.userId },
    })

    if (existing) throw new ConflictException('ผู้ใช้นี้เป็นสมาชิกโครงการอยู่แล้ว')

    await this.prisma.projectMember.create({
      data: { projectId: id, userId: dto.userId, roleName: dto.role },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.member_added',
      targetType: 'Project',
      targetId: id,
      metadata: { memberId: dto.userId },
    })

    return this.findOne(id)
  }

  async removeMember(projectId: number, memberId: number, actorId: number) {
    await this.findOne(projectId)

    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    })

    if (!member) throw new NotFoundException('ไม่พบสมาชิกในโครงการ')

    await this.prisma.projectMember.delete({ where: { id: memberId } })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.member_removed',
      targetType: 'Project',
      targetId: projectId,
      metadata: { memberId: member.userId },
    })
  }

  async remove(id: number, actorId: number) {
    await this.findOne(id)

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project.deleted',
      targetType: 'Project',
      targetId: id,
    })
  }

  async overview() {
    const [total, byStatus, byType] = await Promise.all([
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.project.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
    ])

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
    }
  }
}
