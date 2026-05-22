'use client'

import { FolderKanban, Users, CreditCard, AlertCircle, TrendingUp, Clock, List } from 'lucide-react'
import { Card } from '@construction/ui'
import { useDashboard } from '@/hooks/useDashboard'
import { StatusBadge } from '@/components/shared'

function formatMoney(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'decimal', maximumFractionDigits: 0 }).format(
    amount,
  )
}

const STAT_COLORS = [
  { icon: 'bg-primary-50 text-primary-600', accent: 'text-primary-600' },
  { icon: 'bg-blue-50 text-blue-600', accent: 'text-blue-600' },
  { icon: 'bg-violet-50 text-violet-600', accent: 'text-violet-600' },
  { icon: 'bg-rose-50 text-rose-600', accent: 'text-rose-600' },
]

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  colorIndex = 0,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  colorIndex?: number
}) {
  const color = STAT_COLORS[colorIndex % STAT_COLORS.length]
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 leading-none">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

export function DashboardContent() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <p className="text-sm text-red-600">ไม่สามารถโหลดข้อมูล Dashboard ได้</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="โปรเจกต์ทั้งหมด"
          value={String(data.projects.total)}
          sub={`กำลังก่อสร้าง ${data.projects.construction} โครงการ`}
          icon={FolderKanban}
          colorIndex={0}
        />
        <StatCard
          label="ลูกค้าทั้งหมด"
          value={String(data.customers.total)}
          icon={Users}
          colorIndex={1}
        />
        <StatCard
          label="ยอดรับชำระแล้ว"
          value={`฿${formatMoney(data.payments.paidAmount)}`}
          sub={`คงเหลือ ฿${formatMoney(data.payments.remainingAmount)}`}
          icon={CreditCard}
          colorIndex={2}
        />
        <StatCard
          label="ปัญหาเปิดอยู่"
          value={String(data.issues.openCount)}
          sub={`เกินกำหนด ${data.payments.overdueCount} งวด`}
          icon={AlertCircle}
          colorIndex={3}
        />
      </div>

      {/* Second row: status breakdown + daily updates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-gray-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            สถานะโครงการ
          </h3>
          <div className="space-y-2">
            {data.projects.byStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <StatusBadge status={status} />
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-600" />
            อัปเดตรายวันล่าสุด
          </h3>
          {data.recentDailyUpdates.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีการอัปเดต</p>
          ) : (
            <div className="space-y-3">
              {data.recentDailyUpdates.map((u) => (
                <div key={u.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800 line-clamp-1">{u.title}</p>
                    <p className="text-xs text-gray-400">
                      {u.project.code} · {u.createdBy.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                    {u.progress}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Third row: recent projects + recent issues */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-gray-700 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary-600" />
            โครงการล่าสุด
          </h3>
          {data.recentProjects.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีโครงการ</p>
          ) : (
            <div className="space-y-3">
              {data.recentProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.code} · {p.customer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-gray-500">{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-gray-700 flex items-center gap-2">
            <List className="h-4 w-4 text-primary-600" />
            ปัญหาที่ยังเปิดอยู่
          </h3>
          {data.recentIssues.length === 0 ? (
            <p className="text-sm text-gray-400">ไม่มีปัญหาที่เปิดอยู่</p>
          ) : (
            <div className="space-y-3">
              {data.recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{issue.title}</p>
                    <p className="text-xs text-gray-400">{issue.project.code}</p>
                  </div>
                  <StatusBadge status={issue.priority} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
