'use client'

import { type LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

export interface SidebarItem {
  key: string
  label: string
  icon: LucideIcon
  href: string
  badge?: string | number
  children?: Omit<SidebarItem, 'icon' | 'children'>[]
}

export interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

export interface SidebarUser {
  name: string
  role: string
  avatarUrl?: string
}

export interface SidebarProps {
  logo?: React.ReactNode
  user?: SidebarUser
  sections: SidebarSection[]
  activeKey?: string
  onNavigate?: (href: string) => void
  collapsible?: boolean
  className?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Sidebar({
  logo,
  user,
  sections,
  activeKey,
  onNavigate,
  collapsible = true,
  className,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center px-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && <div className="truncate">{logo}</div>}
        {collapsible && (
          <button
            onClick={() => setCollapsed((p) => !p)}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={collapsed ? 'ขยาย sidebar' : 'ย่อ sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* User profile card */}
      {user && (
        <div className="px-3 pb-3">
          <div
            className={cn(
              'rounded-xl bg-white/5 ring-1 ring-white/8 transition-all',
              collapsed ? 'flex justify-center py-2' : 'flex items-center gap-3 px-3 py-3',
            )}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-500/40"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white ring-2 ring-primary-400/30">
                  {getInitials(user.name)}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
            </div>

            {/* Name + role */}
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-sidebar-muted">{formatRole(user.role)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-3 h-px bg-white/8" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none">
        {sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.title && !collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeKey === item.key
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => onNavigate?.(item.href)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40'
                          : 'text-white/55 hover:bg-primary-600/15 hover:text-white',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-white/40',
                        )}
                        aria-hidden
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-left">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-primary-500/20 text-primary-300',
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
