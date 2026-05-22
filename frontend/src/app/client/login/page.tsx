'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Lock, Mail, X, Share, MoreVertical, PlusSquare } from 'lucide-react'
import { useClientLogin } from '@/hooks/useClientAuth'

function useInstallHint() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_hint_dismissed')
    if (dismissed) return

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    if (isStandalone) return

    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)

    if (isIOS) {
      setPlatform('ios')
      setShow(true)
    } else if (isAndroid) {
      setPlatform('android')
      setShow(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('pwa_hint_dismissed', '1')
    setShow(false)
  }

  return { show, platform, dismiss }
}

function InstallHint({
  platform,
  onDismiss,
}: {
  platform: 'ios' | 'android'
  onDismiss: () => void
}) {
  return (
    <div className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Image
              src="/uat-logo.svg"
              alt=""
              width={18}
              height={18}
              className="object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">เพิ่มแอปลงหน้าจอหลัก</p>
            <p className="mt-0.5 text-xs text-primary-100">
              {platform === 'ios' ? 'เปิดเมนู' : 'แตะเมนู'}{' '}
              {platform === 'ios' ? (
                <span className="inline-flex items-center gap-0.5 font-medium">
                  <Share className="inline h-3.5 w-3.5" /> แชร์
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 font-medium">
                  <MoreVertical className="inline h-3.5 w-3.5" /> เมนู
                </span>
              )}
              {' → '}
              <span className="inline-flex items-center gap-0.5 font-medium">
                <PlusSquare className="inline h-3.5 w-3.5" />
                {platform === 'ios' ? ' เพิ่มไปยังหน้าจอโฮม' : ' เพิ่มลงในหน้าจอหลัก'}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="-mr-1 -mt-1 rounded-full p-1.5 text-white/60 active:bg-white/10"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function ClientLoginPage() {
  const router = useRouter()
  const loginMutation = useClientLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { show: showHint, platform, dismiss: dismissHint } = useInstallHint()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const result = await loginMutation.mutateAsync({ email, password })
      const roles: string[] = result?.user?.roles ?? []
      if (!roles.includes('CUSTOMER')) {
        setError('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน Client Portal')
        localStorage.removeItem('client_access_token')
        return
      }
      router.push('/client/projects')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
      <div className="absolute -left-12 top-24 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-white/5" />
      <div className="absolute bottom-32 -left-16 h-40 w-40 rounded-full bg-white/5" />

      {/* Content */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5">
        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg backdrop-blur-sm">
            <Image
              src="/uat-logo.svg"
              alt="UAT-ARCH"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ระบบติดตามโครงการ</h1>
          <p className="mt-1.5 text-sm text-primary-100">เข้าสู่ระบบเพื่อดูความคืบหน้าโครงการ</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm rounded-3xl bg-white/10 p-6 shadow-xl backdrop-blur-md ring-1 ring-white/20">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary-700" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                placeholder="อีเมล"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary-700" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                placeholder="รหัสผ่าน"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-100 ring-1 ring-red-400/30">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-1 w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-primary-700 shadow-sm transition active:bg-primary-50 disabled:opacity-60"
            >
              {loginMutation.isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>

        {/* PWA install hint */}
        {showHint && platform && (
          <div className="mt-4 w-full max-w-sm">
            <InstallHint platform={platform} onDismiss={dismissHint} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative pb-4 text-center">
        <p className="text-xs text-primary-200">ระบบติดตามความก้าวหน้าของโครงการ</p>
        <p className="mt-0.5 text-xs text-primary-200">บริษัท ฃวด จำกัด</p>
      </div>
    </div>
  )
}
