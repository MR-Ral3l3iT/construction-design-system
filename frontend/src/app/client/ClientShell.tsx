'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useClientMe } from '@/hooks/useClientAuth'
import type { ClientUser } from '@/hooks/useClientAuth'

const PUBLIC_PATHS = ['/client/login']

function ClientNavbar({ user }: { user: ClientUser }) {
  const pathname = usePathname()
  const match = pathname.match(/\/client\/projects\/(\d+)/)
  const profileHref = match ? `/client/projects/${match[1]}/profile` : '/client/projects'

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-3 px-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
        <Image
          src="/uat-logo.svg"
          alt="UAT-ARCH"
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>
      <span className="flex-1 text-base font-semibold text-white">ติดตามโครงการ</span>
      <Link
        href={profileHref}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white active:bg-white/30"
      >
        {initials}
      </Link>
    </header>
  )
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const { data: user, isLoading, isFetching } = useClientMe()

  useEffect(() => {
    if (isPublic || isLoading || isFetching) return
    if (!user) {
      router.push('/client/login')
      return
    }
    if (!user.roles?.includes('CUSTOMER')) {
      localStorage.removeItem('client_access_token')
      router.push('/client/login')
    }
  }, [isPublic, isLoading, isFetching, user, router])

  if (isPublic) {
    return <>{children}</>
  }

  if (isLoading || isFetching || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Gradient background — absolute ไม่ scroll */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -left-12 top-24 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 right-8 h-64 w-64 rounded-full bg-white/5" />
      </div>

      {/* Navbar — flex item ไม่ขยับ */}
      <ClientNavbar user={user} />

      {/* Content — scroll เฉพาะตรงนี้ */}
      <main className="flex-1 overflow-y-auto overscroll-none">{children}</main>
    </div>
  )
}
