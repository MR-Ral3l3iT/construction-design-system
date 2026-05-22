'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, ChevronRight, MapPin, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useClientProjects } from '@/hooks/useClientProjects'

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ (DS)',
  CONSTRUCTION: 'ก่อสร้าง (CN)',
  TURNKEY: 'ออกแบบ + ก่อสร้าง (DC)',
}

export default function ClientProjectsPage() {
  const router = useRouter()
  const { data: projects, isLoading } = useClientProjects()

  // Auto-redirect for single-project customers
  useEffect(() => {
    if (!isLoading && projects?.length === 1) {
      router.replace(`/client/projects/${projects[0].id}`)
    }
  }, [isLoading, projects, router])

  if (isLoading || projects?.length === 1) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!projects?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <FolderKanban className="h-12 w-12 text-gray-300" />
        <p className="mt-3 text-gray-500">ยังไม่มีโครงการ</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">โครงการของฉัน</h1>
      <div className="space-y-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/client/projects/${p.id}`}
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm active:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono text-xs text-gray-400">{p.code}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="font-semibold text-gray-900 truncate">{p.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>{TYPE_LABEL[p.type] ?? p.type}</span>
                {(p.addressLine || p.province) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[p.district, p.province].filter(Boolean).join(' ')}
                  </span>
                )}
                {p.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.startDate).toLocaleDateString('th-TH')}
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-primary-500 transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-primary-600">{p.progress}%</span>
              </div>
            </div>
            <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
