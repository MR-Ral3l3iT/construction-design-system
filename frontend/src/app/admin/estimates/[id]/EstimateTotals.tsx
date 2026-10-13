'use client'

import { useEffect, useState } from 'react'
import { useUpdateEstimate, type Estimate } from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'

const DEFAULT_WHT_PERCENT = '3'

const fmt = (v: string | number) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v),
  )

/**
 * ส่วนรวมทั้งหมด — ยอดทุกตัวมาจาก estimate.summary ที่ backend คำนวณ หน้านี้แค่แสดง
 * ช่องหัก ณ ที่จ่ายบันทึกลงใบประเมินทันทีที่เปลี่ยน แล้วใช้ตอนออกใบเสนอราคา
 */
export function EstimateTotals({ estimate, editable }: { estimate: Estimate; editable: boolean }) {
  const { error: toastError } = useToast()
  const update = useUpdateEstimate(estimate.id, estimate.project?.id)
  const saved = estimate.whtPercent != null ? String(Number(estimate.whtPercent)) : null
  const [percent, setPercent] = useState(saved ?? DEFAULT_WHT_PERCENT)

  useEffect(() => {
    if (saved) setPercent(saved)
  }, [saved])

  async function save(whtPercent: number | null) {
    try {
      await update.mutateAsync({ whtPercent })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'บันทึกหัก ณ ที่จ่ายไม่สำเร็จ'))
    }
  }

  function onToggle(checked: boolean) {
    void save(checked ? Number(percent) || Number(DEFAULT_WHT_PERCENT) : null)
  }

  function onPercentBlur() {
    const n = Number(percent)
    if (!saved || !(n > 0 && n <= 100) || String(n) === saved) {
      if (saved) setPercent(saved)
      return
    }
    void save(n)
  }

  const s = estimate.summary
  if (!s) return null
  const vatPct = Number((Number(s.vatRate) * 100).toFixed(2))

  const row = (label: React.ReactNode, value: string, strong = false) => (
    <div className={`flex items-center justify-between gap-6 ${strong ? 'font-semibold' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums text-gray-900">{fmt(value)}</span>
    </div>
  )

  return (
    <div className="w-full max-w-sm space-y-1.5 text-sm">
      {row('รวมราคา', s.baseAmount)}
      {Number(s.vatAmount) > 0 && row(`ภาษีมูลค่าเพิ่ม (${vatPct}%)`, s.vatAmount)}
      {row('รวมทั้งสิ้น', s.grandTotal, true)}
      <div className="flex items-center justify-between gap-6">
        <label className="flex items-center gap-2 text-gray-600">
          <input
            type="checkbox"
            checked={saved !== null}
            disabled={!editable || update.isPending}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          หัก ณ ที่จ่าย
          <input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={percent}
            disabled={!editable || saved === null || update.isPending}
            onChange={(e) => setPercent(e.target.value)}
            onBlur={onPercentBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-right text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
          %
        </label>
        <span className="tabular-nums text-gray-900">
          {saved !== null ? `-${fmt(s.whtAmount)}` : '-'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-6 border-t pt-2">
        <span className="text-gray-500">ยอดชำระสุทธิ</span>
        <span className="text-xl font-bold tabular-nums text-primary-600">{fmt(s.netAmount)}</span>
      </div>
      {!editable && saved !== null && (
        <p className="text-right text-xs text-gray-400">แก้ได้เมื่อใบประเมินเป็นร่าง</p>
      )}
    </div>
  )
}
