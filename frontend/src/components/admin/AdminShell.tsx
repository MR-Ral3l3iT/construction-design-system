'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Navbar, Sidebar } from '@construction/ui'
import { Bell } from 'lucide-react'
import { adminNavSections } from './adminNav'
import { useAuthStore } from '@/stores/auth.store'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()

  const activeKey =
    adminNavSections.flatMap((s) => s.items).find((item) => pathname.startsWith(item.href))?.key ??
    ''

  function handleLogout() {
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50/80">
      {/* Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          logo={<span className="text-sm font-bold tracking-wide text-white">UAT-ARCH System</span>}
          user={
            user
              ? { name: user.name, role: user.roles[0] ?? 'ADMIN' }
              : { name: 'Admin', role: 'ADMIN' }
          }
          sections={adminNavSections}
          activeKey={activeKey}
          onNavigate={(href) => router.push(href)}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          user={
            user
              ? { name: user.name, role: user.roles[0] ?? 'ADMIN' }
              : { name: 'Admin', role: 'ADMIN' }
          }
          actions={[{ icon: Bell, label: 'การแจ้งเตือน', badge: 0 }]}
          onMenuToggle={() => {}}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
