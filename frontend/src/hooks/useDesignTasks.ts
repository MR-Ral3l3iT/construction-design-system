'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DesignTask {
  id: number
  title: string
  description: string | null
  status: string
  revisionNo: number
  startDate: string | null
  dueDate: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  project?: { id: number; code: string; name: string }
  _count?: { files: number; comments: number }
}

export interface DesignTaskListResponse {
  data: DesignTask[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateDesignTaskPayload {
  projectId: number
  title: string
  description?: string
  startDate?: string
  dueDate?: string
}

export function useDesignTaskSummary() {
  return useQuery<Record<number, Record<string, number>>>({
    queryKey: ['design-tasks', 'task-summary'],
    queryFn: async () => {
      const { data } = await api.get('/design-tasks/task-summary')
      return data?.data ?? data
    },
    staleTime: 60_000,
  })
}

export function useDesignTasksByProject(projectId: number, page = 1) {
  return useQuery<DesignTaskListResponse>({
    queryKey: ['design-tasks', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/design-tasks/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useDesignTask(id: number) {
  return useQuery<DesignTask>({
    queryKey: ['design-tasks', id],
    queryFn: async () => {
      const { data } = await api.get(`/design-tasks/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateDesignTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateDesignTaskPayload) => {
      const { data } = await api.post('/design-tasks', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['design-tasks', 'project', vars.projectId] })
      qc.invalidateQueries({ queryKey: ['design-tasks', 'task-summary'] })
    },
  })
}

export function useUpdateDesignTask(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreateDesignTaskPayload, 'projectId'>>) => {
      const { data } = await api.patch(`/design-tasks/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['design-tasks', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['design-tasks', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['design-tasks', 'task-summary'] })
    },
  })
}

export function useDeleteDesignTask(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/design-tasks/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['design-tasks', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['design-tasks', 'task-summary'] })
    },
  })
}

export function useUpdateDesignTaskStatus(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const { data } = await api.patch(`/design-tasks/${id}/status`, { status, note })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['design-tasks', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['design-tasks', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['design-tasks', 'task-summary'] })
    },
  })
}
