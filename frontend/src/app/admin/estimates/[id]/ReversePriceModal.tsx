'use client'

import { useEffect, useState } from 'react'
import { Calculator, Check, X } from 'lucide-react'
import { Button, Input, Select } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { useReversePrice, type Estimate, type ReversePriceResult } from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'

const fmt = (v: string | number) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v),
  )

interface Props {
  open: boolean
  onClose: () => void
  estimate: Estimate
}

/**
 * คิดย้อนจากยอดที่ลูกค้าจะจ่าย เช่น "ขอจ่าย 180,000 รวม VAT และหัก ณ ที่จ่ายแล้ว"
 * → ราคาของรายการที่เลือก (รายการอื่นคงเดิม) · กดคำนวณดูก่อน แล้วค่อยกดใช้ราคานี้
 */
export function ReversePriceModal({ open, onClose, estimate }: Props) {
  const { success, error: toastError } = useToast()
  const reverse = useReversePrice(estimate.id)
  const priced = (estimate.items ?? []).filter((it) => it.isPriced)
  const hasWht = estimate.whtPercent != null

  const [target, setTarget] = useState('')
  const [afterWht, setAfterWht] = useState(hasWht)
  const [itemId, setItemId] = useState('')
  const [result, setResult] = useState<ReversePriceResult | null>(null)

  useEffect(() => {
    if (!open) return
    setTarget('')
    setAfterWht(hasWht)
    setItemId(priced[0] ? String(priced[0].id) : '')
    setResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function run(apply: boolean) {
    try {
      const r = await reverse.mutateAsync({
        targetAmount: Number(target),
        afterWht,
        itemId: itemId ? Number(itemId) : undefined,
        apply,
      })
      setResult(r)
      if (apply) {
        success(`ปรับราคา "${r.item.name}" เป็น ${fmt(r.item.unitPrice)} แล้ว`)
        onClose()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'คำนวณไม่สำเร็จ'))
    }
  }

  const diff = result ? Number(result.diff) : 0
  const s = result?.summary

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="คิดย้อนจากยอดที่ลูกค้าจะจ่าย"
      description="ใส่ยอดที่ลูกค้าต้องการจ่าย ระบบหาราคาก่อน VAT ที่ทำให้ได้ยอดนั้น แล้วปรับราคาของรายการที่เลือก"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose} disabled={reverse.isPending}>
            ปิด
          </Button>
          <Button
            variant="outline"
            icon={Calculator}
            onClick={() => run(false)}
            loading={reverse.isPending && !result}
            disabled={!(Number(target) > 0)}
          >
            คำนวณ
          </Button>
          <Button
            variant="primary"
            icon={Check}
            onClick={() => run(true)}
            loading={reverse.isPending && !!result}
            disabled={!result}
          >
            ใช้ราคานี้
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="ยอดที่ลูกค้าจะจ่าย (บาท)"
          type="number"
          min="1"
          step="0.01"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value)
            setResult(null)
          }}
          placeholder="เช่น 180000"
        />
        <div className="space-y-2 text-sm text-gray-700">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={afterWht}
              disabled={!hasWht}
              onChange={() => {
                setAfterWht(true)
                setResult(null)
              }}
              className="mt-1"
            />
            <span>
              รวม VAT และหัก ณ ที่จ่ายแล้ว (ยอดที่ได้รับจริง)
              {!hasWht && (
                <span className="block text-xs text-gray-400">
                  ติ๊ก &ldquo;หัก ณ ที่จ่าย&rdquo; ในส่วนรวมทั้งหมดก่อน
                </span>
              )}
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!afterWht}
              onChange={() => {
                setAfterWht(false)
                setResult(null)
              }}
            />
            รวม VAT เท่านั้น (ก่อนหัก ณ ที่จ่าย)
          </label>
        </div>
        {priced.length > 1 && (
          <Select
            label="ปรับราคาที่รายการ"
            value={itemId}
            onChange={(e) => {
              setItemId(e.target.value)
              setResult(null)
            }}
            options={priced.map((it) => ({ value: String(it.id), label: it.name }))}
            hint="รายการอื่นคงราคาเดิม"
          />
        )}

        {result && s && (
          <div className="space-y-1 rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <div className="flex justify-between font-medium">
              <span>{result.item.name}</span>
              <span className="tabular-nums">{fmt(result.item.unitPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>รวมราคา</span>
              <span className="tabular-nums">{fmt(s.baseAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>ภาษีมูลค่าเพิ่ม</span>
              <span className="tabular-nums">{fmt(s.vatAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>รวมทั้งสิ้น</span>
              <span className="tabular-nums">{fmt(s.grandTotal)}</span>
            </div>
            {Number(s.whtAmount) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>หัก ณ ที่จ่าย</span>
                <span className="tabular-nums">-{fmt(s.whtAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>{result.afterWht ? 'ยอดรับสุทธิ' : 'ยอดรวม VAT'}</span>
              <span className="tabular-nums">{fmt(result.achieved)}</span>
            </div>
            {diff !== 0 && (
              <p className="pt-1 text-xs text-amber-700">
                ได้ยอดตรงทุกสตางค์ไม่ได้เพราะ VAT และหัก ณ ที่จ่ายถูกปัดเศษแยกกัน — ราคานี้ให้ยอด
                {diff < 0 ? 'ต่ำกว่า' : 'สูงกว่า'}ที่ขอ {fmt(Math.abs(diff))} บาท
              </p>
            )}
          </div>
        )}
      </div>
    </FormModal>
  )
}
