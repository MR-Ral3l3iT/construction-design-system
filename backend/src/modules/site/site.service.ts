import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { IsDateString } from 'class-validator'
import { PrismaService } from '../../database/prisma.service'

export class CreateSiteDailyUpdateDto {
  @IsDateString() updateDate: string
  @IsOptional() @IsString() title?: string
  @IsString() workDone: string
  @IsOptional() @IsString() nextPlan?: string
  @IsOptional() @IsString() problem?: string
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number
}

export class CreateSiteIssueDto {
  @IsString() title: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority?: string
}

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignedProjects(userId: number, isAdmin: boolean) {
    const where = isAdmin ? { deletedAt: null } : { deletedAt: null, members: { some: { userId } } }

    return this.prisma.project.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        progress: true,
        addressLine: true,
        province: true,
        district: true,
        startDate: true,
        endDate: true,
        members: {
          where: { userId },
          select: { roleName: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getProject(projectId: number, userId: number, isAdmin: boolean) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        progress: true,
        addressLine: true,
        province: true,
        district: true,
        description: true,
        startDate: true,
        endDate: true,
        members: {
          select: { roleName: true, user: { select: { id: true, name: true } } },
        },
        _count: { select: { dailyUpdates: true, issues: true } },
      },
    })
    if (!project) throw new NotFoundException('ไม่พบโครงการ')
    if (!isAdmin) {
      const isMember = project.members.some((m) => m.user.id === userId)
      if (!isMember) throw new ForbiddenException('ไม่ได้รับมอบหมายให้ดูแลโครงการนี้')
    }
    return project
  }

  async createDailyUpdate(
    projectId: number,
    userId: number,
    isAdmin: boolean,
    dto: CreateSiteDailyUpdateDto,
  ) {
    await this.getProject(projectId, userId, isAdmin)
    return this.prisma.dailyUpdate.create({
      data: {
        projectId,
        createdById: userId,
        updateDate: new Date(dto.updateDate),
        title: dto.title,
        workDone: dto.workDone,
        nextPlan: dto.nextPlan,
        problem: dto.problem,
        progress: dto.progress ?? 0,
        status: 'DRAFT',
      },
      select: {
        id: true,
        updateDate: true,
        title: true,
        workDone: true,
        status: true,
        progress: true,
        createdAt: true,
      },
    })
  }

  async createIssue(projectId: number, userId: number, isAdmin: boolean, dto: CreateSiteIssueDto) {
    await this.getProject(projectId, userId, isAdmin)
    return this.prisma.issue.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') ?? 'MEDIUM',
        status: 'OPEN',
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    })
  }

  async getRecentUpdates(projectId: number, userId: number, isAdmin: boolean) {
    await this.getProject(projectId, userId, isAdmin)
    return this.prisma.dailyUpdate.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        updateDate: true,
        title: true,
        workDone: true,
        status: true,
        progress: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { updateDate: 'desc' },
      take: 20,
    })
  }
}
