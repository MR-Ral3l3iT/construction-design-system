import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ReportImageType } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import {
  CreateDailyReportDto,
  CreateReportItemDto,
  CreateReportIssueDto,
  QueryDailyReportDto,
  UpdateDailyReportDto,
  UpdateReportItemDto,
  UpdateReportIssueDto,
} from './dto/daily-report.dto'

const REPORT_INCLUDE = {
  project: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true, avatar: true } },
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
  issues: { orderBy: { createdAt: 'asc' as const } },
}

@Injectable()
export class DailyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Reports ───────────────────────────────────────────────────────────────

  async findByProject(query: QueryDailyReportDto) {
    const projectId = query.projectId ? parseInt(query.projectId) : undefined
    const where: Record<string, unknown> = { deletedAt: null }
    if (projectId) where.projectId = projectId
    if (query.status) where.status = query.status
    if (query.month) {
      const [year, month] = query.month.split('-').map(Number)
      where.reportDate = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      }
    }
    return this.prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true, issues: true } },
      },
    })
  }

  async findOne(id: number) {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id, deletedAt: null },
      include: REPORT_INCLUDE,
    })
    if (!report) throw new NotFoundException('ไม่พบรายงาน')
    return report
  }

  async create(dto: CreateDailyReportDto, userId: number) {
    const reportDate = new Date(dto.reportDate)
    const existing = await this.prisma.dailyReport.findFirst({
      where: { projectId: dto.projectId, reportDate, deletedAt: null },
    })
    if (existing) throw new BadRequestException('มีรายงานของวันนี้แล้ว')

    return this.prisma.dailyReport.create({
      data: {
        projectId: dto.projectId,
        createdById: userId,
        reportDate,
        weather: dto.weather,
        overallProgress: dto.overallProgress ?? 0,
        nextPlan: dto.nextPlan,
        issueSummary: dto.issueSummary,
        items: dto.items?.length
          ? { create: dto.items.map((item, i) => ({ ...item, sortOrder: i })) }
          : undefined,
        issues: dto.issues?.length ? { create: dto.issues } : undefined,
      },
      include: REPORT_INCLUDE,
    })
  }

  async update(id: number, dto: UpdateDailyReportDto) {
    await this.findOne(id)
    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        ...dto,
        reportDate: dto.reportDate ? new Date(dto.reportDate) : undefined,
      },
      include: REPORT_INCLUDE,
    })
  }

  async publish(id: number) {
    const report = await this.findOne(id)
    if (report.status === 'PUBLISHED') throw new BadRequestException('เผยแพร่แล้ว')
    return this.prisma.dailyReport.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: REPORT_INCLUDE,
    })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.dailyReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async findProjectSummaries() {
    const [projects, reports, openIssues] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, code: true, status: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.dailyReport.findMany({
        where: { deletedAt: null },
        select: { projectId: true, reportDate: true, overallProgress: true, status: true },
        orderBy: { reportDate: 'desc' },
      }),
      this.prisma.dailyReportIssue.findMany({
        where: { status: 'OPEN', report: { deletedAt: null } },
        select: { report: { select: { projectId: true } } },
      }),
    ])

    const openByProject = new Map<number, number>()
    for (const issue of openIssues) {
      const pid = issue.report.projectId
      openByProject.set(pid, (openByProject.get(pid) ?? 0) + 1)
    }

    const reportMap = new Map<
      number,
      {
        totalReports: number
        lastReportDate: string
        lastProgress: number
        publishedCount: number
        draftCount: number
      }
    >()

    for (const r of reports) {
      if (!reportMap.has(r.projectId)) {
        reportMap.set(r.projectId, {
          totalReports: 0,
          lastReportDate: r.reportDate.toISOString(),
          lastProgress: r.overallProgress,
          publishedCount: 0,
          draftCount: 0,
        })
      }
      const entry = reportMap.get(r.projectId)!
      entry.totalReports++
      if (r.status === 'PUBLISHED') entry.publishedCount++
      else entry.draftCount++
    }

    const result = projects.map((p) => {
      const stats = reportMap.get(p.id)
      return {
        projectId: p.id,
        project: p,
        totalReports: stats?.totalReports ?? 0,
        lastReportDate: stats?.lastReportDate ?? null,
        lastProgress: stats?.lastProgress ?? 0,
        publishedCount: stats?.publishedCount ?? 0,
        draftCount: stats?.draftCount ?? 0,
        openIssues: openByProject.get(p.id) ?? 0,
      }
    })

    return result.sort((a, b) => {
      if (!a.lastReportDate && !b.lastReportDate) return 0
      if (!a.lastReportDate) return 1
      if (!b.lastReportDate) return -1
      return b.lastReportDate.localeCompare(a.lastReportDate)
    })
  }

  async findIssuesByProject(projectId: number) {
    const issues = await this.prisma.dailyReportIssue.findMany({
      where: { report: { projectId, deletedAt: null } },
      include: { report: { select: { id: true, reportDate: true } } },
      orderBy: [{ report: { reportDate: 'desc' } }, { createdAt: 'asc' }],
    })
    return issues
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  async addItem(reportId: number, dto: CreateReportItemDto) {
    await this.findOne(reportId)
    const count = await this.prisma.dailyReportItem.count({ where: { reportId } })
    return this.prisma.dailyReportItem.create({
      data: { ...dto, reportId, sortOrder: dto.sortOrder ?? count },
      include: { category: true, images: true },
    })
  }

  async updateItem(itemId: number, dto: UpdateReportItemDto) {
    const item = await this.prisma.dailyReportItem.findUnique({ where: { id: itemId } })
    if (!item) throw new NotFoundException('ไม่พบรายการงาน')
    return this.prisma.dailyReportItem.update({
      where: { id: itemId },
      data: dto,
      include: { category: true, images: true },
    })
  }

  async removeItem(itemId: number) {
    const item = await this.prisma.dailyReportItem.findUnique({ where: { id: itemId } })
    if (!item) throw new NotFoundException('ไม่พบรายการงาน')
    return this.prisma.dailyReportItem.delete({ where: { id: itemId } })
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  async addImage(
    reportItemId: number,
    imageUrl: string,
    storageKey: string | null,
    caption?: string,
    imageType?: string,
  ) {
    const item = await this.prisma.dailyReportItem.findUnique({ where: { id: reportItemId } })
    if (!item) throw new NotFoundException('ไม่พบรายการงาน')
    const count = await this.prisma.dailyReportImage.count({ where: { reportItemId } })
    return this.prisma.dailyReportImage.create({
      data: {
        reportItemId,
        imageUrl,
        storageKey,
        caption,
        imageType: (imageType as ReportImageType) ?? ReportImageType.PROGRESS,
        sortOrder: count,
      },
    })
  }

  async removeImage(imageId: number) {
    const img = await this.prisma.dailyReportImage.findUnique({ where: { id: imageId } })
    if (!img) throw new NotFoundException('ไม่พบรูปภาพ')
    await this.prisma.dailyReportImage.delete({ where: { id: imageId } })
    return img
  }

  // ─── Issues ────────────────────────────────────────────────────────────────

  async addIssue(reportId: number, dto: CreateReportIssueDto) {
    await this.findOne(reportId)
    return this.prisma.dailyReportIssue.create({ data: { ...dto, reportId } })
  }

  async updateIssue(issueId: number, dto: UpdateReportIssueDto) {
    const issue = await this.prisma.dailyReportIssue.findUnique({ where: { id: issueId } })
    if (!issue) throw new NotFoundException('ไม่พบปัญหา')
    return this.prisma.dailyReportIssue.update({
      where: { id: issueId },
      data: {
        ...dto,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : undefined,
      },
    })
  }

  async removeIssue(issueId: number) {
    const issue = await this.prisma.dailyReportIssue.findUnique({ where: { id: issueId } })
    if (!issue) throw new NotFoundException('ไม่พบปัญหา')
    return this.prisma.dailyReportIssue.delete({ where: { id: issueId } })
  }
}
