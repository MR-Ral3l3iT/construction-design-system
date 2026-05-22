'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ProjectMember {
  id: number
  roleName: string | null
  user: { id: number; name: string; email: string }
}

export interface ProjectCustomer {
  id: number
  name: string
  companyName: string | null
}

export interface Project {
  id: number
  code: string
  name: string
  type: string
  status: string
  addressLine: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  postcode: string | null
  latitude: number | null
  longitude: number | null
  areaSize: number | null
  description: string | null
  budgetMin: number | null
  budgetMax: number | null
  startDate: string | null
  endDate: string | null
  designStartDate: string | null
  designEndDate: string | null
  progress: number
  createdAt: string
  updatedAt: string
  customer: ProjectCustomer | null
  members?: ProjectMember[]
  _count?: {
    estimates: number
    designTasks: number
    boqs: number
    issues: number
    members?: number
  }
}

export interface ProjectPlanSummary {
  id: number
  templateType: string
  progress: number
  taskCounts: { total: number; completed: number; inProgress: number; blocked: number }
}

export interface ProjectListItem {
  id: number
  code: string
  name: string
  type: string
  status: string
  progress: number
  startDate: string | null
  endDate: string | null
  createdAt: string
  customer: ProjectCustomer | null
  _count: { members: number; issues: number; designTasks: number }
  plan: ProjectPlanSummary | null
}

export interface ProjectListResponse {
  data: ProjectListItem[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface ProjectFilterParams {
  search?: string
  type?: string
  status?: string
  customerId?: number
  page?: number
  pageSize?: number
}

export interface CreateProjectPayload {
  name: string
  type: string
  customerId: number
  addressLine?: string
  province?: string
  district?: string
  subdistrict?: string
  postcode?: string
  latitude?: string
  longitude?: string
  areaSize?: string
  description?: string
  budgetMin?: number
  budgetMax?: number
  startDate?: string
  endDate?: string
  designStartDate?: string
  designEndDate?: string
}

function buildParams(filter: ProjectFilterParams) {
  const p: Record<string, string> = {}
  if (filter.search) p.search = filter.search
  if (filter.type) p.type = filter.type
  if (filter.status) p.status = filter.status
  if (filter.customerId) p.customerId = String(filter.customerId)
  if (filter.page) p.page = String(filter.page)
  if (filter.pageSize) p.pageSize = String(filter.pageSize)
  return p
}

export function useProjects(filter: ProjectFilterParams = {}) {
  return useQuery<ProjectListResponse>({
    queryKey: ['projects', filter],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params: buildParams(filter) })
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export function useProject(id: number) {
  return useQuery<Project>({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const { data } = await api.post('/projects', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<CreateProjectPayload>) => {
      const { data } = await api.patch(`/projects/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useUpdateProjectStatus(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: string) => {
      const { data } = await api.patch(`/projects/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useUpdateProjectProgress(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (progress: number) => {
      const { data } = await api.patch(`/projects/${id}/progress`, { progress })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useAddProjectMember(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { userId: number; roleName?: string }) => {
      const { data } = await api.post(`/projects/${projectId}/members`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  })
}

export function useRemoveProjectMember(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: number) => {
      const { data } = await api.delete(`/projects/${projectId}/members/${memberId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/projects/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
