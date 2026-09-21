'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type AccountType = 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY'

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  INCOME: 'รายได้',
  EXPENSE: 'ค่าใช้จ่าย',
  ASSET: 'สินทรัพย์',
  LIABILITY: 'หนี้สิน',
  EQUITY: 'ทุน',
}

export interface ChartOfAccountNode {
  id: number
  code: string
  name: string
  type: AccountType
  parentId: number | null
  isActive: boolean
  sortOrder: number
  children: ChartOfAccountNode[]
}

export interface WhtRate {
  id: number
  code: string
  rate: number
  percent: number
  description: string
  section: string | null
  isActive: boolean
  sortOrder: number
}

export interface DocumentSequenceStatus {
  docType: string
  label: string
  prefix: string
  period: string
  currentNo: number
  digits: number
  issuedCount: number
  nextNumber: string
}

export interface FiscalPeriod {
  id: number
  year: number
  month: number
  isClosed: boolean
  closedAt: string | null
  note: string | null
}

// ─── Chart of Accounts ────────────────────────────────────────────────────────

export function useChartOfAccounts(includeInactive = false) {
  return useQuery<ChartOfAccountNode[]>({
    queryKey: ['chart-of-accounts', includeInactive],
    queryFn: async () => {
      const { data } = await api.get('/chart-of-accounts', { params: { includeInactive } })
      return data?.data ?? data
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      code: string
      name: string
      type: AccountType
      parentId?: number
    }) => {
      const { data } = await api.post('/chart-of-accounts', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: number } & Partial<{
      name: string
      type: AccountType
      parentId: number | null
      isActive: boolean
    }>) => {
      const { data } = await api.patch(`/chart-of-accounts/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/chart-of-accounts/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }),
  })
}

// ─── WHT rates ────────────────────────────────────────────────────────────────

export function useWhtRates(includeInactive = false) {
  return useQuery<WhtRate[]>({
    queryKey: ['wht-rates', includeInactive],
    queryFn: async () => {
      const { data } = await api.get('/wht-rates', { params: { includeInactive } })
      return data?.data ?? data
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateWhtRate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      code: string
      percent: number
      description: string
      section?: string
    }) => {
      const { data } = await api.post('/wht-rates', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wht-rates'] }),
  })
}

export function useUpdateWhtRate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: number } & Partial<{
      percent: number
      description: string
      section: string
      isActive: boolean
    }>) => {
      const { data } = await api.patch(`/wht-rates/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wht-rates'] }),
  })
}

// ─── Document sequences ───────────────────────────────────────────────────────

export function useDocumentSequences() {
  return useQuery<DocumentSequenceStatus[]>({
    queryKey: ['document-sequences'],
    queryFn: async () => {
      const { data } = await api.get('/document-sequences')
      return data?.data ?? data
    },
    staleTime: 60_000,
  })
}

// ─── Fiscal periods ───────────────────────────────────────────────────────────

export function useFiscalPeriods(year?: number) {
  return useQuery<FiscalPeriod[]>({
    queryKey: ['fiscal-periods', year],
    queryFn: async () => {
      const { data } = await api.get('/fiscal-periods', { params: year ? { year } : {} })
      return data?.data ?? data
    },
  })
}
