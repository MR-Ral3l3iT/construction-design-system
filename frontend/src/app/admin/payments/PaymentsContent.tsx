'use client'

import { useState, useMemo } from 'react'
import {
  CreditCard,
  Plus,
  CheckCircle2,
  X,
  Save,
  Pencil,
  Send,
  FileDown,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button, Card, CardBody, Badge, EmptyState } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormModal } from '@/components/shared/FormModal'
import {
  usePaymentsByProject,
  usePaymentSummary,
  useCreatePayment,
  useUpdatePayment,
  useMarkPaid,
  useImportFromEstimate,
  type PaymentMilestone,
} from '@/hooks/usePayments'
import { useEstimatesByProject, type Estimate } from '@/hooks/useEstimates'
import { useQuotationsByProject } from '@/hooks/useQuotation'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea } from '@construction/ui'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtSmall(n: number | string) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n))
}

const schema = z.object({
  quotationId: z.coerce.number().optional().nullable(),
  title: z.string().min(1, 'กรุณากรอกชื่องวด'),
  description: z.string().optional(),
  amount: z.coerce.number().min(1, 'กรอกจำนวนเงิน'),
  dueDate: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

type QuotationInfo = {
  id: number
  code: string
  title: string
  boqId: number | null
  totalAmount: number
}
type EstimateInfo = { id: number; code: string; title: string }
interface MilestoneGroup {
  quotation: QuotationInfo | null
  estimate: EstimateInfo | null
  milestones: PaymentMilestone[]
}

function groupMilestones(milestones: PaymentMilestone[]): MilestoneGroup[] {
  const map = new Map<string, MilestoneGroup>()
  for (const m of milestones) {
    let key: string
    if (m.quotation) {
      key = `q:${m.quotation.id}`
    } else if (m.estimate) {
      key = `e:${m.estimate.id}`
    } else {
      key = '__none__'
    }
    if (!map.has(key)) {
      map.set(key, { quotation: m.quotation ?? null, estimate: m.estimate ?? null, milestones: [] })
    }
    map.get(key)!.milestones.push(m)
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === '__none__') return 1
      if (b === '__none__') return -1
      return 0
    })
    .map(([, v]) => v)
}

interface GroupSectionProps {
  group: MilestoneGroup
  onEdit: (m: PaymentMilestone) => void
  onMarkPaid: (m: PaymentMilestone) => void
}

function GroupSection({ group, onEdit, onMarkPaid }: GroupSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const subtotal = group.milestones.reduce((s, m) => s + Number(m.amount), 0)
  const paidTotal = group.milestones
    .filter((m) => m.status === 'PAID')
    .reduce((s, m) => s + Number(m.amount), 0)
  const paidCount = group.milestones.filter((m) => m.status === 'PAID').length

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {group.quotation ? (
            <>
              <span className="font-mono text-xs text-gray-400">{group.quotation.code}</span>
              <span className="font-medium text-gray-900 text-sm">{group.quotation.title}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${group.quotation.boqId ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}
              >
                {group.quotation.boqId ? 'BOQ ก่อสร้าง' : 'งานออกแบบ'}
              </span>
            </>
          ) : group.estimate ? (
            <>
              <span className="font-mono text-xs text-gray-400">{group.estimate.code}</span>
              <span className="font-medium text-gray-900 text-sm">{group.estimate.title}</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-700">
                ใบเสนอราคา
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-500 italic">ทั่วไป (ไม่ระบุใบเสนอราคา)</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {paidCount}/{group.milestones.length} งวด · รวม{' '}
              <span className="font-semibold text-gray-900">{fmt(subtotal)}</span>
            </p>
            {paidTotal > 0 && <p className="text-xs text-green-600">ชำระแล้ว {fmt(paidTotal)}</p>}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-2">งวด</th>
                <th className="px-4 py-2">รายละเอียด</th>
                <th className="px-4 py-2 text-right">จำนวนเงิน</th>
                <th className="px-4 py-2">กำหนดชำระ</th>
                <th className="px-4 py-2">สถานะ</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {group.milestones.map((p) => (
                <tr
                  key={p.id}
                  className={`transition-colors ${p.status === 'PAID' ? 'bg-green-50/50' : p.status === 'OVERDUE' ? 'bg-red-50/50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-500">งวดที่ {p.sortOrder}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.title}</p>
                    {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">{fmt(Number(p.amount))}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {p.dueDate ? (
                        <span
                          className={
                            p.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-600'
                          }
                        >
                          {new Date(p.dueDate).toLocaleDateString('th-TH')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                      {p.paidDate && (
                        <p className="text-xs text-green-600">
                          ชำระ: {new Date(p.paidDate).toLocaleDateString('th-TH')}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'PAID' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Printer}
                          className="text-green-700 hover:bg-green-50 hover:text-green-800"
                          onClick={() =>
                            window.open(`/print/billing/${p.id}?type=receipt`, '_blank')
                          }
                        >
                          ใบเสร็จ
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Printer}
                          onClick={() => window.open(`/print/billing/${p.id}`, '_blank')}
                        >
                          ใบวางบิล
                        </Button>
                      )}
                      {(p.status === 'UNPAID' || p.status === 'OVERDUE') && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CheckCircle2}
                          onClick={() => onMarkPaid(p)}
                        >
                          บันทึกชำระ
                        </Button>
                      )}
                      {p.status === 'UNPAID' && (
                        <Button variant="outline" size="sm" icon={Pencil} onClick={() => onEdit(p)}>
                          แก้ไข
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface Props {
  projectId: number
}

export function PaymentsContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PaymentMilestone | null>(null)
  const [markPaidTarget, setMarkPaidTarget] = useState<PaymentMilestone | null>(null)
  const [paidDate, setPaidDate] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null)
  const [confirmImportOpen, setConfirmImportOpen] = useState(false)

  const { data, isLoading } = usePaymentsByProject(projectId)
  const { data: summary } = usePaymentSummary(projectId)
  const { data: estimatesData } = useEstimatesByProject(projectId)
  const { data: quotationsData } = useQuotationsByProject(projectId)
  const createMutation = useCreatePayment()
  const updateMutation = useUpdatePayment(editTarget?.id ?? 0, projectId)
  const markPaidMutation = useMarkPaid(markPaidTarget?.id ?? 0, projectId)
  const importMutation = useImportFromEstimate(projectId)

  const approvedEstimates = (estimatesData?.data ?? []).filter(
    (e: Estimate) => e.status === 'APPROVED',
  )
  const acceptedQuotations = (quotationsData?.data ?? []).filter(
    (q) => q.status === 'ACCEPTED' || q.status === 'SENT',
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const milestones = data?.data ?? []
  const groups = useMemo(() => groupMilestones(milestones), [milestones])

  function openCreate() {
    setEditTarget(null)
    reset({
      quotationId: null,
      title: '',
      description: '',
      amount: 0,
      dueDate: '',
      sortOrder: milestones.length + 1,
    })
    setFormOpen(true)
  }

  function openEdit(p: PaymentMilestone) {
    setEditTarget(p)
    reset({
      quotationId: p.quotation?.id ?? null,
      title: p.title,
      description: p.description ?? '',
      amount: p.amount,
      dueDate: p.dueDate?.slice(0, 10) ?? '',
      sortOrder: p.sortOrder,
    })
    setFormOpen(true)
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      dueDate: values.dueDate || undefined,
      description: values.description || undefined,
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขงวดเงินสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('สร้างงวดเงินสำเร็จ')
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function confirmImport() {
    if (!selectedEstimateId) return
    try {
      await importMutation.mutateAsync(selectedEstimateId)
      success('นำเข้างวดเงินจากใบเสนอราคาสำเร็จ')
      setConfirmImportOpen(false)
      setImportOpen(false)
      setSelectedEstimateId(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function confirmMarkPaid() {
    try {
      await markPaidMutation.mutateAsync(paidDate || undefined)
      success('บันทึกการชำระเงินสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setMarkPaidTarget(null)
      setPaidDate('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'มูลค่ารวม', value: fmt(summary.totalAmount), color: 'text-gray-900' },
            { label: 'ชำระแล้ว', value: fmt(summary.paidAmount), color: 'text-green-600' },
            { label: 'คงเหลือ', value: fmt(summary.remainingAmount), color: 'text-primary-600' },
            {
              label: 'เกินกำหนด',
              value: `${summary.overdueCount} งวด`,
              color: summary.overdueCount > 0 ? 'text-red-600' : 'text-gray-500',
            },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardBody>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {groups.length > 1
            ? `${groups.length} ใบเสนอราคา · ${milestones.length} งวดรวม`
            : `งวดเงินทั้งหมด ${milestones.length} งวด`}
        </p>
        <div className="flex items-center gap-2">
          {approvedEstimates.length > 0 && (
            <Button variant="outline" size="sm" icon={FileDown} onClick={() => setImportOpen(true)}>
              นำเข้าจากใบเสนอราคา
            </Button>
          )}
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
            เพิ่มงวดเงิน
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : milestones.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="ยังไม่มีงวดเงิน"
          description={
            approvedEstimates.length > 0
              ? 'นำเข้าจากใบเสนอราคาที่อนุมัติแล้ว หรือเพิ่มด้วยตนเอง'
              : 'เพิ่มงวดเงินแรกสำหรับโครงการนี้'
          }
          action={
            <div className="flex gap-2">
              {approvedEstimates.length > 0 && (
                <Button variant="outline" icon={FileDown} onClick={() => setImportOpen(true)}>
                  นำเข้าจากใบเสนอราคา
                </Button>
              )}
              <Button variant="primary" icon={Plus} onClick={openCreate}>
                เพิ่มงวดเงิน
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupSection
              key={
                group.quotation
                  ? `q:${group.quotation.id}`
                  : group.estimate
                    ? `e:${group.estimate.id}`
                    : '__none__'
              }
              group={group}
              onEdit={openEdit}
              onMarkPaid={(p) => {
                setMarkPaidTarget(p)
                setPaidDate(new Date().toISOString().slice(0, 10))
              }}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'แก้ไขงวดเงิน' : 'เพิ่มงวดเงิน'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={editTarget ? Save : Plus}
              onClick={handleSubmit(onSubmit)}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editTarget ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ใบเสนอราคา (ถ้ามี)
            </label>
            <select
              {...register('quotationId')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">— ไม่ระบุ —</option>
              {acceptedQuotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.code} — {q.title} {q.boqId ? '(BOQ)' : '(ออกแบบ)'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">แสดงเฉพาะใบเสนอราคาที่ส่งแล้ว / ตอบรับแล้ว</p>
          </div>
          <Input
            label="ชื่องวดเงิน"
            {...register('title')}
            error={errors.title?.message}
            required
          />
          <Textarea label="รายละเอียด" {...register('description')} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="จำนวนเงิน (บาท)"
              type="number"
              {...register('amount')}
              error={errors.amount?.message}
              required
            />
            <Input label="กำหนดชำระ" type="date" {...register('dueDate')} />
          </div>
          <Input label="ลำดับงวด" type="number" {...register('sortOrder')} />
        </form>
      </FormModal>

      {/* Import from estimate */}
      <FormModal
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          setSelectedEstimateId(null)
        }}
        title="นำเข้างวดเงินจากใบเสนอราคา"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setImportOpen(false)
                setSelectedEstimateId(null)
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={FileDown}
              disabled={!selectedEstimateId}
              onClick={() => setConfirmImportOpen(true)}
            >
              นำเข้า
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            เลือกใบเสนอราคาที่อนุมัติแล้ว — ระบบจะสร้างงวดเงินตามรอบจ่ายเงินที่กำหนดไว้ในใบเสนอราคา
          </p>
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
            ℹ️ งวดเงินจากใบเสนอราคาที่เลือกจะถูก<span className="font-medium">เพิ่มเข้า</span>
            โครงการ — งวดเงินที่มีอยู่จะไม่ถูกลบ หากนำเข้าใบเดิมซ้ำ
            งวดเดิมของใบนั้นจะถูกแทนที่เฉพาะงวดที่ยังไม่ชำระ
          </div>
          <div className="space-y-2">
            {approvedEstimates.map((e: Estimate) => (
              <label
                key={e.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  selectedEstimateId === e.id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="estimate"
                  value={e.id}
                  checked={selectedEstimateId === e.id}
                  onChange={() => setSelectedEstimateId(e.id)}
                  className="mt-0.5 accent-primary-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-500 shrink-0" />
                    <span className="font-mono text-xs text-gray-400">{e.code}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="mt-0.5 font-medium text-gray-900 text-sm">{e.title}</p>
                  <p className="text-xs text-gray-500">มูลค่ารวม {fmtSmall(e.totalAmount)} บาท</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </FormModal>

      {/* Confirm import */}
      <ConfirmModal
        open={confirmImportOpen}
        onClose={() => setConfirmImportOpen(false)}
        onConfirm={confirmImport}
        title="ยืนยันนำเข้างวดเงิน"
        description="ระบบจะเพิ่มงวดเงินจากใบเสนอราคาที่เลือก (หากนำเข้าใบเดิมซ้ำ งวดที่ยังไม่ชำระจะถูกแทนที่เฉพาะของใบนั้น) ดำเนินการต่อหรือไม่?"
        confirmLabel="นำเข้า"
        loading={importMutation.isPending}
      />

      {/* Mark paid */}
      <FormModal
        open={!!markPaidTarget}
        onClose={() => {
          setMarkPaidTarget(null)
          setPaidDate('')
        }}
        title={`บันทึกชำระเงิน — ${markPaidTarget?.title}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setMarkPaidTarget(null)
                setPaidDate('')
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={confirmMarkPaid}
              loading={markPaidMutation.isPending}
            >
              ยืนยัน
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            จำนวนเงิน:{' '}
            <span className="font-semibold text-primary-600">
              {fmt(markPaidTarget?.amount ?? 0)}
            </span>
          </p>
          <Input
            label="วันที่ชำระ"
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
        </div>
      </FormModal>
    </div>
  )
}
