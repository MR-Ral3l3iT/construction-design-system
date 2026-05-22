'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PlanTemplateType = string
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED'

export interface TemplateTask {
  id: number
  title: string
  description: string | null
  defaultDuration: number | null
  sortOrder: number
  isOptional: boolean
}

export interface TemplatePhase {
  id: number
  name: string
  sortOrder: number
  tasks: TemplateTask[]
}

export interface PlanTemplate {
  id: number
  name: string
  type: PlanTemplateType
  phases: TemplatePhase[]
}

export interface PlanTask {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  progress: number
  startDate: string | null
  endDate: string | null
  sortOrder: number
}

export interface PlanPhase {
  id: number
  name: string
  sortOrder: number
  tasks: PlanTask[]
}

export interface ProjectPlan {
  id: number
  templateType: PlanTemplateType | null
  createdAt: string
  updatedAt: string
  project: { id: number; code: string; name: string }
  phases: PlanPhase[]
}

export interface CreatePlanPayload {
  projectId: number
  templateType: PlanTemplateType
}

export interface UpdateTaskPayload {
  title?: string
  description?: string
  status?: TaskStatus
  progress?: number
  startDate?: string
  endDate?: string
  sortOrder?: number
}

export interface AddTaskPayload {
  title: string
  description?: string
  startDate?: string
  endDate?: string
  sortOrder?: number
}

export function usePlanTemplates() {
  return useQuery<PlanTemplate[]>({
    queryKey: ['plan-templates'],
    queryFn: async () => {
      const { data } = await api.get('/project-plans/templates')
      return data?.data ?? data
    },
    staleTime: 5 * 60_000,
  })
}

export function useProjectPlanByProject(projectId: number) {
  return useQuery<ProjectPlan | null>({
    queryKey: ['project-plan', 'project', projectId],
    queryFn: async () => {
      const res = await api.get(`/project-plans/project/${projectId}`)
      // ResponseInterceptor wraps as { data: plan | null }; must not fall through to wrapper when data is null
      return res.data?.data ?? null
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useProjectPlan(id: number) {
  return useQuery<ProjectPlan>({
    queryKey: ['project-plan', id],
    queryFn: async () => {
      const res = await api.get(`/project-plans/${id}`)
      return res.data?.data ?? res.data
    },
    enabled: id > 0,
    staleTime: 30_000,
  })
}

export function useCreateProjectPlan(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      const { data } = await api.post('/project-plans', payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-plan', 'project', projectId] })
    },
  })
}

export function useUpdatePlanTask(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: number; payload: UpdateTaskPayload }) => {
      const { data } = await api.patch(`/project-plans/tasks/${taskId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-plan', planId] })
      qc.invalidateQueries({ queryKey: ['project-plan', 'project'] })
    },
  })
}

export function useAddPlanTask(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ phaseId, payload }: { phaseId: number; payload: AddTaskPayload }) => {
      const { data } = await api.post(`/project-plans/phases/${phaseId}/tasks`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-plan', planId] })
      qc.invalidateQueries({ queryKey: ['project-plan', 'project'] })
    },
  })
}

export function useDeletePlanTask(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: number) => {
      const { data } = await api.delete(`/project-plans/tasks/${taskId}`)
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-plan', planId] })
      qc.invalidateQueries({ queryKey: ['project-plan', 'project'] })
    },
  })
}

// ─── Template Management Hooks ────────────────────────────────────────────────

export interface CreateTemplatePayload {
  name: string
  type: string
}
export interface UpdateTemplatePayload {
  name?: string
}
export interface CreateTemplatePhasePayload {
  name: string
  sortOrder?: number
}
export interface UpdateTemplatePhasePayload {
  name?: string
  sortOrder?: number
}
export interface CreateTemplateTaskPayload {
  title: string
  description?: string
  defaultDuration?: number
  isOptional?: boolean
  sortOrder?: number
}
export interface UpdateTemplateTaskPayload {
  title?: string
  description?: string
  defaultDuration?: number
  isOptional?: boolean
  sortOrder?: number
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data } = await api.post('/project-plans/templates', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateTemplatePayload }) => {
      const { data } = await api.patch(`/project-plans/templates/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/project-plans/templates/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useAddTemplatePhase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      templateId,
      payload,
    }: {
      templateId: number
      payload: CreateTemplatePhasePayload
    }) => {
      const { data } = await api.post(`/project-plans/templates/${templateId}/phases`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useUpdateTemplatePhase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      phaseId,
      payload,
    }: {
      phaseId: number
      payload: UpdateTemplatePhasePayload
    }) => {
      const { data } = await api.patch(`/project-plans/template-phases/${phaseId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useDeleteTemplatePhase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (phaseId: number) => {
      const { data } = await api.delete(`/project-plans/template-phases/${phaseId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useAddTemplateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      phaseId,
      payload,
    }: {
      phaseId: number
      payload: CreateTemplateTaskPayload
    }) => {
      const { data } = await api.post(`/project-plans/template-phases/${phaseId}/tasks`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useUpdateTemplateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: UpdateTemplateTaskPayload
    }) => {
      const { data } = await api.patch(`/project-plans/template-tasks/${taskId}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useDeleteTemplateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: number) => {
      const { data } = await api.delete(`/project-plans/template-tasks/${taskId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}
