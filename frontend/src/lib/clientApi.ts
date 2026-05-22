import axios from 'axios'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004') + '/api/v1'

export const clientApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

clientApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('client_access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

clientApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
        const token = data?.data?.accessToken ?? data?.accessToken
        if (token) {
          localStorage.setItem('client_access_token', token)
          original.headers.Authorization = `Bearer ${token}`
          return clientApi(original)
        }
      } catch {
        localStorage.removeItem('client_access_token')
      }
      if (typeof window !== 'undefined') window.location.href = '/client/login'
    }
    return Promise.reject(error)
  },
)
