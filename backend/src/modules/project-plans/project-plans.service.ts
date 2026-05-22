import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import {
  CreateProjectPlanDto,
  UpdateProjectPlanTaskDto,
  AddTaskDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateTemplatePhaseDto,
  UpdateTemplatePhaseDto,
  CreateTemplateTaskDto,
  UpdateTemplateTaskDto,
} from './dto/project-plan.dto'

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  progress: true,
  startDate: true,
  endDate: true,
  sortOrder: true,
}

const PHASE_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  tasks: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
    select: TASK_SELECT,
  },
}

const PLAN_SELECT = {
  id: true,
  templateType: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, name: true } },
  phases: {
    orderBy: { sortOrder: 'asc' as const },
    select: PHASE_SELECT,
  },
}

@Injectable()
export class ProjectPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async getTemplates() {
    const templates = await this.prisma.projectPlanTemplate.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        phases: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            tasks: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                defaultDuration: true,
                sortOrder: true,
                isOptional: true,
              },
            },
          },
        },
      },
    })
    return templates
  }

  async createFromTemplate(dto: CreateProjectPlanDto, actorId: number) {
    const existing = await this.prisma.projectPlan.findUnique({
      where: { projectId: dto.projectId },
    })
    if (existing) throw new ConflictException('โครงการนี้มีแผนงานอยู่แล้ว')

    const template = await this.prisma.projectPlanTemplate.findUnique({
      where: { type: dto.templateType },
      include: {
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: {
            tasks: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })
    if (!template) throw new NotFoundException('ไม่พบ template')

    const plan = await this.prisma.projectPlan.create({
      data: {
        projectId: dto.projectId,
        templateType: dto.templateType as string,
        title: template.name,
        phases: {
          create: template.phases.map((phase) => ({
            name: phase.name,
            sortOrder: phase.sortOrder,
            tasks: {
              create: phase.tasks.map((task) => ({
                title: task.title,
                description: task.description ?? undefined,
                sortOrder: task.sortOrder,
              })),
            },
          })),
        },
      },
      select: PLAN_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'project_plan.created',
      targetType: 'ProjectPlan',
      targetId: plan.id,
      metadata: { templateType: dto.templateType },
    })

    return plan
  }

  async findByProject(projectId: number) {
    const plan = await this.prisma.projectPlan.findUnique({
      where: { projectId },
      select: PLAN_SELECT,
    })
    return plan
  }

  async findOne(id: number) {
    const plan = await this.prisma.projectPlan.findUnique({
      where: { id },
      select: PLAN_SELECT,
    })
    if (!plan) throw new NotFoundException('ไม่พบแผนงาน')
    return plan
  }

  private async syncProjectProgress(taskId: number) {
    const task = await this.prisma.projectPlanTask.findFirst({
      where: { id: taskId },
      select: {
        phase: {
          select: {
            plan: {
              select: {
                projectId: true,
                phases: {
                  select: { tasks: { where: { deletedAt: null }, select: { progress: true } } },
                },
              },
            },
          },
        },
      },
    })
    if (!task?.phase?.plan) return

    const { projectId, phases } = task.phase.plan
    const allTasks = phases.flatMap((ph) => ph.tasks)
    const avgProgress =
      allTasks.length > 0
        ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)
        : 0

    await this.prisma.project.update({ where: { id: projectId }, data: { progress: avgProgress } })
  }

  private async syncProjectProgressByPhase(phaseId: number) {
    const phase = await this.prisma.projectPlanPhase.findUnique({
      where: { id: phaseId },
      select: {
        plan: {
          select: {
            projectId: true,
            phases: {
              select: { tasks: { where: { deletedAt: null }, select: { progress: true } } },
            },
          },
        },
      },
    })
    if (!phase?.plan) return

    const { projectId, phases } = phase.plan
    const allTasks = phases.flatMap((ph) => ph.tasks)
    const avgProgress =
      allTasks.length > 0
        ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)
        : 0

    await this.prisma.project.update({ where: { id: projectId }, data: { progress: avgProgress } })
  }

  async updateTask(taskId: number, dto: UpdateProjectPlanTaskDto, actorId: number) {
    const task = await this.prisma.projectPlanTask.findFirst({
      where: { id: taskId, deletedAt: null },
    })
    if (!task) throw new NotFoundException('ไม่พบงาน')

    const updated = await this.prisma.projectPlanTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.status === 'COMPLETED'
          ? { progress: 100 }
          : dto.progress !== undefined && { progress: dto.progress }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      select: TASK_SELECT,
    })

    if (dto.status !== undefined) {
      await this.activityLog.write({
        userId: actorId,
        action: 'project_plan.task_status_changed',
        targetType: 'ProjectPlanTask',
        targetId: taskId,
        metadata: { status: dto.status },
      })
    }

    await this.syncProjectProgress(taskId)

    return updated
  }

  async addTaskToPhase(phaseId: number, dto: AddTaskDto) {
    const phase = await this.prisma.projectPlanPhase.findUnique({ where: { id: phaseId } })
    if (!phase) throw new NotFoundException('ไม่พบ phase')

    const count = await this.prisma.projectPlanTask.count({
      where: { phaseId, deletedAt: null },
    })

    const created = await this.prisma.projectPlanTask.create({
      data: {
        phaseId,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        sortOrder: dto.sortOrder ?? count,
      },
      select: TASK_SELECT,
    })

    await this.syncProjectProgressByPhase(phaseId)
    return created
  }

  async deleteTask(taskId: number) {
    const task = await this.prisma.projectPlanTask.findFirst({
      where: { id: taskId, deletedAt: null },
    })
    if (!task) throw new NotFoundException('ไม่พบงาน')

    const deleted = await this.prisma.projectPlanTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    })

    await this.syncProjectProgress(taskId)
    return deleted
  }

  async getProgress(planId: number) {
    const plan = await this.prisma.projectPlan.findUnique({
      where: { id: planId },
      select: {
        phases: {
          select: {
            tasks: {
              where: { deletedAt: null },
              select: { status: true, progress: true },
            },
          },
        },
      },
    })
    if (!plan) throw new NotFoundException('ไม่พบแผนงาน')

    const tasks = plan.phases.flatMap((p) => p.tasks)
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length
    const avgProgress =
      total > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0

    return { total, completed, avgProgress }
  }

  // ─── Template Management ────────────────────────────────────────────────────

  async createTemplate(dto: CreateTemplateDto) {
    const existing = await this.prisma.projectPlanTemplate.findUnique({ where: { type: dto.type } })
    if (existing) throw new ConflictException('ประเภท template นี้มีอยู่แล้ว')
    return this.prisma.projectPlanTemplate.create({
      data: { name: dto.name, type: dto.type },
      include: {
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: { tasks: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    })
  }

  async updateTemplate(id: number, dto: UpdateTemplateDto) {
    const tmpl = await this.prisma.projectPlanTemplate.findUnique({ where: { id } })
    if (!tmpl) throw new NotFoundException('ไม่พบ template')
    return this.prisma.projectPlanTemplate.update({
      where: { id },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
      include: {
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: { tasks: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    })
  }

  async deleteTemplate(id: number) {
    const tmpl = await this.prisma.projectPlanTemplate.findUnique({ where: { id } })
    if (!tmpl) throw new NotFoundException('ไม่พบ template')
    const usedCount = await this.prisma.projectPlan.count({ where: { templateType: tmpl.type } })
    if (usedCount > 0)
      throw new ConflictException(`template นี้ถูกใช้ใน ${usedCount} โครงการ ไม่สามารถลบได้`)
    await this.prisma.projectPlanTemplate.delete({ where: { id } })
    return { deleted: true }
  }

  async addTemplatePhase(templateId: number, dto: CreateTemplatePhaseDto) {
    const tmpl = await this.prisma.projectPlanTemplate.findUnique({ where: { id: templateId } })
    if (!tmpl) throw new NotFoundException('ไม่พบ template')
    const count = await this.prisma.projectPlanTemplatePhase.count({ where: { templateId } })
    return this.prisma.projectPlanTemplatePhase.create({
      data: { templateId, name: dto.name, sortOrder: dto.sortOrder ?? count },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    })
  }

  async updateTemplatePhase(phaseId: number, dto: UpdateTemplatePhaseDto) {
    const phase = await this.prisma.projectPlanTemplatePhase.findUnique({ where: { id: phaseId } })
    if (!phase) throw new NotFoundException('ไม่พบ phase')
    return this.prisma.projectPlanTemplatePhase.update({
      where: { id: phaseId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    })
  }

  async deleteTemplatePhase(phaseId: number) {
    const phase = await this.prisma.projectPlanTemplatePhase.findUnique({ where: { id: phaseId } })
    if (!phase) throw new NotFoundException('ไม่พบ phase')
    await this.prisma.projectPlanTemplatePhase.delete({ where: { id: phaseId } })
    return { deleted: true }
  }

  async addTemplateTask(phaseId: number, dto: CreateTemplateTaskDto) {
    const phase = await this.prisma.projectPlanTemplatePhase.findUnique({ where: { id: phaseId } })
    if (!phase) throw new NotFoundException('ไม่พบ phase')
    const count = await this.prisma.projectPlanTemplateTask.count({ where: { phaseId } })
    return this.prisma.projectPlanTemplateTask.create({
      data: {
        phaseId,
        title: dto.title,
        description: dto.description,
        defaultDuration: dto.defaultDuration,
        isOptional: dto.isOptional ?? false,
        sortOrder: dto.sortOrder ?? count,
      },
    })
  }

  async updateTemplateTask(taskId: number, dto: UpdateTemplateTaskDto) {
    const task = await this.prisma.projectPlanTemplateTask.findUnique({ where: { id: taskId } })
    if (!task) throw new NotFoundException('ไม่พบงาน')
    return this.prisma.projectPlanTemplateTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.defaultDuration !== undefined && { defaultDuration: dto.defaultDuration }),
        ...(dto.isOptional !== undefined && { isOptional: dto.isOptional }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    })
  }

  async deleteTemplateTask(taskId: number) {
    const task = await this.prisma.projectPlanTemplateTask.findUnique({ where: { id: taskId } })
    if (!task) throw new NotFoundException('ไม่พบงาน')
    await this.prisma.projectPlanTemplateTask.delete({ where: { id: taskId } })
    return { deleted: true }
  }
}
