'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WorkCategory {
  id: number
  name: string
  color: string | null
  order: number
  isActive: boolean
}

export type ReportImageType = 'BEFORE' | 'AFTER' | 'PROGRESS' | 'OTHER'

export interface DailyReportImage {
  id: number
  reportItemId: number
  imageUrl: string
  storageKey: string | null
  caption: string | null
  imageType: ReportImageType
  sortOrder: number
}

export interface DailyReportItem {
  id: number
  reportId: number
  categoryId: number
  description: string
  progress: number
  unit: string | null
  quantity: string | null
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'
  sortOrder: number
  category: WorkCategory
  images: DailyReportImage[]
}

export interface DailyReportIssue {
  id: number
  reportId: number
  issue: string
  impact: string | null
  solution: string | null
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'RESOLVED'
  resolvedAt: string | null
  createdAt: string
}

export interface DailyReport {
  id: number
  projectId: number
  reportDate: string
  weather: 'SUNNY' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'RAINY' | 'HEAVY_RAIN' | 'STORMY' | null
  overallProgress: number
  nextPlan: string | null
  issueSummary: string | null
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  project: { id: number; name: string; code: string }
  createdBy: { id: number; name: string; avatar: string | null }
  items: DailyReportItem[]
  issues: DailyReportIssue[]
  _count?: { items: number; issues: number }
  createdAt: string
  updatedAt: string
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

const QK = {
  categories: () => ['work-categories'] as const,
  reports: (q?: Record<string, string>) => ['daily-reports', q ?? {}] as const,
  report: (id: number) => ['daily-reports', id] as const,
}

// ─── Work Categories ────────────────────────────────────────────────────────

export function useWorkCategories() {
  return useQuery<WorkCategory[]>({
    queryKey: QK.categories(),
    queryFn: async () => {
      const { data } = await api.get('/work-categories')
      return data?.data ?? data
    },
    staleTime: 5 * 60_000,
  })
}

export interface DailyReportIssueWithReport extends DailyReportIssue {
  report: { id: number; reportDate: string }
}

export interface DailyReportProjectSummary {
  projectId: number
  project: { id: number; name: string; code: string; status: string }
  totalReports: number
  lastReportDate: string | null
  lastProgress: number
  publishedCount: number
  draftCount: number
  openIssues: number
}

// ─── Reports ────────────────────────────────────────────────────────────────

export function useDailyReportProjectSummaries() {
  return useQuery<DailyReportProjectSummary[]>({
    queryKey: ['daily-report-project-summaries'],
    queryFn: async () => {
      const { data } = await api.get('/daily-reports/project-summaries')
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export function useDailyReportIssuesByProject(projectId: number) {
  return useQuery<DailyReportIssueWithReport[]>({
    queryKey: ['daily-report-issues', 'project', projectId],
    queryFn: async () => {
      const { data } = await api.get('/daily-reports/project-issues', { params: { projectId } })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useDailyReports(params: { projectId?: number; month?: string; status?: string }) {
  const query: Record<string, string> = {}
  if (params.projectId) query.projectId = String(params.projectId)
  if (params.month) query.month = params.month
  if (params.status) query.status = params.status

  return useQuery<DailyReport[]>({
    queryKey: QK.reports(query),
    queryFn: async () => {
      const { data } = await api.get('/daily-reports', { params: query })
      return data?.data ?? data
    },
    enabled: !!params.projectId,
    staleTime: 30_000,
  })
}

export function useDailyReport(id: number) {
  return useQuery<DailyReport>({
    queryKey: QK.report(id),
    queryFn: async () => {
      const { data } = await api.get(`/daily-reports/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
    staleTime: 15_000,
  })
}

export function useCreateDailyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      projectId: number
      reportDate: string
      weather?: string
      overallProgress?: number
      nextPlan?: string
      issueSummary?: string
    }) => {
      const { data } = await api.post('/daily-reports', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

export function useUpdateDailyReport(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      reportDate?: string
      weather?: string | null
      overallProgress?: number
      nextPlan?: string
      issueSummary?: string
    }) => {
      const { data } = await api.patch(`/daily-reports/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.report(id) })
      qc.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

export function usePublishDailyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/daily-reports/${id}/publish`)
      return data?.data ?? data
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: QK.report(id) })
      qc.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

export function useDeleteDailyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/daily-reports/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

// ─── Items ──────────────────────────────────────────────────────────────────

export function useAddReportItem(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      categoryId: number
      description: string
      progress?: number
      unit?: string
      quantity?: number
      status?: string
    }) => {
      const { data } = await api.post(`/daily-reports/${reportId}/items`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

export function useUpdateReportItem(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemId,
      ...payload
    }: {
      itemId: number
      categoryId?: number
      description?: string
      progress?: number
      unit?: string
      quantity?: number
      status?: string
    }) => {
      const { data } = await api.patch(`/daily-reports/items/${itemId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

export function useDeleteReportItem(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete(`/daily-reports/items/${itemId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

// ─── Images ─────────────────────────────────────────────────────────────────

export function useAddReportImage(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemId,
      file,
      caption,
      imageType,
    }: {
      itemId: number
      file: File
      caption?: string
      imageType?: ReportImageType
    }) => {
      const form = new FormData()
      form.append('file', file)
      const qs = new URLSearchParams()
      if (caption) qs.set('caption', caption)
      if (imageType) qs.set('imageType', imageType)
      const params = qs.toString() ? `?${qs}` : ''
      const { data } = await api.post(`/daily-reports/items/${itemId}/images${params}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

export function useDeleteReportImage(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (imageId: number) => {
      const { data } = await api.delete(`/daily-reports/images/${imageId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

// ─── Issues ─────────────────────────────────────────────────────────────────

export function useAddReportIssue(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      issue: string
      impact?: string
      solution?: string
      severity?: string
    }) => {
      const { data } = await api.post(`/daily-reports/${reportId}/issues`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

export function useUpdateReportIssue(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      issueId,
      ...payload
    }: {
      issueId: number
      issue?: string
      impact?: string
      solution?: string
      severity?: string
      status?: string
    }) => {
      const { data } = await api.patch(`/daily-reports/issues/${issueId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}

export function useDeleteReportIssue(reportId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (issueId: number) => {
      const { data } = await api.delete(`/daily-reports/issues/${issueId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.report(reportId) }),
  })
}
