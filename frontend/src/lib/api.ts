import axios from 'axios'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004') + '/api/v1'

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
        const token = data?.data?.accessToken ?? data?.accessToken
        if (token) {
          localStorage.setItem('access_token', token)
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }
      } catch {
        localStorage.removeItem('access_token')
      }
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
