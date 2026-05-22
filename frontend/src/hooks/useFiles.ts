'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface FileAsset {
  id: number
  filename: string
  originalName: string
  mimeType: string | null
  size: number
  storageKey: string
  url: string
  category: string
  createdAt: string
  uploadedBy?: { id: number; name: string } | null
}

export interface UploadFileParams {
  projectId?: number
  designTaskId?: number
  dailyUpdateId?: number
  issueId?: number
  file: File
  category?: string
}

export interface Comment {
  id: number
  message: string
  targetType: string
  targetId: number
  createdAt: string
  updatedAt: string
  user: { id: number; name: string; avatar?: string | null }
}

export function useFilesByProject(projectId: number) {
  return useQuery<FileAsset[]>({
    queryKey: ['files', 'project', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/files/project/${projectId}`)
      return data?.data ?? data
    },
    enabled: projectId > 0,
    staleTime: 30_000,
  })
}

export function useFilesByDesignTask(designTaskId: number) {
  return useQuery<FileAsset[]>({
    queryKey: ['files', 'design-task', designTaskId],
    queryFn: async () => {
      const { data } = await api.get(`/files/design-task/${designTaskId}`)
      return data?.data ?? data
    },
    enabled: designTaskId > 0,
    staleTime: 30_000,
  })
}

export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      projectId,
      designTaskId,
      dailyUpdateId,
      issueId,
      file,
      category,
    }: UploadFileParams) => {
      const form = new FormData()
      form.append('file', file)
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', String(projectId))
      if (designTaskId) params.set('designTaskId', String(designTaskId))
      if (dailyUpdateId) params.set('dailyUpdateId', String(dailyUpdateId))
      if (issueId) params.set('issueId', String(issueId))
      if (category) params.set('category', category)
      const { data } = await api.post(`/files/upload?${params}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data?.data ?? data
    },
    onSuccess: (_d, vars) => {
      if (vars.projectId) qc.invalidateQueries({ queryKey: ['files', 'project', vars.projectId] })
      if (vars.designTaskId)
        qc.invalidateQueries({ queryKey: ['files', 'design-task', vars.designTaskId] })
      if (vars.dailyUpdateId)
        qc.invalidateQueries({ queryKey: ['files', 'daily-update', vars.dailyUpdateId] })
      if (vars.issueId) qc.invalidateQueries({ queryKey: ['files', 'issue', vars.issueId] })
    },
  })
}

export function useFilesByDailyUpdate(dailyUpdateId: number) {
  return useQuery<FileAsset[]>({
    queryKey: ['files', 'daily-update', dailyUpdateId],
    queryFn: async () => {
      const { data } = await api.get(`/files/daily-update/${dailyUpdateId}`)
      return data?.data ?? data
    },
    enabled: dailyUpdateId > 0,
    staleTime: 30_000,
  })
}

export function useFilesByIssue(issueId: number) {
  return useQuery<FileAsset[]>({
    queryKey: ['files', 'issue', issueId],
    queryFn: async () => {
      const { data } = await api.get(`/files/issue/${issueId}`)
      return data?.data ?? data
    },
    enabled: issueId > 0,
    staleTime: 30_000,
  })
}

export function useDeleteFile(cacheKey: { projectId?: number; designTaskId?: number }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/files/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => {
      if (cacheKey.projectId)
        qc.invalidateQueries({ queryKey: ['files', 'project', cacheKey.projectId] })
      if (cacheKey.designTaskId)
        qc.invalidateQueries({ queryKey: ['files', 'design-task', cacheKey.designTaskId] })
    },
  })
}

export function useDesignTaskComments(designTaskId: number) {
  return useQuery<Comment[]>({
    queryKey: ['comments', 'design-task', designTaskId],
    queryFn: async () => {
      const { data } = await api.get('/comments', {
        params: { targetType: 'DESIGN_TASK', targetId: designTaskId },
      })
      return data?.data ?? data
    },
    enabled: designTaskId > 0,
    staleTime: 15_000,
  })
}

export function useCreateComment(designTaskId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post('/comments', {
        targetType: 'DESIGN_TASK',
        targetId: designTaskId,
        message,
      })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', 'design-task', designTaskId] }),
  })
}

export function useDeleteComment(designTaskId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: number) => {
      const { data } = await api.delete(`/comments/${commentId}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', 'design-task', designTaskId] }),
  })
}
