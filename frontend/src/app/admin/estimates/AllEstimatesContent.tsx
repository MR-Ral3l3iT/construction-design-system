'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Plus, ChevronDown, ChevronRight, User } from 'lucide-react'
import { Button, Pagination, EmptyState } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { SearchInput } from '@/components/shared/SearchInput'
import { useEstimatesOverview, type ProjectEstimateOverview } from '@/hooks/useEstimates'
import { useDebounce } from '@/hooks/useDebounce'

function formatCurrency(n: number | string) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`
}

function ProjectRow({ project }: { project: ProjectEstimateOverview }) {
  const [expanded, setExpanded] = useState(false)
  const hasEstimates = project.estimates.length > 0
  const totalAmount = project.estimates.reduce((s, e) => s + Number(e.totalAmount), 0)

  return (
    <>
      {/* Project row */}
      <tr
        className="cursor-pointer border-b bg-white hover:bg-gray-50 transition-colors"
        onClick={() => hasEstimates && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 w-8">
          {hasEstimates ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )
          ) : (
            <span className="block h-4 w-4" />
          )}
        </td>
        <td className="px-2 py-3">
          <p className="font-mono text-xs text-gray-400">{project.code}</p>
          <p className="font-medium text-gray-900">{project.name}</p>
          {project.customer && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <User className="h-3 w-3" />
              {project.customer.companyName || project.customer.name}
            </p>
          )}
        </td>
        <td className="px-2 py-3 text-center">
          {hasEstimates ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {project.estimates.length}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="px-2 py-3">
          {hasEstimates ? (
            <div className="flex flex-wrap gap-1">
              {[...new Set(project.estimates.map((e) => e.status))].map((st) => (
                <StatusBadge key={st} status={st} />
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">ยังไม่มีใบประเมิน</span>
          )}
        </td>
        <td className="px-2 py-3 text-right">
          {hasEstimates ? (
            <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <Link href={`/admin/estimates?projectId=${project.id}`}>
            <Button variant="outline" size="sm" icon={hasEstimates ? undefined : Plus}>
              {hasEstimates ? 'จัดการ' : 'สร้างใบประเมิน'}
            </Button>
          </Link>
        </td>
      </tr>

      {/* Expanded estimate rows */}
      {expanded &&
        project.estimates.map((e) => (
          <tr key={e.id} className="border-b bg-gray-50/80">
            <td className="px-4 py-2" />
            <td className="px-2 py-2 pl-6">
              <p className="font-mono text-xs text-gray-400">{e.code}</p>
              <p className="text-sm text-gray-700">{e.title}</p>
              <p className="text-xs text-gray-400">{formatDate(e.createdAt)}</p>
            </td>
            <td className="px-2 py-2" />
            <td className="px-2 py-2">
              <StatusBadge status={e.status} />
            </td>
            <td className="px-2 py-2 text-right text-sm font-medium text-gray-900">
              {formatCurrency(e.totalAmount)}
            </td>
            <td className="px-4 py-2 text-right">
              <Link href={`/admin/estimates/${e.id}?projectId=${project.id}`}>
                <Button variant="ghost" size="sm">
                  รายละเอียด
                </Button>
              </Link>
            </td>
          </tr>
        ))}
    </>
  )
}

export function AllEstimatesContent() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 400)

  const handleSearch = useCallback((v: string) => {
    setSearchInput(v)
    setPage(1)
  }, [])

  const { data, isLoading } = useEstimatesOverview(page, search)
  const projects = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">เลือกโครงการ — ใบเสนอราคา</h2>
          <p className="text-sm text-gray-500">เลือกโครงการเพื่อดูและจัดการใบเสนอราคา</p>
        </div>
        {meta && <span className="text-sm text-gray-400">{meta.totalItems} โครงการ</span>}
      </div>

      {/* Search */}
      <SearchInput
        value={searchInput}
        onChange={handleSearch}
        placeholder="ค้นหาชื่อโครงการ, รหัส, ชื่อลูกค้า..."
      />

      {isLoading ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ'}
          description={search ? 'ลองค้นหาด้วยคำอื่น' : ''}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3 w-8" />
                  <th className="px-2 py-3">โครงการ / ลูกค้า</th>
                  <th className="px-2 py-3 text-center w-20">จำนวนใบ</th>
                  <th className="px-2 py-3">สถานะ</th>
                  <th className="px-2 py-3 text-right">มูลค่ารวม</th>
                  <th className="px-4 py-3 text-right w-36" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Pagination
              page={page}
              totalPages={meta?.totalPages ?? 1}
              totalItems={meta?.totalItems ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
