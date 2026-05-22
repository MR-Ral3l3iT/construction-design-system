'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Flag,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useClientProject } from '@/hooks/useClientProjects'

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ',
  CONSTRUCTION: 'ก่อสร้าง',
  TURNKEY: 'ออกแบบ + ก่อสร้าง',
}

function dateStr(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function daysFromNow(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function timeProgress(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  if (now <= s) return 0
  if (now >= e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

function phaseStatus(start: string | null, end: string | null): 'upcoming' | 'active' | 'done' {
  if (!start) return 'upcoming'
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Infinity
  const now = Date.now()
  if (now < s) return 'upcoming'
  if (now > e) return 'done'
  return 'active'
}

const PHASE_STATUS_CONFIG = {
  done: {
    label: 'เสร็จแล้ว',
    headerBg: 'bg-green-50',
    badgeClass: 'bg-green-100 text-green-600',
    barColor: 'bg-green-400',
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  },
  active: {
    label: 'กำลังดำเนินการ',
    headerBg: 'bg-primary-50',
    badgeClass: 'bg-primary-100 text-primary-600',
    barColor: 'bg-primary-500',
    icon: <CircleDot className="h-4 w-4 text-primary-500" />,
  },
  upcoming: {
    label: 'ยังไม่เริ่ม',
    headerBg: 'bg-gray-50',
    badgeClass: 'bg-gray-100 text-gray-400',
    barColor: 'bg-gray-300',
    icon: <Circle className="h-4 w-4 text-gray-300" />,
  },
}

function PhaseCard({
  label,
  start,
  end,
  accentColor,
}: {
  label: string
  start: string | null
  end: string | null
  accentColor: string
}) {
  const status = phaseStatus(start, end)
  const pct = timeProgress(start, end)
  const cfg = PHASE_STATUS_CONFIG[status]
  const days =
    status === 'active' ? daysFromNow(end) : status === 'upcoming' ? daysFromNow(start) : null
  const daysLabel =
    status === 'active' && days !== null
      ? `เหลืออีก ${days} วัน`
      : status === 'upcoming' && days !== null
        ? `เริ่มในอีก ${days} วัน`
        : cfg.label

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 ${cfg.headerBg}`}>
        <div className="flex items-center gap-2">
          {cfg.icon}
          <span className="text-sm font-bold text-gray-900">{label}</span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}>
          {daysLabel}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {dateStr(start)}
          </span>
          <span>ถึง {dateStr(end)}</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${accentColor}`}
            style={{ width: `${pct}%` }}
          />
          {status === 'active' && pct > 2 && pct < 98 && (
            <div
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">เวลาที่ผ่านไป</span>
          <span className="font-semibold text-gray-600">{pct}%</span>
        </div>
      </div>
    </div>
  )
}

type MilestoneItem = { date: string | null; label: string; sub?: string }

const MILESTONE_SHOW_DEFAULT = 3

function MilestoneList({ items }: { items: MilestoneItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, MILESTONE_SHOW_DEFAULT)
  const hasMore = items.length > MILESTONE_SHOW_DEFAULT

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-50 bg-gray-50 px-4 py-3">
        <Flag className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-bold text-gray-700">เหตุการณ์สำคัญ</span>
      </div>

      <div className="divide-y divide-gray-50 px-4">
        {visible.map((m, i) => {
          if (!m.date) return null
          const days = daysFromNow(m.date)
          const isPast = days !== null && days <= 0
          const isToday = days === 0

          return (
            <div key={i} className="flex items-start gap-3 py-3">
              <div className="mt-0.5 shrink-0">
                {isPast && !isToday ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : isToday ? (
                  <CircleDot className="h-4 w-4 text-primary-500" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
                  {m.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {dateStr(m.date)}
                  {m.sub ? ` · ${m.sub}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {isToday && (
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-600">
                    วันนี้
                  </span>
                )}
                {isPast && !isToday && (
                  <span className="text-xs text-green-500 font-medium">เสร็จแล้ว</span>
                )}
                {!isPast && !isToday && days !== null && (
                  <span className="text-xs text-gray-400">อีก {days} วัน</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-gray-50 py-3 text-xs font-medium text-primary-600 active:bg-gray-50"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> ย่อ
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> ดูเพิ่มเติม (
              {items.length - MILESTONE_SHOW_DEFAULT} รายการ)
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default function ClientTimelinePage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { data: project, isLoading } = useClientProject(projectId)

  if (isLoading || !project) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
    )
  }

  const hasDesign = !!(project.designStartDate || project.designEndDate)
  const hasConstruction = !!(project.startDate || project.endDate)
  const noData = !hasDesign && !hasConstruction

  const overallStart = project.designStartDate ?? project.startDate
  const overallEnd = project.endDate
  const timeElapsed = timeProgress(overallStart, overallEnd)
  const progressDelta = project.progress - timeElapsed
  const daysLeft = daysFromNow(overallEnd)

  // Milestones
  const milestones: MilestoneItem[] = []
  if (project.designStartDate)
    milestones.push({ date: project.designStartDate, label: 'เริ่มขั้นตอนออกแบบ' })
  if (project.designEndDate)
    milestones.push({ date: project.designEndDate, label: 'ออกแบบแล้วเสร็จ' })
  if (project.startDate && project.startDate !== project.designStartDate)
    milestones.push({ date: project.startDate, label: 'เริ่มขั้นตอนก่อสร้าง' })
  if (project.endDate)
    milestones.push({
      date: project.endDate,
      label: 'โครงการแล้วเสร็จ',
      sub: TYPE_LABEL[project.type] ?? project.type,
    })
  milestones.sort((a, b) => new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime())

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-white/80" />
        <p className="text-base font-bold text-white">แผนงานโครงการ</p>
      </div>

      {noData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="h-12 w-12 text-white/20" />
          <p className="mt-3 text-sm text-white/40">ยังไม่ได้กำหนดแผนงาน</p>
        </div>
      ) : (
        <>
          {/* Overall progress vs time */}
          {overallStart && overallEnd && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between bg-primary-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-bold text-gray-900">ภาพรวมเวลา</span>
                </div>
                {daysLeft !== null && daysLeft > 0 && (
                  <span className="text-xs font-semibold text-gray-500">
                    เหลืออีก {daysLeft} วัน
                  </span>
                )}
                {daysLeft !== null && daysLeft <= 0 && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                    สิ้นสุดแล้ว
                  </span>
                )}
              </div>

              <div className="px-4 py-3 space-y-2.5">
                {/* Stacked bar */}
                <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-200"
                    style={{ width: `${timeElapsed}%` }}
                  />
                  <div
                    className="absolute top-0 h-full rounded-full bg-primary-500 opacity-80"
                    style={{ width: `${project.progress}%` }}
                  />
                  {timeElapsed > 2 && timeElapsed < 98 && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white shadow"
                      style={{ left: `${timeElapsed}%` }}
                    />
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{dateStr(overallStart)}</span>
                  <span>{dateStr(overallEnd)}</span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary-500" />
                    <span className="text-gray-600">
                      ความคืบหน้างาน{' '}
                      <span className="font-bold text-gray-800">{project.progress}%</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                    <span className="text-gray-400">
                      เวลา <span className="font-semibold text-gray-600">{timeElapsed}%</span>
                    </span>
                  </div>
                  <span
                    className={`ml-auto text-xs font-semibold ${progressDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {progressDelta >= 0
                      ? `นำหน้า +${progressDelta}%`
                      : `ช้า ${Math.abs(progressDelta)}%`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Phase cards */}
          {hasDesign && (
            <PhaseCard
              label="ขั้นตอนออกแบบ"
              start={project.designStartDate}
              end={project.designEndDate}
              accentColor="bg-violet-400"
            />
          )}
          {hasConstruction && (
            <PhaseCard
              label="ขั้นตอนก่อสร้าง"
              start={project.startDate}
              end={project.endDate}
              accentColor="bg-primary-500"
            />
          )}

          {/* Milestones */}
          {milestones.length > 0 && <MilestoneList items={milestones} />}
        </>
      )}
    </div>
  )
}
