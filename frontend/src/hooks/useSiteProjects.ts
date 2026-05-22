import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SiteProject {
  id: number
  code: string
  name: string
  status: string
  progress: number
  addressLine: string | null
  province: string | null
  district: string | null
  startDate: string | null
  endDate: string | null
  members: { roleName: string | null }[]
}

export interface SiteProjectDetail extends SiteProject {
  description: string | null
  members: { roleName: string | null; user: { id: number; name: string } }[]
  _count: { dailyUpdates: number; issues: number }
}

export interface SiteDailyUpdate {
  id: number
  updateDate: string
  title: string | null
  workDone: string
  status: string
  progress: number
  createdAt: string
  createdBy: { id: number; name: string }
}

export interface CreateDailyUpdatePayload {
  updateDate: string
  title?: string
  workDone: string
  nextPlan?: string
  problem?: string
  progress?: number
}

export interface CreateIssuePayload {
  title: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export function useSiteProjects() {
  return useQuery<SiteProject[]>({
    queryKey: ['site-projects'],
    queryFn: async () => {
      const { data } = await api.get('/site/projects')
      return data?.data ?? data
    },
  })
}

export function useSiteProject(id: number) {
  return useQuery<SiteProjectDetail>({
    queryKey: ['site-project', id],
    queryFn: async () => {
      const { data } = await api.get(`/site/projects/${id}`)
      return data?.data ?? data
    },
    enabled: !!id,
  })
}

export function useSiteDailyUpdates(projectId: number) {
  return useQuery<SiteDailyUpdate[]>({
    queryKey: ['site-daily-updates', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/site/projects/${projectId}/daily-updates`)
      return data?.data ?? data
    },
    enabled: !!projectId,
  })
}

export function useCreateSiteDailyUpdate(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateDailyUpdatePayload) => {
      const { data } = await api.post(`/site/projects/${projectId}/daily-updates`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-daily-updates', projectId] })
      qc.invalidateQueries({ queryKey: ['site-project', projectId] })
    },
  })
}

export function useCreateSiteIssue(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateIssuePayload) => {
      const { data } = await api.post(`/site/projects/${projectId}/issues`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-project', projectId] })
    },
  })
}
