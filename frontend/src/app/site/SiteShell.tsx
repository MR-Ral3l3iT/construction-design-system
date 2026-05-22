'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, LogOut, Hammer } from 'lucide-react'
import { useSiteMe, useSiteLogout } from '@/hooks/useSiteAuth'

const PUBLIC_PATHS = ['/site/login']

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const { data: user, isLoading } = useSiteMe()
  const logout = useSiteLogout()

  useEffect(() => {
    if (!isPublic && !isLoading && !user) {
      router.push('/site/login')
    }
  }, [isPublic, isLoading, user, router])

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top header */}
      <header className="sticky top-0 z-10 bg-orange-500 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">Site Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-orange-100">{user.name}</span>
            <button
              onClick={logout}
              className="rounded-lg p-1 text-orange-100 hover:bg-orange-600 active:scale-90"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white">
        <Link
          href="/site/projects"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition ${
            pathname.startsWith('/site/projects') ? 'text-orange-500' : 'text-gray-500'
          }`}
        >
          <FolderKanban className="h-6 w-6" />
          โครงการ
        </Link>
      </nav>
    </div>
  )
}
