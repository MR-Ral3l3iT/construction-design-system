'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Issue {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  resolvedAt: string | null
  project: { id: number; code: string; name: string }
  reportedBy: { id: number; name: string } | null
  createdAt: string
}

export interface IssueListResponse {
  data: Issue[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateIssuePayload {
  projectId: number
  title: string
  description?: string
  priority?: string
  dueDate?: string
}

export function useIssuesByProject(projectId: number, page = 1) {
  return useQuery<IssueListResponse>({
    queryKey: ['issues', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/issues/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateIssuePayload) => {
      const { data } = await api.post('/issues', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['issues', 'project', vars.projectId] })
    },
  })
}

export function useUpdateIssue(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreateIssuePayload, 'projectId'>>) => {
      const { data } = await api.patch(`/issues/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issues', 'project', projectId] })
    },
  })
}

export function useUpdateIssueStatus(projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.patch(`/issues/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issues', 'project', projectId] })
    },
  })
}
