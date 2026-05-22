'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderKanban, ChevronRight, Pencil, User } from 'lucide-react'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Pagination } from '@construction/ui'
import { useProjects } from '@/hooks/useProjects'
import { useDesignTaskSummary } from '@/hooks/useDesignTasks'

const STATUS_LABEL: Record<string, string> = {
  TODO: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังทำ',
  WAITING_REVIEW: 'รอตรวจสอบ',
  REVISION: 'แก้ไข',
  APPROVED: 'อนุมัติแล้ว',
  CANCELLED: 'ยกเลิก',
}

const STATUS_COLOR: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  WAITING_REVIEW: 'bg-amber-50 text-amber-600',
  REVISION: 'bg-orange-50 text-orange-600',
  APPROVED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-600',
}

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REVISION', 'APPROVED', 'CANCELLED']

const BAR_COLOR: Record<string, string> = {
  TODO: 'bg-gray-300',
  IN_PROGRESS: 'bg-blue-400',
  WAITING_REVIEW: 'bg-amber-400',
  REVISION: 'bg-orange-400',
  APPROVED: 'bg-green-500',
  CANCELLED: 'bg-red-400',
}

export function DesignTaskProjectPicker() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useProjects({ search, page, pageSize: 20 })
  const { data: summary } = useDesignTaskSummary()

  const projects = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">เลือกโครงการ — งานออกแบบ</h2>
          <p className="text-sm text-gray-500">เลือกโครงการเพื่อดูและจัดการงานออกแบบ</p>
        </div>
        {meta && <span className="text-sm text-gray-400">{meta.totalItems} โครงการ</span>}
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="ค้นหาชื่อโครงการ, รหัส, เจ้าของโครงการ..."
      />

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">ไม่พบโครงการ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => {
            const taskSummary = summary?.[p.id] ?? {}
            const totalTasks = p._count.designTasks
            const hasTasks = totalTasks > 0
            const approvedCount = taskSummary['APPROVED'] ?? 0
            const approvedPct = totalTasks > 0 ? Math.round((approvedCount / totalTasks) * 100) : 0

            return (
              <button
                key={p.id}
                onClick={() => router.push(`/admin/design-tasks?projectId=${p.id}`)}
                className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:shadow-md"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 transition group-hover:bg-primary-100">
                  <Pencil className="h-5 w-5 text-primary-500" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-400">{p.code}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="truncate font-medium text-gray-900 group-hover:text-primary-700">
                    {p.name}
                  </p>
                  {p.customer && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {p.customer.companyName
                          ? `${p.customer.name} · ${p.customer.companyName}`
                          : p.customer.name}
                      </span>
                    </div>
                  )}

                  {/* Task count + status breakdown */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${hasTasks ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {totalTasks} งาน
                    </span>
                    {hasTasks &&
                      STATUS_ORDER.filter((s) => taskSummary[s] > 0).map((s) => (
                        <span
                          key={s}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s]}`}
                          title={STATUS_LABEL[s]}
                        >
                          {STATUS_LABEL[s]} {taskSummary[s]}
                        </span>
                      ))}
                    {!hasTasks && <span className="text-xs text-gray-400">ยังไม่มีงานออกแบบ</span>}
                  </div>

                  {/* Progress bar */}
                  {hasTasks && (
                    <div className="mt-2">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        {STATUS_ORDER.filter((s) => (taskSummary[s] ?? 0) > 0).map((s) => (
                          <div
                            key={s}
                            className={`h-full ${BAR_COLOR[s] ?? 'bg-gray-300'}`}
                            style={{ width: `${(taskSummary[s] / totalTasks) * 100}%` }}
                            title={`${STATUS_LABEL[s]}: ${taskSummary[s]}`}
                          />
                        ))}
                      </div>
                      <p className="mt-0.5 text-right text-[10px] text-gray-400">
                        อนุมัติแล้ว {approvedPct}%
                      </p>
                    </div>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-primary-400" />
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && (
        <div className="flex justify-end pt-2">
          <Pagination
            page={page}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
