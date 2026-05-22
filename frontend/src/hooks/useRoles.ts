'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Permission {
  id: number
  key: string
  name: string
  group: string
}

export interface RolePermission {
  permission: Permission
}

export interface Role {
  id: number
  name: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  permissions?: RolePermission[]
  _count?: { users: number }
}

export interface PermissionsGrouped {
  [group: string]: Permission[]
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles')
      return data?.data ?? data
    },
    staleTime: 60_000,
  })
}

export function useRole(id: number) {
  return useQuery<Role>({
    queryKey: ['roles', id],
    queryFn: async () => {
      const { data } = await api.get(`/roles/${id}`)
      return data?.data ?? data
    },
    enabled: id > 0,
  })
}

export function usePermissionsGrouped() {
  return useQuery<PermissionsGrouped>({
    queryKey: ['permissions', 'grouped'],
    queryFn: async () => {
      const { data } = await api.get('/permissions/grouped')
      return data?.data ?? data
    },
    staleTime: 300_000,
  })
}

export function useUpdateRolePermissions(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (permissionKeys: string[]) => {
      const { data } = await api.patch(`/roles/${id}/permissions`, { permissionKeys })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['roles', id] })
    },
  })
}
