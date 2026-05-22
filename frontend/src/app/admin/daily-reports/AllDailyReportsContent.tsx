'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HardHat, ChevronRight, FileText, AlertTriangle } from 'lucide-react'
import { Badge, EmptyState, Pagination } from '@construction/ui'
import { LoadingState } from '@/components/shared/LoadingState'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDailyReportProjectSummaries } from '@/hooks/useDailyReports'

const PAGE_SIZE = 20

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600">{value}%</span>
    </div>
  )
}

export function AllDailyReportsContent() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: summaries = [], isLoading } = useDailyReportProjectSummaries()

  const filtered = summaries.filter(
    (s) =>
      !search ||
      s.project.name.toLowerCase().includes(search.toLowerCase()) ||
      s.project.code.toLowerCase().includes(search.toLowerCase()),
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">เลือกโครงการเพื่อดูและจัดการรายงาน</p>
        {filtered.length > 0 && (
          <span className="text-sm text-gray-400">{filtered.length} โครงการ</span>
        )}
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
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="ไม่พบโครงการ"
          description={search ? 'ลองเปลี่ยนคำค้นหา' : 'ยังไม่มีรายงานในระบบ'}
        />
      ) : (
        <div className="space-y-2">
          {paginated.map((s) => (
            <button
              key={s.projectId}
              onClick={() => router.push(`/admin/daily-reports?projectId=${s.projectId}`)}
              className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:shadow-md"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 transition group-hover:bg-primary-100">
                <HardHat className="h-5 w-5 text-primary-500" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{s.project.code}</span>
                  <StatusBadge status={s.project.status} />
                  {s.draftCount > 0 && <Badge variant="warning">ร่าง {s.draftCount}</Badge>}
                </div>
                <p className="truncate font-medium text-gray-900 group-hover:text-primary-700">
                  {s.project.name}
                </p>

                {/* Stats row */}
                <div className="mt-1.5 flex flex-wrap items-center gap-4">
                  {s.totalReports > 0 ? (
                    <>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        {s.totalReports} รายงาน
                      </span>
                      {s.lastReportDate && (
                        <span className="text-xs text-gray-400">
                          ล่าสุด{' '}
                          {new Date(s.lastReportDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                      <ProgressBar value={s.lastProgress} />
                      {s.openIssues > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {s.openIssues} ปัญหาเปิด
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">— ยังไม่มีรายงาน</span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-primary-400" />
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex justify-end pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
