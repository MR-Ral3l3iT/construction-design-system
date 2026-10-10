'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** ยอดเงินจาก backend เป็น string (Prisma Decimal) — แปลงด้วย Number() ตอนแสดงผลเท่านั้น */
type Money = string

export interface DocumentInstallment {
  id: number
  installmentNo: number
  description: string
  triggerText: string | null
  withinWeeks: number | null
  percentage: Money
  amount: Money
}

export interface DocumentSchedulePhase {
  id: number
  name: string
  description: string | null
  startWeek: number
  durationWeeks: number
  sortOrder: number
}

export interface AccountingDocument {
  id: number
  code: string | null
  docType: string
  status: 'DRAFT' | 'CONFIRMED' | 'SUPERSEDED' | 'VOIDED'
  revisionNo: number
  documentDate: string
  dueDate: string | null
  projectId: number | null
  estimateId: number | null
  sellerName: string | null
  sellerBranchCode: string | null
  sellerTaxId: string | null
  sellerAddress: string | null
  sellerContact: string | null
  partyName: string | null
  partyBranchCode: string | null
  partyTaxId: string | null
  partyAddress: string | null
  partyContact: string | null
  partyPhone: string | null
  partyEmail: string | null
  projectName: string | null
  subtotal: Money
  baseAmount: Money
  vatRate: Money
  vatAmount: Money
  whtRate: Money
  whtAmount: Money
  grandTotal: Money
  netAmount: Money
  note: string | null
  voidReason: string | null
  supersededBy: { id: number; code: string | null } | null
  items: {
    id: number
    name: string
    description: string | null
    quantity: Money
    unit: string | null
    unitPrice: Money
    amount: Money
    isNote: boolean
  }[]
  installments: DocumentInstallment[]
  schedule: DocumentSchedulePhase[]
}

export interface DocumentPrintData extends AccountingDocument {
  installments: (DocumentInstallment & {
    timingText: string
    vatAmount: Money
    whtAmount: Money
    netAmount: Money
  })[]
  sellerLogoUrl: string | null
  sellerSignatureName: string | null
}

export interface IssueQuotationPayload {
  documentDate?: string
  vatPercent?: number
  whtRateId?: number | null
  validDays?: number
  note?: string
}

export function useDocumentPrintData(id: number) {
  return useQuery<DocumentPrintData>({
    queryKey: ['documents', id, 'print'],
    queryFn: async () => {
      const { data } = await api.get(`/documents/${id}/print-data`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

/** ออกใบเสนอราคา (หรือฉบับแก้ไข) จาก Estimate */
export function useIssueQuotation(estimateId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: IssueQuotationPayload) => {
      const { data } = await api.post(`/documents/from-estimate/${estimateId}`, payload)
      return (data?.data ?? data) as AccountingDocument
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useVoidDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { data } = await api.post(`/documents/${id}/void`, { reason })
      return (data?.data ?? data) as AccountingDocument
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
