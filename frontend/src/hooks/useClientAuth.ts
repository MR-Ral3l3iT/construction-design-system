'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientApi } from '@/lib/clientApi'

export interface ClientUser {
  id: number
  name: string
  email: string
  roles: string[]
  permissions: string[]
  customerId?: number
}

export function useClientMe() {
  return useQuery<ClientUser>({
    queryKey: ['client-me'],
    queryFn: async () => {
      const { data } = await clientApi.get('/auth/me')
      return data?.data ?? data
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClientLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await clientApi.post('/auth/login', payload)
      const resp = data?.data ?? data
      const token = resp?.accessToken
      if (token) localStorage.setItem('client_access_token', token)
      return resp
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['client-me'] })
    },
  })
}

export function useClientLogout() {
  const qc = useQueryClient()
  return () => {
    localStorage.removeItem('client_access_token')
    qc.clear()
    window.location.href = '/client/login'
  }
}
