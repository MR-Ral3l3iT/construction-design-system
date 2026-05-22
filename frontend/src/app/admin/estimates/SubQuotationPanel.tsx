'use client'

import { useState } from 'react'
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Lock,
  Pencil,
  Trash2,
  BanknoteIcon,
} from 'lucide-react'
import { Button, Badge, Input } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingState } from '@/components/shared/LoadingState'
import {
  useSubQuotations,
  useCreateSubQuotation,
  useUpdateSubQuotation,
  useDeleteSubQuotation,
  useCreatePaymentFromSubQuotation,
  type SubQuotationItem,
} from '@/hooks/useSubQuotation'
import { useToast } from '@/providers/toast-provider'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

function BudgetBar({ total, used }: { total: number; used: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const remaining = total - used
  const isOver = used > total

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>ใช้ไป {formatCurrency(used)}</span>
        <span className={isOver ? 'text-red-600 font-medium' : ''}>
          {isOver ? `เกินงบ ${formatCurrency(used - total)}` : `เหลือ ${formatCurrency(remaining)}`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-primary-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">งบรวม {formatCurrency(total)}</p>
    </div>
  )
}

interface FormState {
  title: string
  description: string
  amount: string
  sortOrder: string
}

const EMPTY_FORM: FormState = { title: '', description: '', amount: '', sortOrder: '0' }

function itemPermissions(item: SubQuotationItem) {
  const linked = item.estimateItems ?? []
  if (linked.length === 0) return { canEdit: true, canDelete: true, lockLabel: null }
  const allEditableStatuses = linked.every((ei) =>
    ['DRAFT', 'REJECTED'].includes(ei.estimate.status),
  )
  const hasApproved = linked.some((ei) => ei.estimate.status === 'APPROVED')
  const lockLabel = hasApproved ? 'อนุมัติแล้ว' : 'รออนุมัติ'
  return { canEdit: allEditableStatuses, canDelete: false, lockLabel }
}

interface Props {
  quotationId: number
  canAdd?: boolean
}

export function SubQuotationPanel({ quotationId, canAdd = false }: Props) {
  const { success, error } = useToast()
  const { data, isLoading } = useSubQuotations(quotationId)
  const createMut = useCreateSubQuotation(quotationId)
  const updateMut = useUpdateSubQuotation(quotationId)
  const deleteMut = useDeleteSubQuotation(quotationId)

  const createMilestoneMut = useCreatePaymentFromSubQuotation(quotationId)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubQuotationItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubQuotationItem | null>(null)
  const [milestoneTarget, setMilestoneTarget] = useState<SubQuotationItem | null>(null)
  const [milestoneDueDate, setMilestoneDueDate] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(item: SubQuotationItem) {
    setEditTarget(item)
    setForm({
      title: item.title,
      description: item.description ?? '',
      amount: String(item.amount),
      sortOrder: String(item.sortOrder),
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (!form.title.trim()) return error('กรุณากรอกชื่องาน')
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) return error('กรุณากรอกมูลค่าที่ถูกต้อง')

    try {
      if (editTarget) {
        await updateMut.mutateAsync({
          id: editTarget.id,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          amount,
          sortOrder: parseInt(form.sortOrder, 10) || 0,
        })
        success('แก้ไขงานย่อยสำเร็จ')
      } else {
        await createMut.mutateAsync({
          quotationId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          amount,
          sortOrder: parseInt(form.sortOrder, 10) || 0,
        })
        success('สร้างงานย่อยสำเร็จ')
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      error(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleCreateMilestone() {
    if (!milestoneTarget) return
    try {
      await createMilestoneMut.mutateAsync({
        subQuotationId: milestoneTarget.id,
        dueDate: milestoneDueDate || undefined,
      })
      success('สร้างงวดเงินสำเร็จ')
      setMilestoneTarget(null)
      setMilestoneDueDate('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      error(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      success('ลบงานย่อยสำเร็จ')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      error(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    } finally {
      setDeleteTarget(null)
    }
  }

  if (isLoading)
    return (
      <div className="py-4">
        <LoadingState />
      </div>
    )
  if (!data) return null

  const { items, summary } = data
  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-3">
      <BudgetBar total={summary.totalAmount} used={summary.usedAmount} />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center">
          <p className="text-sm text-gray-400">
            {canAdd ? 'ยังไม่มีงานย่อย — กดเพิ่มเพื่อแบ่งงาน' : 'ยังไม่มีงานย่อย'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {items.map((item: SubQuotationItem) => {
            const { canEdit, canDelete, lockLabel } = itemPermissions(item)
            const hasLinkedEstimate = (item.estimateItems ?? []).length > 0
            return (
              <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-xs text-gray-400">{item.code}</p>
                    {item.paymentMilestones.length > 0 && (
                      <Badge variant="info">
                        <CreditCard className="mr-1 h-3 w-3 inline" />
                        {item.paymentMilestones.length} งวด
                      </Badge>
                    )}
                    {hasLinkedEstimate && !canEdit && lockLabel && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${lockLabel === 'อนุมัติแล้ว' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        <Lock className="h-3 w-3" />
                        {lockLabel}
                      </span>
                    )}
                    {hasLinkedEstimate && canEdit && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        ในใบประเมิน
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(item.amount))}
                  </span>
                  {canAdd && item.paymentMilestones.length === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMilestoneTarget(item)
                        setMilestoneDueDate('')
                      }}
                      title="สร้างงวดเงิน"
                    >
                      <BanknoteIcon className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  )}
                  {!canEdit && !canDelete && (
                    <Lock
                      className="h-3.5 w-3.5 text-gray-300"
                      aria-label="ไม่สามารถแก้ไขหรือลบได้"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {canAdd && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
            เพิ่มงานย่อย
          </Button>
        </div>
      )}

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'แก้ไขงานย่อย' : 'เพิ่มงานย่อย'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={isPending}>
              {editTarget ? 'บันทึก' : 'สร้าง'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="ชื่องาน"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="เช่น งานฐานราก"
            required
          />
          <Input
            label="รายละเอียด (ไม่บังคับ)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="รายละเอียดเพิ่มเติม"
          />
          <Input
            label="มูลค่า (บาท)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0"
            required
          />
          <Input
            label="ลำดับ"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            placeholder="0"
          />
          <p className="text-xs text-gray-500">
            งบที่เหลือสำหรับจัดสรร:{' '}
            <span className="font-medium text-gray-700">
              {formatCurrency(summary.remainingAmount)}
            </span>
          </p>
        </div>
      </FormModal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`ลบงานย่อย "${deleteTarget?.title}"`}
        confirmLabel="ลบ"
        danger
        loading={deleteMut.isPending}
      />

      <FormModal
        open={!!milestoneTarget}
        onClose={() => {
          setMilestoneTarget(null)
          setMilestoneDueDate('')
        }}
        title="สร้างงวดเงิน"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setMilestoneTarget(null)
                setMilestoneDueDate('')
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={BanknoteIcon}
              onClick={handleCreateMilestone}
              loading={createMilestoneMut.isPending}
            >
              สร้างงวดเงิน
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            สร้างงวดเงินจาก <span className="font-medium">{milestoneTarget?.title}</span> มูลค่า{' '}
            <span className="font-medium">
              {formatCurrency(Number(milestoneTarget?.amount ?? 0))}
            </span>
          </p>
          <Input
            label="กำหนดชำระ (ไม่บังคับ)"
            type="date"
            value={milestoneDueDate}
            onChange={(e) => setMilestoneDueDate(e.target.value)}
          />
        </div>
      </FormModal>
    </div>
  )
}

interface CollapsibleSubQuotationProps {
  quotationId: number
  quotationStatus: string
}

export function CollapsibleSubQuotation({
  quotationId,
  quotationStatus,
}: CollapsibleSubQuotationProps) {
  const [open, setOpen] = useState(false)
  const isAccepted = quotationStatus === 'ACCEPTED'
  const isSent = quotationStatus === 'SENT'
  const isVisible = isAccepted || isSent

  if (!isVisible) return null

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className={`text-xs font-medium flex items-center gap-1.5 ${isAccepted ? 'text-primary-600' : 'text-amber-600'}`}
        >
          {isSent && <Lock className="h-3 w-3" />}
          งานย่อย (Sub-Quotation)
          {isSent && <span className="text-amber-500">(ส่งให้ลูกค้าแล้ว — ดูได้อย่างเดียว)</span>}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-gray-50">
          <SubQuotationPanel quotationId={quotationId} canAdd={isAccepted} />
        </div>
      )}
    </div>
  )
}
