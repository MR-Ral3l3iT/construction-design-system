import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectAccess(projectId: number, customerId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, customerId: true },
    })
    if (!project) throw new NotFoundException('ไม่พบโครงการ')
    if (project.customerId !== customerId)
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงโครงการนี้')
    return project
  }

  async getProjects(customerId: number) {
    return this.prisma.project.findMany({
      where: { customerId, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
        addressLine: true,
        province: true,
        district: true,
        subdistrict: true,
        postcode: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getProject(projectId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        status: true,
        progress: true,
        description: true,
        addressLine: true,
        province: true,
        district: true,
        subdistrict: true,
        postcode: true,
        areaSize: true,
        startDate: true,
        endDate: true,
        budgetMin: true,
        budgetMax: true,
        customer: {
          select: { id: true, name: true, companyName: true },
        },
        members: {
          select: {
            roleName: true,
            user: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    })
  }

  async getDailyUpdates(projectId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    return this.prisma.dailyUpdate.findMany({
      where: { projectId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        updateDate: true,
        title: true,
        workDone: true,
        nextPlan: true,
        problem: true,
        progress: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { updateDate: 'desc' },
    })
  }

  async getFiles(projectId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    return this.prisma.fileAsset.findMany({
      where: { projectId },
      select: {
        id: true,
        originalName: true,
        storageKey: true,
        mimeType: true,
        size: true,
        category: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getPayments(projectId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    return this.prisma.paymentMilestone.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        dueDate: true,
        paidDate: true,
        status: true,
        sortOrder: true,
        createdAt: true,
        quotation: {
          select: { id: true, code: true, title: true, boqId: true, totalAmount: true },
        },
        estimate: {
          select: { id: true, code: true, title: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async getReportsList(
    projectId: number,
    customerId: number,
    opts: { page: number; limit: number; dateFrom?: string; dateTo?: string },
  ) {
    await this.assertProjectAccess(projectId, customerId)
    const { page, limit, dateFrom, dateTo } = opts
    const skip = (page - 1) * limit

    const where = {
      projectId,
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(dateFrom || dateTo
        ? {
            reportDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        select: {
          id: true,
          reportDate: true,
          overallProgress: true,
          weather: true,
          nextPlan: true,
          issueSummary: true,
          publishedAt: true,
          createdBy: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              description: true,
              progress: true,
              status: true,
              sortOrder: true,
              category: { select: { id: true, name: true, color: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { items: true } },
        },
        orderBy: { reportDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dailyReport.count({ where }),
    ])

    return {
      data: items,
      meta: { page, limit, total, hasMore: skip + items.length < total },
    }
  }

  async getReport(projectId: number, reportId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    const report = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, projectId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        reportDate: true,
        overallProgress: true,
        weather: true,
        nextPlan: true,
        issueSummary: true,
        publishedAt: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            description: true,
            progress: true,
            unit: true,
            quantity: true,
            status: true,
            sortOrder: true,
            category: { select: { id: true, name: true, color: true } },
            images: {
              select: {
                id: true,
                imageUrl: true,
                storageKey: true,
                caption: true,
                imageType: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!report) throw new NotFoundException('ไม่พบรายงาน')
    return report
  }

  async getLatestDailyReport(projectId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    return this.prisma.dailyReport.findFirst({
      where: { projectId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        reportDate: true,
        overallProgress: true,
        weather: true,
        nextPlan: true,
        publishedAt: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            description: true,
            progress: true,
            unit: true,
            quantity: true,
            status: true,
            sortOrder: true,
            category: { select: { id: true, name: true, color: true } },
            images: {
              select: {
                id: true,
                imageUrl: true,
                storageKey: true,
                caption: true,
                imageType: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { reportDate: 'desc' },
    })
  }

  async getApprovals(projectId: number, customerId: number) {
    await this.assertProjectAccess(projectId, customerId)

    const [designTasks, boq, changeRequests] = await Promise.all([
      this.prisma.designTask.findMany({
        where: {
          projectId,
          status: { in: ['WAITING_REVIEW', 'APPROVED', 'REVISION', 'CANCELLED'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          revisionNo: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.bOQ.findMany({
        where: { projectId, deletedAt: null, status: { in: ['REVIEW', 'APPROVED', 'LOCKED'] } },
        select: {
          id: true,
          code: true,
          version: true,
          status: true,
          totalAmount: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.changeRequest.findMany({
        where: {
          projectId,
          deletedAt: null,
          status: { in: ['WAITING_APPROVAL', 'APPROVED', 'REJECTED'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          estimatedAmount: true,
          approvedAmount: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    return { designTasks, boq, changeRequests }
  }
}
