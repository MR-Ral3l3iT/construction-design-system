'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ChangeRequest {
  id: number
  title: string
  description: string | null
  reason: string | null
  status: string
  estimatedAmount: number | null
  approvedAmount: number | null
  approvedAt: string | null
  project: { id: number; code: string; name: string }
  requestedBy: { id: number; name: string } | null
  createdAt: string
}

export interface ChangeRequestListResponse {
  data: ChangeRequest[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateChangeRequestPayload {
  projectId: number
  title: string
  description?: string
  reason?: string
  estimatedAmount?: number
}

export function useChangeRequestsByProject(projectId: number, page = 1) {
  return useQuery<ChangeRequestListResponse>({
    queryKey: ['change-requests', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/change-requests/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useCreateChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateChangeRequestPayload) => {
      const { data } = await api.post('/change-requests', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['change-requests', 'project', vars.projectId] })
    },
  })
}

export function useUpdateChangeRequest(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreateChangeRequestPayload, 'projectId'>>) => {
      const { data } = await api.patch(`/change-requests/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['change-requests', 'project', projectId] })
    },
  })
}

export function useApproveChangeRequest(projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, approvedAmount }: { id: number; approvedAmount?: number }) => {
      const { data } = await api.patch(`/change-requests/${id}/approve`, { approvedAmount })
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['change-requests', 'project', projectId] })
    },
  })
}

export function useUpdateChangeRequestStatus(projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.patch(`/change-requests/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['change-requests', 'project', projectId] })
    },
  })
}
