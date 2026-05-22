'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

interface LoginPayload {
  email: string
  password: string
}

export function useLogin() {
  const { setAuth } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post('/auth/login', payload)
      return data?.data ?? data
    },
    onSuccess: (data) => {
      const user = data.user ?? data
      const token = data.accessToken

      setAuth(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          roles: user.roles?.map((r: { name: string }) => r.name) ?? [],
        },
        token,
      )
      router.push('/admin/dashboard')
    },
  })
}
