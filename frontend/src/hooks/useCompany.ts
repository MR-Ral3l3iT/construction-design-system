'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface BankAccount {
  id: number
  name: string
  bankName: string
  branchName: string | null
  accountType: string
  accountName: string
  accountNo: string
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

export interface CompanyProfile {
  id: number
  code: string
  name: string
  branchName: string
  branchCode: string
  taxId: string | null
  address: string | null
  contactLine: string | null
  phone: string | null
  email: string | null
  website: string | null
  logoUrl: string | null
  signatureUrl: string | null
  signatureName: string | null
  isVatRegistered: boolean
  defaultVatRate: number
  bankAccounts: BankAccount[]
}

export interface UpdateCompanyPayload {
  name?: string
  branchName?: string
  branchCode?: string
  taxId?: string
  address?: string
  contactLine?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  signatureUrl?: string
  signatureName?: string
  isVatRegistered?: boolean
  defaultVatPercent?: number
}

export interface BankAccountPayload {
  name: string
  bankName: string
  branchName?: string
  accountType?: string
  accountName: string
  accountNo: string
  isDefault?: boolean
  isActive?: boolean
  sortOrder?: number
}

const COMPANY_KEY = ['company'] as const

export function useCompany() {
  return useQuery<CompanyProfile>({
    queryKey: COMPANY_KEY,
    queryFn: async () => {
      const { data } = await api.get('/company')
      return data?.data ?? data
    },
    staleTime: 5 * 60_000,
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateCompanyPayload) => {
      const { data } = await api.put('/company', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}

export function useCreateBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: BankAccountPayload) => {
      const { data } = await api.post('/company/bank-accounts', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}

export function useUpdateBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<BankAccountPayload> & { id: number }) => {
      const { data } = await api.patch(`/company/bank-accounts/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}

export function useDeleteBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/company/bank-accounts/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}
