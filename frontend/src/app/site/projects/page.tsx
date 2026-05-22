'use client'

import Link from 'next/link'
import { FolderKanban, MapPin, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useSiteProjects } from '@/hooks/useSiteProjects'

export default function SiteProjectsPage() {
  const { data: projects, isLoading } = useSiteProjects()

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    )
  }

  if (!projects?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
          <FolderKanban className="h-8 w-8 text-orange-400" />
        </div>
        <p className="mt-3 font-medium text-gray-700">ยังไม่มีโครงการที่รับผิดชอบ</p>
        <p className="mt-1 text-sm text-gray-400">ติดต่อผู้จัดการโครงการเพื่อเพิ่มคุณเข้าทีม</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">โครงการที่รับผิดชอบ</h1>
      <div className="space-y-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/site/projects/${p.id}`}
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm active:scale-98"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={p.status} />
                {p.members[0]?.roleName && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {p.members[0].roleName}
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-900 truncate">{p.name}</p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{p.code}</p>
              {(p.addressLine || p.province) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {[p.addressLine, p.district, p.province].filter(Boolean).join(' ')}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-orange-500 transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-orange-600">{p.progress}%</span>
              </div>
            </div>
            <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
