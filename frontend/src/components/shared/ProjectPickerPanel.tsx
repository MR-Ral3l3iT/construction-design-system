'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  FolderKanban,
  ChevronRight,
  Calendar,
  ClipboardList,
  CheckCircle2,
  CircleDot,
  AlertCircle,
} from 'lucide-react'
import { Pagination } from '@construction/ui'
import { SearchInput } from './SearchInput'
import { StatusBadge } from './StatusBadge'
import { useProjects, type ProjectPlanSummary } from '@/hooks/useProjects'

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ (DS)',
  CONSTRUCTION: 'ก่อสร้าง (CN)',
  TURNKEY: 'DC',
}

const PLAN_TEMPLATE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ',
  DESIGN_BOQ: 'ออกแบบ + BOQ',
  CONSTRUCTION_ONLY: 'ก่อสร้าง',
  TURNKEY: 'ออกแบบ + ก่อสร้าง',
}

function PlanBadge({ plan }: { plan: ProjectPlanSummary }) {
  const label = PLAN_TEMPLATE_LABEL[plan.templateType] ?? plan.templateType
  const { completed, inProgress, blocked, total } = plan.taskCounts
  const todo = total - completed - inProgress - blocked
  const pct = plan.progress

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
        <ClipboardList className="h-3 w-3" />
        {label}
      </span>
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
          <div className="flex h-full">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
            <div
              className="h-full bg-blue-400"
              style={{ width: `${(inProgress / total) * 100}%` }}
            />
            <div className="h-full bg-red-400" style={{ width: `${(blocked / total) * 100}%` }} />
          </div>
        </div>
        <span className="text-xs font-medium text-gray-600">{pct}%</span>
      </div>
      {inProgress > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-blue-600">
          <CircleDot className="h-3 w-3" />
          {inProgress}
        </span>
      )}
      {blocked > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {blocked}
        </span>
      )}
      {completed > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          {completed}/{total}
        </span>
      )}
    </div>
  )
}

interface Props {
  title?: string
  renderExtra?: (projectId: number) => React.ReactNode
}

export function ProjectPickerPanel({ title = 'เลือกโครงการ', renderExtra }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useProjects({ search, page, pageSize: 20 })
  const projects = data?.data ?? []
  const meta = data?.meta

  function handleSelect(projectId: number) {
    router.push(`${pathname}?projectId=${projectId}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">เลือกโครงการเพื่อดูข้อมูลในส่วนนี้</p>
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
        placeholder="ค้นหาชื่อโครงการ, รหัส..."
      />

      {/* Project list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">ไม่พบโครงการ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:shadow-md"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 transition group-hover:bg-primary-100">
                <FolderKanban className="h-5 w-5 text-primary-500" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-gray-400">{p.code}</span>
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-gray-400">{TYPE_LABEL[p.type] ?? p.type}</span>
                </div>
                <p className="truncate font-medium text-gray-900 group-hover:text-primary-700">
                  {p.name}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  {p.customer && <span>{p.customer.name}</span>}
                  {p.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(p.startDate).toLocaleDateString('th-TH')}
                    </span>
                  )}
                </div>
                {p.plan ? (
                  <PlanBadge plan={p.plan} />
                ) : (
                  <span className="mt-1 inline-block text-xs text-gray-400">— ยังไม่มีแผนงาน</span>
                )}
                {renderExtra?.(p.id)}
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-primary-400" />
            </button>
          ))}
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
