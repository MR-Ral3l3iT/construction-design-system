import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  email: string
  name: string
  avatar?: string | null
  roles: string[]
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken)
          document.cookie = 'has_session=1; path=/; SameSite=Lax'
        }
        set({ user, accessToken })
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          document.cookie = 'has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
        set({ user: null, accessToken: null })
      },
      isAdmin: () => get().user?.roles.includes('ADMIN') ?? false,
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && typeof window !== 'undefined') {
          localStorage.setItem('access_token', state.accessToken)
          document.cookie = 'has_session=1; path=/; SameSite=Lax'
        }
      },
    },
  ),
)
