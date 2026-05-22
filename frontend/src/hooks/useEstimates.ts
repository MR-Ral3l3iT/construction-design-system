'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface EstimateItem {
  id: number
  name: string
  description: string | null
  quantity: number
  unit: string | null
  unitPrice: number
  totalPrice: number
  sortOrder: number
}

export interface EstimateCustomer {
  id: number
  name: string
  companyName: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  address: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  postcode: string | null
}

export interface EstimateInstallment {
  id: number
  installmentNo: number
  description: string
  percentage: string
  amount: string
}

export interface Estimate {
  id: number
  code: string
  title: string
  description: string | null
  status: string
  totalAmount: number
  createdAt: string
  updatedAt: string
  project?: { id: number; code: string; name: string; customer?: EstimateCustomer | null }
  items?: EstimateItem[]
  installments?: EstimateInstallment[]
}

export interface EstimateListResponse {
  data: Estimate[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateEstimatePayload {
  projectId: number
  title: string
  description?: string
}

export interface EstimateItemPayload {
  name: string
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  sortOrder?: number
  subQuotationId?: number
}

export interface ProjectEstimateOverview {
  id: number
  code: string
  name: string
  status: string
  customer: { id: number; name: string; companyName: string | null } | null
  estimates: {
    id: number
    code: string
    title: string
    status: string
    totalAmount: string
    createdAt: string
  }[]
}

export interface ProjectsOverviewResponse {
  data: ProjectEstimateOverview[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export function useEstimatesOverview(page = 1, search = '') {
  return useQuery<ProjectsOverviewResponse>({
    queryKey: ['estimates', 'overview', page, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, pageSize: 20 }
      if (search) params.search = search
      const { data } = await api.get('/estimates/overview', { params })
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export interface EstimateListItem {
  id: number
  code: string
  title: string
  status: string
  totalAmount: number
  createdAt: string
  project?: {
    id: number
    code: string
    name: string
    customer?: { id: number; name: string; companyName: string | null } | null
  }
}

export interface EstimateAllListResponse {
  data: EstimateListItem[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export function useAllEstimates(page = 1, search = '') {
  return useQuery<EstimateAllListResponse>({
    queryKey: ['estimates', 'all', page, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, pageSize: 20 }
      if (search) params.search = search
      const { data } = await api.get('/estimates', { params })
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export function useEstimatesByProject(projectId: number, page = 1) {
  return useQuery<EstimateListResponse>({
    queryKey: ['estimates', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/estimates/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useEstimate(id: number) {
  return useQuery<Estimate>({
    queryKey: ['estimates', id],
    queryFn: async () => {
      const { data } = await api.get(`/estimates/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateEstimate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateEstimatePayload) => {
      const { data } = await api.post('/estimates', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['estimates', 'project', vars.projectId] })
      qc.invalidateQueries({ queryKey: ['estimates', 'overview'] })
    },
  })
}

export function useUpdateEstimate(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreateEstimatePayload, 'projectId'>>) => {
      const { data } = await api.patch(`/estimates/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['estimates', 'project', projectId] })
    },
  })
}

export function useUpdateEstimateStatus(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: string) => {
      const { data } = await api.patch(`/estimates/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['estimates', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['estimates', 'overview'] })
    },
  })
}

export function useAddEstimateItem(estimateId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EstimateItemPayload) => {
      const { data } = await api.post(`/estimates/${estimateId}/items`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estimates', estimateId] }),
  })
}

export function useUpdateEstimateItem(estimateId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: number
      payload: Partial<EstimateItemPayload>
    }) => {
      const { data } = await api.patch(`/estimates/${estimateId}/items/${itemId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estimates', estimateId] }),
  })
}

export function useDeleteEstimate(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/estimates/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['estimates', 'overview'] })
    },
  })
}

export function useDeleteEstimateItem(estimateId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete(`/estimates/${estimateId}/items/${itemId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estimates', estimateId] }),
  })
}

export interface InstallmentPayload {
  installmentNo: number
  description: string
  percentage: string
  amount: string
}

export function useUpsertInstallments(estimateId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (installments: InstallmentPayload[]) => {
      const { data } = await api.patch(`/estimates/${estimateId}/installments`, { installments })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estimates', estimateId] }),
  })
}
