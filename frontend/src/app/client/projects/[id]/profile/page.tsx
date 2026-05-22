'use client'

import { useParams } from 'next/navigation'
import { LogOut, User, Mail, Phone, Building2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useClientMe, useClientLogout } from '@/hooks/useClientAuth'
import { useClientProject } from '@/hooks/useClientProjects'

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: user } = useClientMe()
  const { data: project } = useClientProject(Number(id))
  const logout = useClientLogout()

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div className="space-y-4 p-4">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700 shadow-sm">
          {initials}
        </div>
        <h1 className="mt-3 text-xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-sm text-gray-400">{user?.email}</p>
      </div>

      {/* User Info */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
          <User className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">ชื่อ</p>
            <p className="text-sm font-medium text-gray-800">{user?.name ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Mail className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">อีเมล</p>
            <p className="text-sm font-medium text-gray-800">{user?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Current Project */}
      {project && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <Link
            href="/client/projects"
            className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50"
          >
            <Building2 className="h-4 w-4 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400">โครงการที่กำลังดู</p>
              <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white py-3.5 text-sm font-medium text-red-500 shadow-sm active:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        ออกจากระบบ
      </button>

      <p className="text-center text-xs text-gray-300 pb-2">Client Portal · ระบบติดตามโครงการ</p>
    </div>
  )
}
