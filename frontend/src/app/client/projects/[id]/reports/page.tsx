'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays,
  TrendingUp,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react'
import { useClientReportsList } from '@/hooks/useClientProjects'

const WEATHER_LABEL: Record<string, string> = {
  SUNNY: '☀️ แดดจัด',
  PARTLY_CLOUDY: '🌤 มีเมฆบ้าง',
  CLOUDY: '☁️ ครึ้ม',
  RAINY: '🌧 ฝนตก',
  HEAVY_RAIN: '🌧🌧 ฝนหนัก',
  STORMY: '⛈ พายุ',
}

const ITEM_STATUS_COLOR: Record<string, string> = {
  DONE: 'text-green-600',
  IN_PROGRESS: 'text-primary-600',
  PENDING: 'text-gray-400',
}

function dateDisplay(d: string) {
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export default function ClientReportsPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [filterOpen, setFilterOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filters = useMemo(
    () => ({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [dateFrom, dateTo],
  )
  const hasFilter = !!(dateFrom || dateTo)

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useClientReportsList(
    projectId,
    filters,
  )

  const reports = data?.pages.flatMap((p) => p.data) ?? []
  const total = data?.pages[0]?.meta.total ?? 0

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-primary-900/60 backdrop-blur-md">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-white/70" />
            <span className="text-sm font-medium text-white">
              {hasFilter ? (
                <span className="text-primary-200">
                  {dateFrom &&
                    `${new Date(dateFrom).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  {dateFrom && dateTo && ' – '}
                  {dateTo &&
                    `${new Date(dateTo).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </span>
              ) : (
                <span className="text-white/60">กรองตามช่วงวันที่</span>
              )}
            </span>
            {hasFilter && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearFilters()
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white/70"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {filterOpen ? (
            <ChevronUp className="h-4 w-4 text-white/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/50" />
          )}
        </button>

        {filterOpen && (
          <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-4 pb-4 pt-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                ตั้งแต่วันที่
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                ถึงวันที่
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40 [color-scheme:dark]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Count */}
        {!isLoading && (
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {hasFilter ? `ผลลัพธ์ ${total} ฉบับ` : `รายงานทั้งหมด ${total} ฉบับ`}
          </p>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/10" />
            ))}
          </>
        )}

        {/* Empty */}
        {!isLoading && !reports.length && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-12 w-12 text-white/20" />
            <p className="mt-3 text-sm text-white/40">
              {hasFilter ? 'ไม่พบรายงานในช่วงวันที่ที่เลือก' : 'ยังไม่มีรายงาน'}
            </p>
            {hasFilter && (
              <button onClick={clearFilters} className="mt-3 text-xs text-primary-300 underline">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}

        {/* Report cards */}
        {reports.map((r) => (
          <Link
            key={r.id}
            href={`/client/projects/${id}/reports/${r.id}`}
            className="block overflow-hidden rounded-2xl bg-white shadow-sm active:opacity-80"
          >
            {/* Card header */}
            <div className="flex items-center justify-between bg-primary-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{dateDisplay(r.reportDate)}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                  {r.weather && <span>{WEATHER_LABEL[r.weather] ?? r.weather}</span>}
                  {r.createdBy?.name && <span>โดย {r.createdBy.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary-500" />
                  <span className="text-lg font-bold text-primary-600">{r.overallProgress}%</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-primary-500 transition-all"
                style={{ width: `${r.overallProgress}%` }}
              />
            </div>

            {/* Work items preview */}
            {r.items.length > 0 && (
              <div className="divide-y divide-gray-50 px-4">
                {r.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 py-2.5">
                    <div
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.category.color ?? '#94a3b8' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        {item.category.name}
                      </p>
                      <p className="text-sm text-gray-800">{item.description}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold ${ITEM_STATUS_COLOR[item.status] ?? 'text-gray-500'}`}
                    >
                      {item.progress}%
                    </span>
                  </div>
                ))}
                {r._count.items > r.items.length && (
                  <p className="py-2 text-xs text-gray-400">
                    และอีก {r._count.items - r.items.length} รายการ
                  </p>
                )}
              </div>
            )}

            {/* Next plan */}
            {r.nextPlan && (
              <div className="border-t border-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  แผนงานถัดไป
                </p>
                <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{r.nextPlan}</p>
              </div>
            )}

            {/* Issue summary */}
            {r.issueSummary && (
              <div className="border-t border-red-50 bg-red-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
                  ปัญหา / อุปสรรค
                </p>
                <p className="mt-0.5 text-sm text-red-700 leading-relaxed">{r.issueSummary}</p>
              </div>
            )}
          </Link>
        ))}

        {/* Load More */}
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3.5 text-sm font-medium text-white backdrop-blur-sm active:bg-white/15 disabled:opacity-60"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              'โหลดเพิ่มเติม'
            )}
          </button>
        )}

        {!isLoading && !hasNextPage && reports.length > 0 && (
          <p className="text-center text-xs text-white/30 py-2">แสดงครบทุกรายงานแล้ว</p>
        )}
      </div>
    </div>
  )
}
