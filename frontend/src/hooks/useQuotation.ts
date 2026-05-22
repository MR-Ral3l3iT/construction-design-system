'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export interface QuotationSubCategory {
  id: number
  name: string
  sortOrder: number
  totalAmount: number
}

export interface QuotationCategory {
  id: number
  name: string
  sortOrder: number
  totalAmount: number
  subCategories: QuotationSubCategory[]
}

export interface Quotation {
  id: number
  code: string
  title: string
  status: QuotationStatus
  validUntil: string | null
  note: string | null
  mgmtRate: number
  vatRate: number
  subtotal: number
  mgmtCost: number
  vat: number
  totalAmount: number
  boqId: number | null
  createdAt: string
  updatedAt: string
  project?: {
    id: number
    code: string
    name: string
    customer?: {
      name: string
      companyName?: string | null
      phone?: string | null
      email?: string | null
      taxId?: string | null
      address?: string | null
      subdistrict?: string | null
      district?: string | null
      province?: string | null
      postcode?: string | null
    }
  }
  boq?: { id: number; code: string; title: string } | null
  categories?: QuotationCategory[]
}

export interface QuotationListItem {
  id: number
  code: string
  title: string
  status: QuotationStatus
  validUntil: string | null
  totalAmount: number
  boqId: number | null
  boq?: { code: string; title: string } | null
  createdAt: string
}

export interface QuotationListResponse {
  data: QuotationListItem[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateQuotationPayload {
  projectId: number
  boqId?: number
  title: string
  validUntil?: string
  note?: string
  mgmtRate?: string
  vatRate?: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useQuotationsByProject(projectId: number, page = 1) {
  return useQuery<QuotationListResponse>({
    queryKey: ['quotation', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/quotation/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useQuotation(id: number) {
  return useQuery<Quotation>({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const { data } = await api.get(`/quotation/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateQuotationPayload) => {
      const { data } = await api.post('/quotation', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['quotation', 'project', vars.projectId] }),
  })
}

export function useUpdateQuotationStatus(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: QuotationStatus) => {
      const { data } = await api.patch(`/quotation/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['quotation', 'project', projectId] })
    },
  })
}

export function useDeleteQuotation(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/quotation/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotation', 'project', projectId] }),
  })
}

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: 'ร่าง',
  SENT: 'ส่งแล้ว',
  ACCEPTED: 'ตอบรับ',
  REJECTED: 'ปฏิเสธ',
  EXPIRED: 'หมดอายุ',
}

export const QUOTATION_STATUS_COLOR: Record<
  QuotationStatus,
  'default' | 'info' | 'success' | 'danger' | 'warning'
> = {
  DRAFT: 'default',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
}
