'use client'

import { type LucideIcon, Bell, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

export interface NavbarAction {
  icon: LucideIcon
  label: string
  badge?: number
  onClick?: () => void
}

export interface NavbarUser {
  name: string
  role?: string
  avatarUrl?: string
}

export interface NavbarProps {
  title?: string
  user?: NavbarUser
  actions?: NavbarAction[]
  onMenuToggle?: () => void
  onLogout?: () => void
  onSettings?: () => void
  className?: string
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-500',
]

function nameToColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function Avatar({ user }: { user: NavbarUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-100"
      />
    )
  }
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
        nameToColor(user.name),
      )}
    >
      {initials}
    </div>
  )
}

export function Navbar({
  title,
  user,
  actions = [],
  onMenuToggle,
  onLogout,
  onSettings,
  className,
}: NavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-gray-100 bg-white px-5 shadow-sm',
        className,
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
            aria-label="เปิด/ปิด menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {title && <h2 className="text-sm font-semibold text-gray-700">{title}</h2>}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            title={action.label}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <action.icon className="h-5 w-5" aria-hidden />
            {action.badge !== undefined && action.badge > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {action.badge > 9 ? '9+' : action.badge}
              </span>
            )}
            <span className="sr-only">{action.label}</span>
          </button>
        ))}

        {/* Divider */}
        {actions.length > 0 && user && <div className="mx-2 h-6 w-px bg-gray-200" />}

        {user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((p) => !p)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            >
              <Avatar user={user} />
              <div className="hidden text-left lg:block">
                <p className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</p>
                {user.role && (
                  <p className="text-[11px] text-gray-400 leading-tight">{user.role}</p>
                )}
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 lg:block" aria-hidden />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-black/5">
                  <div className="border-b border-gray-100 px-4 py-2.5">
                    <p className="text-xs font-semibold text-gray-900">{user.name}</p>
                    {user.role && <p className="text-[11px] text-gray-400">{user.role}</p>}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      โปรไฟล์
                    </button>
                    {onSettings && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          onSettings()
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        ตั้งค่า
                      </button>
                    )}
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    {onLogout && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          onLogout()
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        ออกจากระบบ
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
