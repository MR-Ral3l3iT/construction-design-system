'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Home, ClipboardList, ImageIcon, CalendarDays, CreditCard } from 'lucide-react'

const TABS = [
  { label: 'ภาพรวม', icon: Home, segment: null },
  { label: 'รายงาน', icon: ClipboardList, segment: 'reports' },
  { label: 'แผนงาน', icon: CalendarDays, segment: 'timeline' },
  { label: 'รูปภาพ', icon: ImageIcon, segment: 'gallery' },
  { label: 'การเงิน', icon: CreditCard, segment: 'finance' },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const base = `/client/projects/${id}`

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-none">{children}</div>

      {/* Tab bar — static flex item ไม่ขยับ */}
      <nav
        className="shrink-0 border-t border-white/10 bg-primary-900/60 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {TABS.map(({ label, icon: Icon, segment }) => {
            const href = segment ? `${base}/${segment}` : base
            const isActive = segment ? pathname.startsWith(`${base}/${segment}`) : pathname === base
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/50'}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
