'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SubQuotationItem {
  id: number
  code: string
  title: string
  description: string | null
  amount: number
  sortOrder: number
  createdAt: string
  paymentMilestones: { id: number; title: string; status: string; amount: number }[]
  estimateItems: { id: number; estimate: { id: number; status: string } }[]
}

export interface SubQuotationSummary {
  totalAmount: number
  usedAmount: number
  remainingAmount: number
}

export interface SubQuotationResponse {
  quotation: { id: number; code: string; title: string; totalAmount: number; boqId: number | null }
  items: SubQuotationItem[]
  summary: SubQuotationSummary
}

export interface CreateSubQuotationPayload {
  quotationId: number
  title: string
  description?: string
  amount: number
  sortOrder?: number
}

export interface SubQuotationDetail {
  id: number
  code: string
  title: string
  description: string | null
  amount: number
  sortOrder: number
  createdAt: string
  paymentMilestones: {
    id: number
    title: string
    status: string
    amount: number
    dueDate: string | null
  }[]
  quotation: {
    id: number
    code: string
    title: string
    totalAmount: number
    boqId: number | null
    project: {
      id: number
      code: string
      name: string
      customer: {
        name: string
        companyName: string | null
        phone: string | null
        email: string | null
        taxId: string | null
        address: string | null
        subdistrict: string | null
        district: string | null
        province: string | null
        postcode: string | null
      } | null
    }
  }
}

export function useSubQuotationById(id: number) {
  return useQuery<SubQuotationDetail>({
    queryKey: ['sub-quotation', id],
    queryFn: async () => {
      const { data } = await api.get(`/sub-quotation/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useSubQuotations(quotationId: number) {
  return useQuery<SubQuotationResponse>({
    queryKey: ['sub-quotation', 'quotation', quotationId],
    queryFn: async () => {
      const { data } = await api.get(`/sub-quotation/quotation/${quotationId}`)
      return data?.data ?? data
    },
    enabled: quotationId > 0,
  })
}

export function useCreateSubQuotation(quotationId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateSubQuotationPayload) => {
      const { data } = await api.post('/sub-quotation', payload)
      return data?.data ?? data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['sub-quotation', 'quotation', quotationId] }),
  })
}

export function useUpdateSubQuotation(quotationId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateSubQuotationPayload> & { id: number }) => {
      const { data } = await api.patch(`/sub-quotation/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['sub-quotation', 'quotation', quotationId] }),
  })
}

export function useDeleteSubQuotation(quotationId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/sub-quotation/${id}`)
      return data?.data ?? data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['sub-quotation', 'quotation', quotationId] }),
  })
}

export function useCreatePaymentFromSubQuotation(quotationId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      subQuotationId,
      dueDate,
    }: {
      subQuotationId: number
      dueDate?: string
    }) => {
      const { data } = await api.post(`/payments/from-sub-quotation/${subQuotationId}`, { dueDate })
      return data?.data ?? data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sub-quotation', 'quotation', quotationId] })
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
