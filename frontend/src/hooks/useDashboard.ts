'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardSummary {
  projects: {
    total: number
    construction: number
    designOnly: number
    turnkey: number
    byStatus: { status: string; count: number }[]
  }
  customers: {
    total: number
    leadFunnel: { leadStatus: string; count: number }[]
  }
  payments: {
    totalAmount: number
    paidAmount: number
    remainingAmount: number
    overdueCount: number
  }
  issues: {
    openCount: number
  }
  recentDailyUpdates: {
    id: number
    updateDate: string
    title: string
    progress: number
    project: { id: number; code: string; name: string }
    createdBy: { id: number; name: string }
  }[]
  recentProjects: {
    id: number
    code: string
    name: string
    status: string
    type: string
    progress: number
    customer: { id: number; name: string }
    createdAt: string
  }[]
  recentIssues: {
    id: number
    title: string
    priority: string
    status: string
    project: { id: number; code: string; name: string }
    createdAt: string
  }[]
  recentActivity: {
    id: number
    action: string
    module: string
    refId: number | null
    description: string | null
    createdAt: string
  }[]
}

export function useDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary')
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}
