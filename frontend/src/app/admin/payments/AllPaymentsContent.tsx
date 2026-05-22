'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, AlertCircle, ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { Pagination, EmptyState, Button } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { SearchInput } from '@/components/shared/SearchInput'
import {
  usePaymentsOverview,
  type ProjectPaymentOverview,
  type OverviewMilestone,
} from '@/hooks/usePayments'
import { useDebounce } from '@/hooks/useDebounce'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
    </div>
  )
}

interface MilestoneGroup {
  key: string
  label: string
  tag: string
  tagColor: string
  milestones: OverviewMilestone[]
}

function groupOverviewMilestones(milestones: OverviewMilestone[]): MilestoneGroup[] {
  const map = new Map<string, MilestoneGroup>()
  for (const m of milestones) {
    let key: string
    let label: string
    let tag: string
    let tagColor: string
    if (m.quotation) {
      key = `q:${m.quotation.id}`
      label = `${m.quotation.code} — ${m.quotation.title}`
      tag = m.quotation.boqId ? 'BOQ ก่อสร้าง' : 'งานออกแบบ'
      tagColor = m.quotation.boqId ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
    } else if (m.estimate) {
      key = `e:${m.estimate.id}`
      label = `${m.estimate.code} — ${m.estimate.title}`
      tag = 'ใบเสนอราคา'
      tagColor = 'bg-teal-50 text-teal-700'
    } else {
      key = '__none__'
      label = 'ทั่วไป'
      tag = ''
      tagColor = ''
    }
    if (!map.has(key)) map.set(key, { key, label, tag, tagColor, milestones: [] })
    map.get(key)!.milestones.push(m)
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === '__none__') return 1
    if (b.key === '__none__') return -1
    return 0
  })
}

function MilestoneGroupBlock({ group }: { group: MilestoneGroup }) {
  const subtotal = group.milestones.reduce((s, m) => s + m.amount, 0)
  const paidCount = group.milestones.filter((m) => m.status === 'PAID').length

  return (
    <tr className="border-b bg-gray-50/80">
      <td colSpan={6} className="px-4 py-0">
        {/* Group header */}
        <div className="flex items-center gap-2 py-2 pl-6 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-700">{group.label}</span>
          {group.tag && (
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${group.tagColor}`}
            >
              {group.tag}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {paidCount}/{group.milestones.length} งวด · {fmt(subtotal)}
          </span>
        </div>
        {/* Milestone rows */}
        <table className="w-full">
          <tbody>
            {group.milestones.map((m) => {
              const isPaid = m.status === 'PAID'
              const isOverdue = m.status === 'OVERDUE'
              return (
                <tr
                  key={m.id}
                  className={`text-sm ${isPaid ? 'bg-green-50/60' : isOverdue ? 'bg-red-50/60' : ''}`}
                >
                  <td className="py-2 pl-10 pr-4 text-gray-600 w-1/2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${isPaid ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-gray-400'}`}
                      />
                      <span>
                        งวดที่ {m.sortOrder}: {m.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmt(m.amount)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {isPaid ? (
                      <span className="text-green-600">{fmtDate(m.paidDate)}</span>
                    ) : (
                      fmtDate(m.dueDate)
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400">—</td>
                  <td className="px-4 py-2" />
                </tr>
              )
            })}
          </tbody>
        </table>
      </td>
    </tr>
  )
}

function ProjectPaymentRow({ project }: { project: ProjectPaymentOverview }) {
  const [expanded, setExpanded] = useState(false)
  const hasPayments = project.totalCount > 0
  const groups = groupOverviewMilestones(project.milestones)

  return (
    <>
      <tr
        className={`border-b bg-white transition-colors ${hasPayments ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => hasPayments && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-gray-400">
              {hasPayments ? (
                expanded ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )
              ) : (
                <span className="inline-block w-[15px]" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{project.name}</span>
                <StatusBadge status={project.status} />
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                <span>{project.code}</span>
                {project.customer && (
                  <>
                    <span>·</span>
                    <span>{project.customer.companyName || project.customer.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>

        <td className="px-4 py-3 text-center">
          {hasPayments ? (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {project.paidCount}/{project.totalCount} งวด
              </span>
              {groups.length > 1 && <p className="text-[10px] text-gray-400">{groups.length} ใบ</p>}
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        <td className="px-4 py-3 text-right">
          {hasPayments ? (
            <span className="font-medium text-gray-900">{fmt(project.totalAmount)}</span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        <td className="px-4 py-3 text-right">
          {hasPayments ? (
            <span className="font-medium text-green-600">{fmt(project.paidAmount)}</span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        <td className="px-4 py-3 text-right">
          {hasPayments ? (
            <span
              className={`font-medium ${project.remainingAmount > 0 ? 'text-primary-600' : 'text-gray-400'}`}
            >
              {fmt(project.remainingAmount)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              {hasPayments && (
                <>
                  <ProgressBar paid={project.paidAmount} total={project.totalAmount} />
                  {project.overdueCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={11} />
                      เกินกำหนด {project.overdueCount} งวด
                    </div>
                  )}
                </>
              )}
            </div>
            <Link
              href={`/admin/payments?projectId=${project.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" icon={Settings}>
                จัดการงวดงาน
              </Button>
            </Link>
          </div>
        </td>
      </tr>

      {expanded && groups.map((group) => <MilestoneGroupBlock key={group.key} group={group} />)}
    </>
  )
}

export function AllPaymentsContent() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)
  const { data, isLoading } = usePaymentsOverview(page, debouncedSearch)

  const projects = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">เลือกโครงการ — งวดเงิน</h2>
          <p className="text-sm text-gray-500">เลือกโครงการเพื่อดูและจัดการงวดเงิน</p>
        </div>
        {meta && <span className="text-sm text-gray-400">{meta.totalItems} โครงการ</span>}
      </div>

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="ค้นหาชื่อโครงการ, รหัส, ลูกค้า..."
      />

      {isLoading ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState icon={CreditCard} title="ไม่พบโครงการ" description="ลองเปลี่ยนคำค้นหา" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">โครงการ</th>
                <th className="px-4 py-3 text-center">ชำระแล้ว / ทั้งหมด</th>
                <th className="px-4 py-3 text-right">มูลค่ารวม</th>
                <th className="px-4 py-3 text-right">ชำระแล้ว</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
                <th className="px-4 py-3">ความคืบหน้า</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <ProjectPaymentRow key={p.id} project={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
