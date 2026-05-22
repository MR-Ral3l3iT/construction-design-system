'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PaymentCustomer {
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

export interface PaymentMilestone {
  id: number
  title: string
  description: string | null
  amount: number
  dueDate: string | null
  paidDate: string | null
  status: string
  sortOrder: number
  createdAt: string
  quotation?: {
    id: number
    code: string
    title: string
    boqId: number | null
    totalAmount: number
  } | null
  estimate?: { id: number; code: string; title: string } | null
  project?: { id: number; code: string; name: string; customer?: PaymentCustomer | null }
}

export interface PaymentListResponse {
  data: PaymentMilestone[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface PaymentSummary {
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  overdueCount: number
}

export interface CreatePaymentPayload {
  projectId: number
  quotationId?: number | null
  title: string
  description?: string
  amount: number
  dueDate?: string
  sortOrder?: number
}

export interface OverviewMilestone {
  id: number
  title: string
  amount: number
  status: string
  dueDate: string | null
  paidDate: string | null
  sortOrder: number
  quotation: { id: number; code: string; title: string; boqId: number | null } | null
  estimate: { id: number; code: string; title: string } | null
}

export interface ProjectPaymentOverview {
  id: number
  code: string
  name: string
  status: string
  customer: { id: number; name: string; companyName: string | null } | null
  totalCount: number
  paidCount: number
  overdueCount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  milestones: OverviewMilestone[]
}

export interface ProjectsPaymentOverviewResponse {
  data: ProjectPaymentOverview[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export function usePaymentsOverview(page = 1, search = '') {
  return useQuery<ProjectsPaymentOverviewResponse>({
    queryKey: ['payments', 'overview', page, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, pageSize: 20 }
      if (search) params.search = search
      const { data } = await api.get('/payments/overview', { params })
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export function usePaymentById(id: number) {
  return useQuery<PaymentMilestone>({
    queryKey: ['payments', id],
    queryFn: async () => {
      const { data } = await api.get(`/payments/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function usePaymentsByProject(projectId: number, page = 1) {
  return useQuery<PaymentListResponse>({
    queryKey: ['payments', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/payments/project/${projectId}`, {
        params: { page, pageSize: 50 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function usePaymentSummary(projectId: number) {
  return useQuery<PaymentSummary>({
    queryKey: ['payments', 'summary', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/project/${projectId}/summary`)
      return data?.data ?? data
    },
    enabled: projectId > 0,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const { data } = await api.post('/payments', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['payments', 'project', vars.projectId] })
      qc.invalidateQueries({ queryKey: ['payments', 'summary', vars.projectId] })
    },
  })
}

export function useUpdatePayment(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<CreatePaymentPayload, 'projectId'>>) => {
      const { data } = await api.patch(`/payments/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) {
        qc.invalidateQueries({ queryKey: ['payments', 'project', projectId] })
        qc.invalidateQueries({ queryKey: ['payments', 'summary', projectId] })
      }
    },
  })
}

export function useMarkPaid(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (paidDate?: string) => {
      const { data } = await api.patch(`/payments/${id}/paid`, { paidDate })
      return data?.data ?? data
    },
    onSuccess: () => {
      if (projectId) {
        qc.invalidateQueries({ queryKey: ['payments', 'project', projectId] })
        qc.invalidateQueries({ queryKey: ['payments', 'summary', projectId] })
      }
    },
  })
}

export function useImportFromEstimate(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (estimateId: number) => {
      const { data } = await api.post('/payments/import-from-estimate', { projectId, estimateId })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['payments', 'summary', projectId] })
    },
  })
}
