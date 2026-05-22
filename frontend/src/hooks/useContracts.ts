'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Contract {
  id: number
  code: string
  title: string
  status: string
  totalAmount: number
  contractDate: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  project?: { id: number; code: string; name: string }
}

export interface ContractListResponse {
  data: Contract[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateContractPayload {
  projectId: number
  title: string
  contractDate?: string
  startDate?: string
  endDate?: string
  totalAmount?: number
}

export function useContractsByProject(projectId: number, page = 1) {
  return useQuery<ContractListResponse>({
    queryKey: ['contracts', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/contracts/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useContract(id: number) {
  return useQuery<Contract>({
    queryKey: ['contracts', id],
    queryFn: async () => {
      const { data } = await api.get(`/contracts/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateContractPayload) => {
      const { data } = await api.post('/contracts', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['contracts', 'project', vars.projectId] }),
  })
}

export function useUpdateContract(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreateContractPayload, 'projectId'>>) => {
      const { data } = await api.patch(`/contracts/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['contracts', 'project', projectId] })
    },
  })
}
