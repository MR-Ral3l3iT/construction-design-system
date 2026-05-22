'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DailyUpdate {
  id: number
  date: string
  workDone: string
  nextPlan: string | null
  problem: string | null
  progress: number
  status: string
  project: { id: number; code: string; name: string }
  reportedBy: { id: number; name: string } | null
  publishedAt: string | null
  createdAt: string
}

export interface DailyUpdateListResponse {
  data: DailyUpdate[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateDailyUpdatePayload {
  projectId: number
  date: string
  workDone: string
  nextPlan?: string
  problem?: string
  progress?: number
}

export function useDailyUpdatesByProject(projectId: number, page = 1) {
  return useQuery<DailyUpdateListResponse>({
    queryKey: ['daily-updates', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/daily-updates/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useDailyUpdate(id: number) {
  return useQuery<DailyUpdate>({
    queryKey: ['daily-updates', id],
    queryFn: async () => {
      const { data } = await api.get(`/daily-updates/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateDailyUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateDailyUpdatePayload) => {
      const { data } = await api.post('/daily-updates', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['daily-updates', 'project', vars.projectId] })
    },
  })
}

export function useUpdateDailyUpdate(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreateDailyUpdatePayload, 'projectId'>>) => {
      const { data } = await api.patch(`/daily-updates/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-updates', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['daily-updates', 'project', projectId] })
    },
  })
}

export function usePublishDailyUpdate(projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/daily-updates/${id}/publish`)
      return data?.data ?? data
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['daily-updates', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['daily-updates', 'project', projectId] })
    },
  })
}
