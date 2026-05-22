'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { EmptyState, Pagination } from '@construction/ui'
import { LoadingState } from '@/components/shared/LoadingState'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useProjects } from '@/hooks/useProjects'
import { useDebounce } from '@/hooks/useDebounce'

export function AllIssuesContent() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useProjects({ search: debouncedSearch, page, pageSize: 20 })
  const projects = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">เลือกโครงการเพื่อดูและจัดการปัญหา</p>
        {meta && <span className="text-sm text-gray-400">{meta.totalItems} โครงการ</span>}
      </div>

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="ค้นหาชื่อโครงการ, รหัส..."
      />

      {isLoading ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="ไม่พบโครงการ" description="ลองเปลี่ยนคำค้นหา" />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border border-gray-200 bg-white">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/admin/issues?projectId=${p.id}`)}
              className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-colors group-hover:bg-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-gray-900">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-mono">{p.code}</span>
                  {p.customer && (
                    <>
                      <span>·</span>
                      <span>{p.customer.companyName || p.customer.name}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary-400" />
            </button>
          ))}
        </div>
      )}

      {meta && projects.length > 0 && (
        <div className="flex justify-end">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
