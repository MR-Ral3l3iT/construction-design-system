'use client'

import { useState } from 'react'
import { Download, X, ChevronDown, CreditCard } from 'lucide-react'
import { Button, Select } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { useQuotationsByProject } from '@/hooks/useQuotation'
import { useSubQuotations } from '@/hooks/useSubQuotation'
import { useAddEstimateItem } from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

interface SubQuotationPickerProps {
  quotationId: number
  selected: Set<number>
  onToggle: (id: number) => void
}

function SubQuotationPicker({ quotationId, selected, onToggle }: SubQuotationPickerProps) {
  const { data, isLoading } = useSubQuotations(quotationId)

  if (isLoading) return <p className="py-4 text-center text-sm text-gray-400">กำลังโหลด...</p>
  if (!data || data.items.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">ไม่มีงานย่อยในใบเสนอราคานี้</p>
  }

  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
      {data.items.map((item) => {
        const linkedEstimates = item.estimateItems ?? []
        const isLockedByEstimate = linkedEstimates.some((ei) =>
          ['APPROVED', 'SENT'].includes(ei.estimate.status),
        )
        const isDisabled = isLockedByEstimate
        const isChecked = selected.has(item.id)
        return (
          <label
            key={item.id}
            className={`flex items-start gap-3 px-4 py-3 transition-colors ${
              isDisabled
                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                : `cursor-pointer hover:bg-gray-50 ${isChecked ? 'bg-primary-50' : ''}`
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isDisabled}
              onChange={() => !isDisabled && onToggle(item.id)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary-600"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-gray-400">{item.code}</p>
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              {item.description && (
                <p className="text-xs text-gray-500 truncate">{item.description}</p>
              )}
              {isLockedByEstimate && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <CreditCard className="h-3 w-3" />
                  อยู่ในใบประเมินที่อนุมัติแล้ว — นำเข้าไม่ได้
                </p>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-900 shrink-0">
              {formatCurrency(Number(item.amount))}
            </span>
          </label>
        )
      })}
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  estimateId: number
  projectId: number
}

export function ImportSubQuotationModal({ open, onClose, estimateId, projectId }: Props) {
  const { success, error } = useToast()
  const [quotationId, setQuotationId] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const addItem = useAddEstimateItem(estimateId)

  const { data: quotationsData } = useQuotationsByProject(projectId)
  const acceptedQuotations = (quotationsData?.data ?? []).filter(
    (q) => q.boqId && q.status === 'ACCEPTED',
  )

  const { data: sqData } = useSubQuotations(parseInt(quotationId, 10))

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleClose() {
    setQuotationId('')
    setSelected(new Set())
    onClose()
  }

  async function handleImport() {
    if (selected.size === 0) return error('กรุณาเลือกอย่างน้อย 1 รายการ')
    const items = sqData?.items.filter((i) => selected.has(i.id)) ?? []
    if (items.length === 0) return

    setImporting(true)
    try {
      await Promise.all(
        items.map((item) =>
          addItem.mutateAsync({
            name: item.title,
            description: item.description ?? undefined,
            quantity: 1,
            unit: 'งาน',
            unitPrice: Number(item.amount),
            subQuotationId: item.id,
          }),
        ),
      )
      success(`นำเข้า ${items.length} รายการสำเร็จ`)
      handleClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      error(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title="นำเข้าจากงานย่อย (Sub-Quotation)"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">
            {selected.size > 0 ? `เลือกแล้ว ${selected.size} รายการ` : 'ยังไม่ได้เลือก'}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" icon={X} onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Download}
              onClick={handleImport}
              loading={importing}
              disabled={selected.size === 0}
            >
              นำเข้า
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {acceptedQuotations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
            <ChevronDown className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500">ไม่มีใบเสนอราคาที่ตอบรับแล้ว</p>
            <p className="text-xs text-gray-400 mt-1">
              ใบเสนอราคาต้องมีสถานะ &quot;ตอบรับ&quot; และมี BOQ
            </p>
          </div>
        ) : (
          <>
            <Select
              label="เลือกใบเสนอราคา"
              value={quotationId}
              onChange={(e) => {
                setQuotationId(e.target.value)
                setSelected(new Set())
              }}
              options={[
                { value: '', label: '— เลือกใบเสนอราคา —' },
                ...acceptedQuotations.map((q) => ({
                  value: String(q.id),
                  label: `${q.code} — ${q.title}`,
                })),
              ]}
            />

            {quotationId && (
              <SubQuotationPicker
                quotationId={parseInt(quotationId, 10)}
                selected={selected}
                onToggle={toggle}
              />
            )}

            {quotationId && selected.size > 0 && sqData && (
              <div className="rounded-lg bg-primary-50 px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">มูลค่ารวมที่เลือก</span>
                <span className="font-bold text-primary-700">
                  {formatCurrency(
                    sqData.items
                      .filter((i) => selected.has(i.id))
                      .reduce((s, i) => s + Number(i.amount), 0),
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </FormModal>
  )
}
