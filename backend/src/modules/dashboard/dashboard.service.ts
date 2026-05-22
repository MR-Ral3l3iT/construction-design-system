import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date()

    const [
      totalProjects,
      byStatus,
      byType,
      totalCustomers,
      leadFunnel,
      overduePayments,
      totalPayments,
      paidPayments,
      openIssues,
      recentDailyUpdates,
      recentProjects,
      recentIssues,
      recentActivity,
    ] = await Promise.all([
      // Projects
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
      // Customers
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.customer.groupBy({
        by: ['leadStatus'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      // Overdue payments
      this.prisma.paymentMilestone.count({
        where: { deletedAt: null, status: 'OVERDUE' },
      }),
      // Total payment amount
      this.prisma.paymentMilestone.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.paymentMilestone.aggregate({
        where: { deletedAt: null, status: 'PAID' },
        _sum: { amount: true },
      }),
      // Open issues
      this.prisma.issue.count({ where: { deletedAt: null, status: 'OPEN' } }),
      // Recent daily updates (last 5)
      this.prisma.dailyUpdate.findMany({
        where: { deletedAt: null, status: 'PUBLISHED' },
        orderBy: { updateDate: 'desc' },
        take: 5,
        select: {
          id: true,
          updateDate: true,
          title: true,
          progress: true,
          project: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      // Recent projects (last 5)
      this.prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          type: true,
          progress: true,
          customer: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),
      // Recent open issues (last 5)
      this.prisma.issue.findMany({
        where: { deletedAt: null, status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          project: { select: { id: true, code: true, name: true } },
          createdAt: true,
        },
      }),
      // Recent activity logs (last 10)
      this.prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          module: true,
          refId: true,
          description: true,
          createdAt: true,
        },
      }),
    ])

    const constructionProjects = byStatus.find((s) => s.status === 'CONSTRUCTION')?._count.id ?? 0
    const designOnlyProjects = byType.find((t) => t.type === 'DESIGN_ONLY')?._count.id ?? 0
    const turnkeyProjects = byType.find((t) => t.type === 'TURNKEY')?._count.id ?? 0

    const totalPaymentAmount = parseFloat(totalPayments._sum.amount?.toString() ?? '0')
    const paidPaymentAmount = parseFloat(paidPayments._sum.amount?.toString() ?? '0')

    return {
      projects: {
        total: totalProjects,
        construction: constructionProjects,
        designOnly: designOnlyProjects,
        turnkey: turnkeyProjects,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      },
      customers: {
        total: totalCustomers,
        leadFunnel: leadFunnel.map((l) => ({ leadStatus: l.leadStatus, count: l._count.id })),
      },
      payments: {
        totalAmount: totalPaymentAmount,
        paidAmount: paidPaymentAmount,
        remainingAmount: totalPaymentAmount - paidPaymentAmount,
        overdueCount: overduePayments,
      },
      issues: {
        openCount: openIssues,
      },
      recentDailyUpdates,
      recentProjects,
      recentIssues,
      recentActivity,
    }
  }
}
