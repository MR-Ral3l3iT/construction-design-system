'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { CreditCard, CheckCircle2, Clock, AlertCircle, Banknote } from 'lucide-react'
import { useClientPayments } from '@/hooks/useClientProjects'
import type { ClientPayment } from '@/hooks/useClientProjects'

function fmt(amount: string | number) {
  return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 0 })
}

function dateStr(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  PAID: { label: 'ชำระแล้ว', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  PENDING: { label: 'รอตรวจสอบ', color: 'text-yellow-400', bg: 'bg-yellow-400/15', icon: Clock },
  UNPAID: { label: 'ยังไม่ชำระ', color: 'text-white/50', bg: 'bg-white/10', icon: Clock },
  OVERDUE: { label: 'เกินกำหนด', color: 'text-red-400', bg: 'bg-red-400/15', icon: AlertCircle },
}

interface PaymentGroup {
  key: string
  label: string
  tag: string
  tagColor: string
  payments: ClientPayment[]
}

function groupPayments(payments: ClientPayment[]): PaymentGroup[] {
  const map = new Map<string, PaymentGroup>()
  for (const p of payments) {
    let key: string, label: string, tag: string, tagColor: string
    if (p.quotation) {
      key = `q:${p.quotation.id}`
      label = `${p.quotation.code} — ${p.quotation.title}`
      tag = p.quotation.boqId ? 'BOQ ก่อสร้าง' : 'งานออกแบบ'
      tagColor = p.quotation.boqId
        ? 'bg-blue-400/20 text-blue-200'
        : 'bg-purple-400/20 text-purple-200'
    } else if (p.estimate) {
      key = `e:${p.estimate.id}`
      label = `${p.estimate.code} — ${p.estimate.title}`
      tag = 'ใบเสนอราคา'
      tagColor = 'bg-teal-400/20 text-teal-200'
    } else {
      key = '__none__'
      label = 'ทั่วไป'
      tag = ''
      tagColor = ''
    }
    if (!map.has(key)) map.set(key, { key, label, tag, tagColor, payments: [] })
    map.get(key)!.payments.push(p)
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === '__none__') return 1
    if (b.key === '__none__') return -1
    return 0
  })
}

function PaymentCard({ payment }: { payment: ClientPayment }) {
  const cfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.UNPAID
  const StatusIcon = cfg.icon
  const isPaid = payment.status === 'PAID'

  return (
    <div
      className={`overflow-hidden rounded-2xl ${isPaid ? 'bg-white shadow-sm' : 'bg-white/10 ring-1 ring-white/10'}`}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isPaid ? 'text-gray-900' : 'text-white'}`}>
            งวดที่ {payment.sortOrder} — {payment.title}
          </p>
          {payment.description && (
            <p
              className={`mt-0.5 text-xs line-clamp-2 ${isPaid ? 'text-gray-400' : 'text-white/50'}`}
            >
              {payment.description}
            </p>
          )}
          <div
            className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs ${isPaid ? 'text-gray-400' : 'text-white/40'}`}
          >
            {payment.dueDate && <span>กำหนด {dateStr(payment.dueDate)}</span>}
            {payment.paidDate && <span>ชำระ {dateStr(payment.paidDate)}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-base font-bold ${isPaid ? 'text-gray-900' : 'text-white'}`}>
            ฿{fmt(payment.amount)}
          </p>
          <div
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color} ${cfg.bg}`}
          >
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </div>
        </div>
      </div>
    </div>
  )
}

function GroupSection({ group }: { group: PaymentGroup }) {
  const total = group.payments.reduce((s, p) => s + Number(p.amount), 0)
  const paid = group.payments
    .filter((p) => p.status === 'PAID')
    .reduce((s, p) => s + Number(p.amount), 0)
  const paidCount = group.payments.filter((p) => p.status === 'PAID').length
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0

  return (
    <div className="space-y-2">
      {/* Group header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <p className="text-xs font-semibold text-white/80 truncate">{group.label}</p>
          {group.tag && (
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${group.tagColor}`}
            >
              {group.tag}
            </span>
          )}
        </div>
        <p className="shrink-0 text-xs text-white/40">
          {paidCount}/{group.payments.length} งวด
        </p>
      </div>

      {/* Mini progress */}
      <div className="px-1">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-green-400/70 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/30">
          <span>ชำระแล้ว ฿{fmt(paid)}</span>
          <span>รวม ฿{fmt(total)}</span>
        </div>
      </div>

      {/* Payment cards */}
      <div className="space-y-2">
        {group.payments.map((p) => (
          <PaymentCard key={p.id} payment={p} />
        ))}
      </div>
    </div>
  )
}

function OverallSummary({ payments }: { payments: ClientPayment[] }) {
  const total = payments.reduce((s, p) => s + Number(p.amount), 0)
  const paid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0)
  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const pct = total > 0 ? (paid / total) * 100 : 0

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400">มูลค่ารวมทั้งหมด</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">฿{fmt(total)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400">ชำระแล้ว</p>
          <p className="mt-0.5 text-xl font-bold text-green-600">฿{fmt(paid)}</p>
        </div>
      </div>
      <div className="border-t border-gray-50 px-5 py-3">
        <div className="mb-1.5 flex justify-between text-xs text-gray-400">
          <span>ความคืบหน้าการชำระ</span>
          <span className="font-semibold text-gray-600">
            {paidCount}/{payments.length} งวด · {Math.round(pct)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ClientFinancePage() {
  const { id } = useParams<{ id: string }>()
  const { data: payments, isLoading } = useClientPayments(Number(id))

  const groups = useMemo(() => groupPayments(payments ?? []), [payments])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Banknote className="h-5 w-5 text-white/80" />
        <p className="text-base font-bold text-white">การเงิน</p>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-10 w-10 text-white/20" />
          <p className="mt-3 text-sm text-white/40">ยังไม่มีข้อมูลงวดเงิน</p>
        </div>
      ) : (
        <>
          {/* Overall summary — only when multiple groups */}
          {groups.length > 1 && <OverallSummary payments={payments} />}

          {/* Groups */}
          {groups.map((group) => (
            <GroupSection key={group.key} group={group} />
          ))}
        </>
      )}
    </div>
  )
}
