'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Customer {
  id: number
  type: string
  name: string
  companyName: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  lineId: string | null
  address: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  postcode: string | null
  note: string | null
  avatarUrl: string | null
  leadStatus: string
  userId?: number | null
  user?: { id: number; email: string; status: string } | null
  createdAt: string
  updatedAt: string
  _count?: { projects: number }
}

export interface CustomerListResponse {
  data: Customer[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CustomerFilterParams {
  search?: string
  type?: string
  leadStatus?: string
  page?: number
  pageSize?: number
}

export interface CreateCustomerPayload {
  name: string
  type?: string
  companyName?: string
  taxId?: string
  email?: string
  phone?: string
  lineId?: string
  address?: string
  province?: string
  district?: string
  subdistrict?: string
  postcode?: string
  note?: string
  leadStatus?: string
  avatarUrl?: string
}

function buildParams(filter: CustomerFilterParams) {
  const p: Record<string, string> = {}
  if (filter.search) p.search = filter.search
  if (filter.type) p.type = filter.type
  if (filter.leadStatus) p.leadStatus = filter.leadStatus
  if (filter.page) p.page = String(filter.page)
  if (filter.pageSize) p.pageSize = String(filter.pageSize)
  return p
}

export function useCustomers(filter: CustomerFilterParams = {}) {
  return useQuery<CustomerListResponse>({
    queryKey: ['customers', filter],
    queryFn: async () => {
      const { data } = await api.get('/customers', { params: buildParams(filter) })
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export function useCustomer(id: number) {
  return useQuery<Customer>({
    queryKey: ['customers', id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateCustomerPayload) => {
      const { data } = await api.post('/customers', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<CreateCustomerPayload>) => {
      const { data } = await api.patch(`/customers/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customers', id] })
    },
  })
}

export function useUpdateLeadStatus(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (leadStatus: string) => {
      const { data } = await api.patch(`/customers/${id}/lead-status`, { leadStatus })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customers', id] })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/customers/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useCreateCustomerAccount(customerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post(`/customers/${customerId}/account`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', customerId] }),
  })
}

export function useUpdateCustomerAccount(customerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email?: string; password?: string }) => {
      const { data } = await api.patch(`/customers/${customerId}/account`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', customerId] }),
  })
}

export function useDeleteCustomerAccount(customerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/customers/${customerId}/account`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', customerId] }),
  })
}

export function useSendCustomerCredentials(customerId: number) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/customers/${customerId}/send-credentials`)
      return data?.data ?? data
    },
  })
}

export function useUploadCustomerAvatar(customerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.patch(`/customers/${customerId}/avatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customers', customerId] })
    },
  })
}
