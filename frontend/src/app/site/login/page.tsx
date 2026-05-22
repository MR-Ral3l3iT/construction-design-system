'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hammer } from 'lucide-react'
import { useSiteLogin } from '@/hooks/useSiteAuth'

export default function SiteLoginPage() {
  const router = useRouter()
  const loginMutation = useSiteLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await loginMutation.mutateAsync({ email, password })
      router.push('/site/projects')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500">
            <Hammer className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Site Portal</h1>
          <p className="mt-1 text-sm text-gray-500">สำหรับทีมหน้างานก่อสร้าง</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-base font-semibold text-white transition hover:bg-orange-600 active:scale-95 disabled:opacity-60"
            >
              {loginMutation.isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
