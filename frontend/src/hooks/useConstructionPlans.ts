'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ConstructionTask {
  id: number
  title: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  progress: number
  sortOrder: number
}

export interface ConstructionPlan {
  id: number
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  status: string
  project: { id: number; code: string; name: string }
  tasks: ConstructionTask[]
  createdAt: string
}

export interface ConstructionPlanListResponse {
  data: ConstructionPlan[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreatePlanPayload {
  projectId: number
  title: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
  startDate?: string
  endDate?: string
  sortOrder?: number
}

export function useConstructionPlansByProject(projectId: number, page = 1) {
  return useQuery<ConstructionPlanListResponse>({
    queryKey: ['plans', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/construction-plans/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useConstructionPlan(id: number) {
  return useQuery<ConstructionPlan>({
    queryKey: ['plans', id],
    queryFn: async () => {
      const { data } = await api.get(`/construction-plans/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateConstructionPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      const { data } = await api.post('/construction-plans', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['plans', 'project', vars.projectId] })
    },
  })
}

export function useAddConstructionTask(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const { data } = await api.post(`/construction-plans/${planId}/tasks`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', planId] })
    },
  })
}

export function useUpdateTaskStatus(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const { data } = await api.patch(`/construction-plans/tasks/${taskId}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', planId] })
    },
  })
}

export function useUpdateConstructionPlan(planId: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreatePlanPayload, 'projectId'>>) => {
      const { data } = await api.patch(`/construction-plans/${planId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', planId] })
      if (projectId) qc.invalidateQueries({ queryKey: ['plans', 'project', projectId] })
    },
  })
}

export function useUpdateConstructionTask(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: Partial<CreateTaskPayload>
    }) => {
      const { data } = await api.patch(`/construction-plans/tasks/${taskId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', planId] })
    },
  })
}

export function useUpdateTaskProgress(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, progress }: { taskId: number; progress: number }) => {
      const { data } = await api.patch(`/construction-plans/tasks/${taskId}/progress`, { progress })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', planId] })
    },
  })
}
