'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface BOQItem {
  id: number
  name: string
  description: string | null
  remark: string | null
  quantity: number
  unit: string | null
  materialPrice: number
  laborPrice: number
  totalPrice: number
  sortOrder: number
}

export interface BOQSubCategory {
  id: number
  name: string
  sortOrder: number
  items?: BOQItem[]
}

export interface BOQCategory {
  id: number
  name: string
  sortOrder: number
  subCategories?: BOQSubCategory[]
}

export interface BOQDrawingRef {
  id: number
  title: string
  revisionNo: number
  status?: string
}

export interface BOQ {
  id: number
  code: string
  title: string
  status: string
  version: number
  isLocked: boolean
  materialCost: number
  laborCost: number
  overheadCost: number
  profit: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  project?: {
    id: number
    code: string
    name: string
    customer?: { name: string; phone?: string | null }
  }
  designTask?: BOQDrawingRef | null
  categories?: BOQCategory[]
}

export interface BOQListResponse {
  data: BOQ[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateBOQPayload {
  projectId: number
  title: string
  designTaskId?: number
}

export interface BOQProjectSummary {
  projectId: number
  boqCount: number
  categoryCount: number
  totalAmount: number
  materialCost: number
  laborCost: number
}

export function useBOQProjectSummaries() {
  return useQuery<BOQProjectSummary[]>({
    queryKey: ['boq', 'project-summaries'],
    queryFn: async () => {
      const { data } = await api.get('/boq/project-summaries')
      return data?.data ?? data
    },
    staleTime: 60_000,
  })
}

export function useBOQsByProject(projectId: number, page = 1) {
  return useQuery<BOQListResponse>({
    queryKey: ['boq', 'project', projectId, page],
    queryFn: async () => {
      const { data } = await api.get(`/boq/project/${projectId}`, {
        params: { page, pageSize: 20 },
      })
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useBOQ(id: number) {
  return useQuery<BOQ>({
    queryKey: ['boq', id],
    queryFn: async () => {
      const { data } = await api.get(`/boq/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateBOQ() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateBOQPayload) => {
      const { data } = await api.post('/boq', payload)
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['boq', 'project', vars.projectId] }),
  })
}

export function useUpdateBOQ(id: number, projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Partial<Omit<CreateBOQPayload, 'projectId'>> & {
        overheadCost?: number
        profit?: number
      },
    ) => {
      const { data } = await api.patch(`/boq/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq', id] })
      if (projectId) qc.invalidateQueries({ queryKey: ['boq', 'project', projectId] })
    },
  })
}

// ─── Category hooks ───────────────────────────────────────────────────────────

export function useAddBOQCategory(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; sortOrder?: number }) => {
      const { data } = await api.post(`/boq/${boqId}/categories`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

export function useUpdateBOQCategory(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: number; name: string }) => {
      const { data } = await api.patch(`/boq/categories/${categoryId}`, { name })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

export function useDeleteBOQCategory(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const { data } = await api.delete(`/boq/categories/${categoryId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

// ─── SubCategory hooks ────────────────────────────────────────────────────────

export function useAddBOQSubCategory(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
      sortOrder,
    }: {
      categoryId: number
      name: string
      sortOrder?: number
    }) => {
      const { data } = await api.post(`/boq/categories/${categoryId}/sub-categories`, {
        name,
        sortOrder,
      })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

export function useUpdateBOQSubCategory(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ subCategoryId, name }: { subCategoryId: number; name: string }) => {
      const { data } = await api.patch(`/boq/sub-categories/${subCategoryId}`, { name })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

export function useDeleteBOQSubCategory(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (subCategoryId: number) => {
      const { data } = await api.delete(`/boq/sub-categories/${subCategoryId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

// ─── Item hooks ───────────────────────────────────────────────────────────────

export interface BOQItemPayload {
  name: string
  description?: string
  remark?: string
  quantity?: string
  unit?: string
  materialPrice?: string
  laborPrice?: string
  sortOrder?: number
}

export function useAddBOQItem(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      subCategoryId,
      payload,
    }: {
      subCategoryId: number
      payload: BOQItemPayload
    }) => {
      const { data } = await api.post(`/boq/sub-categories/${subCategoryId}/items`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

export function useUpdateBOQItem(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: number; payload: BOQItemPayload }) => {
      const { data } = await api.patch(`/boq/items/${itemId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}

export function useDeleteBOQItem(boqId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete(`/boq/items/${itemId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq', boqId] }),
  })
}
