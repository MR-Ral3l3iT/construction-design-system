'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface UserRole {
  role: { id: number; name: string }
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  status: string
  createdAt: string
  roles?: UserRole[]
}

export interface UserListResponse {
  data: User[]
  meta: { totalItems: number; page: number; pageSize: number; totalPages: number }
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  phone?: string
  roleIds?: number[]
}

export interface UpdateUserPayload {
  name?: string
  phone?: string
  status?: string
  password?: string
  roleIds?: number[]
}

export function useUsers(filter: { search?: string; status?: string; role?: string } = {}) {
  return useQuery<UserListResponse>({
    queryKey: ['users', filter],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { ...filter, pageSize: 50 } })
      return data?.data ?? data
    },
    staleTime: 30_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await api.post('/users', payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateUserPayload) => {
      const { data } = await api.patch(`/users/${id}`, payload)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/users/${id}`)
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
