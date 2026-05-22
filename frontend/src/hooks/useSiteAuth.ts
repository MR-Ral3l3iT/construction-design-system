'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SiteUser {
  id: number
  name: string
  email: string
  roles: string[]
  permissions: string[]
}

export function useSiteMe() {
  return useQuery<SiteUser>({
    queryKey: ['site-me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data?.data ?? data
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSiteLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', payload)
      const resp = data?.data ?? data
      const token = resp?.accessToken
      if (token) localStorage.setItem('access_token', token)
      return resp
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-me'] }),
  })
}

export function useSiteLogout() {
  const qc = useQueryClient()
  return () => {
    localStorage.removeItem('access_token')
    qc.clear()
    window.location.href = '/site/login'
  }
}
