'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface TaskFile {
  id: number
  filename: string
  originalName: string
  mimeType: string | null
  size: number | null
  url: string | null
  storageKey: string
  createdAt: string
  uploadedBy: { id: number; name: string } | null
}

export function useTaskFiles(planTaskId: number) {
  return useQuery<TaskFile[]>({
    queryKey: ['task-files', planTaskId],
    queryFn: async () => {
      const res = await api.get(`/files/plan-task/${planTaskId}`)
      return res.data?.data ?? res.data ?? []
    },
    enabled: planTaskId > 0,
    staleTime: 30_000,
  })
}

export function useUploadTaskFiles(planTaskId: number, projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (files: File[]) => {
      const results = []
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const res = await api.post(
          `/files/upload?planTaskId=${planTaskId}&projectId=${projectId}&category=PLAN`,
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        results.push(res.data?.data ?? res.data)
      }
      return results
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-files', planTaskId] })
    },
  })
}

export function useDeleteTaskFile(planTaskId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: number) => {
      await api.delete(`/files/${fileId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-files', planTaskId] })
    },
  })
}
