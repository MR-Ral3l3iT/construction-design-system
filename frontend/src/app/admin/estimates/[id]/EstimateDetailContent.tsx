'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  RotateCcw,
  Download,
  FileCheck,
  FilePen,
  Ban,
  Printer,
} from 'lucide-react'
import { Card, CardBody, Button, Table } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { EstimateFormModal } from '../EstimateFormModal'
import { EstimateItemModal } from '../EstimateItemModal'
import { ImportSubQuotationModal } from '../ImportSubQuotationModal'
import { IssueQuotationModal } from './IssueQuotationModal'
import { VoidQuotationModal } from './VoidQuotationModal'
import { ScheduleEditor } from './ScheduleEditor'
import {
  useEstimate,
  useDeleteEstimateItem,
  useUpsertInstallments,
  type EstimateItem,
  type EstimateInstallment,
  type EstimateQuotationDoc,
} from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'

interface InstallmentRow {
  description: string
  /** "หลังจาก ..." */
  triggerText: string
  /** "ภายใน x สัปดาห์" */
  withinWeeks: string
  percentage: string
}

const toInstallmentRows = (installments: EstimateInstallment[]): InstallmentRow[] =>
  installments.map((inst) => ({
    description: inst.description,
    triggerText: inst.triggerText ?? '',
    withinWeeks: inst.withinWeeks != null ? String(inst.withinWeeks) : '',
    percentage: inst.percentage,
  }))

const inputCls =
  'w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none'

function InstallmentsEditor({
  estimateId,
  totalAmount,
  installments,
  readOnly,
}: {
  estimateId: number
  totalAmount: number
  installments: EstimateInstallment[]
  readOnly: boolean
}) {
  const { success, error: toastError } = useToast()
  const upsert = useUpsertInstallments(estimateId)
  const [rows, setRows] = useState<InstallmentRow[]>(() => toInstallmentRows(installments))

  useEffect(() => {
    setRows(toInstallmentRows(installments))
  }, [installments])

  function calcAmount(pct: string) {
    const p = parseFloat(pct)
    if (isNaN(p)) return 0
    return Math.round(totalAmount * p) / 100
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { description: '', triggerText: '', withinWeeks: '', percentage: '' },
    ])
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: keyof InstallmentRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0)

  async function handleSave() {
    try {
      await upsert.mutateAsync(
        rows.map((r, i) => ({
          installmentNo: i + 1,
          description: r.description,
          triggerText: r.triggerText.trim() || null,
          withinWeeks: r.withinWeeks ? Number(r.withinWeeks) : null,
          percentage: r.percentage || '0',
          amount: calcAmount(r.percentage).toString(),
        })),
      )
      success('บันทึกรอบจ่ายเงินสำเร็จ')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 pr-2 font-medium">งวดที่</th>
              <th className="pb-2 pr-2 font-medium">รายละเอียด</th>
              <th className="pb-2 pr-2 font-medium">หลังจาก</th>
              <th className="pb-2 pr-2 font-medium w-24">ภายใน (สัปดาห์)</th>
              <th className="pb-2 pr-2 font-medium w-24">สัดส่วน (%)</th>
              <th className="pb-2 pr-2 font-medium w-32 text-right">จำนวนเงิน</th>
              {!readOnly && <th className="pb-2 w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-1.5 pr-2 text-gray-500 align-middle">{idx + 1}</td>
                <td className="py-1.5 pr-2 align-middle">
                  {readOnly ? (
                    row.description
                  ) : (
                    <input
                      className={inputCls}
                      placeholder="เช่น ค่าออกแบบงวดแรก"
                      value={row.description}
                      onChange={(e) => update(idx, 'description', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-2 align-middle">
                  {readOnly ? (
                    row.triggerText || '-'
                  ) : (
                    <input
                      className={inputCls}
                      placeholder="เช่น เซ็นสัญญา, ส่งแบบร่าง"
                      value={row.triggerText}
                      onChange={(e) => update(idx, 'triggerText', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-2 align-middle">
                  {readOnly ? (
                    row.withinWeeks || '-'
                  ) : (
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      placeholder="-"
                      value={row.withinWeeks}
                      onChange={(e) => update(idx, 'withinWeeks', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-2 align-middle">
                  {readOnly ? (
                    `${Number(row.percentage).toFixed(2)}%`
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={inputCls}
                      placeholder="0"
                      value={row.percentage}
                      onChange={(e) => update(idx, 'percentage', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-2 text-right align-middle font-medium">
                  {new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(
                    calcAmount(row.percentage),
                  )}
                </td>
                {!readOnly && (
                  <td className="py-1.5 align-middle">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีรอบจ่ายเงิน</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-gray-500">
          รวม:{' '}
          <span className={totalPct > 100 ? 'text-red-500 font-semibold' : 'font-semibold'}>
            {totalPct.toFixed(2)}%
          </span>
          {totalPct > 100 && <span className="ml-1 text-red-500">(เกิน 100%)</span>}
          {rows.length > 0 && Math.round(totalPct * 100) < 10000 && (
            <span className="ml-1 text-amber-600">(ต้องครบ 100% จึงออกใบเสนอราคาได้)</span>
          )}
        </div>
        <div className={readOnly ? 'hidden' : 'flex gap-2'}>
          <Button variant="outline" size="sm" icon={Plus} onClick={addRow}>
            เพิ่มงวด
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={handleSave}
            loading={upsert.isPending}
          >
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  )
}

const QUOTATION_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'มีผล',
  SUPERSEDED: 'ถูกแทนด้วยฉบับใหม่',
  VOIDED: 'ยกเลิก',
  DRAFT: 'ร่าง',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  id: number
  projectId: number
}

export function EstimateDetailContent({ id, projectId }: Props) {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { data: estimate, isLoading } = useEstimate(id)
  const deleteItem = useDeleteEstimateItem(id)

  const [editEstimateOpen, setEditEstimateOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editItem, setEditItem] = useState<EstimateItem | null>(null)
  const [deleteItemTarget, setDeleteItemTarget] = useState<EstimateItem | null>(null)
  const [issueOpen, setIssueOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<EstimateQuotationDoc | null>(null)

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data } = await api.patch(`/estimates/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates', id] })
      const pid = projectId || estimate?.project?.id
      if (pid) qc.invalidateQueries({ queryKey: ['estimates', 'project', pid] })
      qc.invalidateQueries({ queryKey: ['estimates', 'overview'] })
      qc.invalidateQueries({ queryKey: ['sub-quotation', 'quotation'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!estimate) return <p className="text-gray-500">ไม่พบใบประเมิน</p>

  const items = estimate.items ?? []
  const installments = estimate.installments ?? []
  const quotations = estimate.documents ?? []
  const activeQuotation = quotations.find((d) => d.status === 'CONFIRMED') ?? null
  const isDraft = estimate.status === 'DRAFT'
  // ออกใบเสนอราคาไปแล้ว → งวดและ schedule ต้องตรงกับฉบับที่ส่ง แก้ได้หลังกด "แก้ไขเพื่อออกฉบับใหม่"
  const scheduleLocked = !isDraft && quotations.length > 0
  const openPrint = (docId: number) => window.open(`/print/document/${docId}`, '_blank')

  async function handleDeleteItem() {
    if (!deleteItemTarget) return
    try {
      await deleteItem.mutateAsync(deleteItemTarget.id)
      success('ลบรายการสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setDeleteItemTarget(null)
    }
  }

  const itemColumns = [
    {
      key: 'name',
      header: 'รายการ',
      render: (item: EstimateItem) => (
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'จำนวน',
      render: (item: EstimateItem) => (
        <span className="text-sm text-gray-700">
          {item.quantity}
          {item.unit && (
            <span className="ml-1 rounded bg-gray-100 px-1 text-xs text-gray-500">{item.unit}</span>
          )}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'ราคาต่อหน่วย',
      render: (item: EstimateItem) => (
        <span className="text-sm text-gray-700">{formatCurrency(item.unitPrice)}</span>
      ),
    },
    {
      key: 'totalPrice',
      header: 'รวม',
      render: (item: EstimateItem) => (
        <span className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</span>
      ),
    },
    ...(isDraft
      ? [
          {
            key: 'actions',
            header: '',
            render: (item: EstimateItem) => (
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditItem(item)
                    setItemModalOpen(true)
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteItemTarget(item)}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Estimate header */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs text-gray-400">
                {activeQuotation ? (
                  <>
                    <span className="font-semibold text-gray-600">{activeQuotation.code}</span>
                    <span className="ml-2">(เลขร่าง {estimate.code})</span>
                  </>
                ) : (
                  <>เลขร่าง {estimate.code}</>
                )}
              </p>
              <h2 className="text-xl font-semibold text-gray-900">{estimate.title}</h2>
              {estimate.description && (
                <p className="mt-1 text-sm text-gray-500">{estimate.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={estimate.status} />
                {estimate.project && (
                  <Link
                    href={`/admin/projects/${estimate.project.id}`}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {estimate.project.code} · {estimate.project.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">มูลค่ารวม</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(estimate.totalAmount)}
              </p>
            </div>
          </div>

          {/* Status actions */}
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Pencil}
                  onClick={() => setEditEstimateOpen(true)}
                >
                  แก้ไขชื่อ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={FileCheck}
                  onClick={() => setIssueOpen(true)}
                  disabled={items.length === 0}
                >
                  {quotations.length > 0 ? 'ออกใบเสนอราคาฉบับแก้ไข' : 'ออกใบเสนอราคา'}
                </Button>
              </>
            )}
            {estimate.status === 'SENT' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle}
                  onClick={() => {
                    statusMutation.mutate('APPROVED')
                    success('อนุมัติสำเร็จ')
                  }}
                >
                  อนุมัติ
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => statusMutation.mutate('REJECTED')}
                >
                  ปฏิเสธ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FilePen}
                  onClick={() => statusMutation.mutate('DRAFT')}
                  loading={statusMutation.isPending}
                >
                  แก้ไขเพื่อออกฉบับใหม่
                </Button>
              </>
            )}
            {activeQuotation && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => openPrint(activeQuotation.id)}
                >
                  พิมพ์ {activeQuotation.code}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Ban}
                  onClick={() => setVoidTarget(activeQuotation)}
                >
                  ยกเลิกใบเสนอราคา
                </Button>
              </>
            )}
            {estimate.status === 'REJECTED' && (
              <Button
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={() => statusMutation.mutate('DRAFT')}
              >
                กลับเป็นร่าง
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Items table */}
      <Card>
        <CardBody>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">รายการ ({items.length})</h3>
            {isDraft && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={() => setImportOpen(true)}
                >
                  นำเข้าจากงานย่อย
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    setEditItem(null)
                    setItemModalOpen(true)
                  }}
                >
                  เพิ่มรายการ
                </Button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีรายการ</p>
          ) : (
            <>
              <Table columns={itemColumns} data={items} keyExtractor={(item) => String(item.id)} />
              <div className="mt-4 flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">รวมทั้งหมด</p>
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(estimate.totalAmount)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Installments */}
      <Card>
        <CardBody>
          <h3 className="mb-4 font-medium text-gray-900">งวดการจ่ายเงิน</h3>
          <InstallmentsEditor
            estimateId={id}
            totalAmount={estimate.totalAmount}
            installments={installments}
            readOnly={scheduleLocked}
          />
        </CardBody>
      </Card>

      {/* Schedule */}
      <Card>
        <CardBody>
          <h3 className="mb-1 font-medium text-gray-900">Schedule แผนงาน</h3>
          <p className="mb-4 text-xs text-gray-500">
            พิมพ์ลงใบเสนอราคา — แยกจากแผนงานโครงการ นับเป็นสัปดาห์จากวันเริ่มงาน
          </p>
          <ScheduleEditor
            estimateId={id}
            phases={estimate.schedulePhases ?? []}
            installments={installments}
            readOnly={scheduleLocked}
          />
        </CardBody>
      </Card>

      {/* Quotation history */}
      {quotations.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="mb-4 font-medium text-gray-900">ใบเสนอราคาที่ออกแล้ว</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 pr-2 font-medium">เลขที่</th>
                  <th className="pb-2 pr-2 font-medium">วันที่</th>
                  <th className="pb-2 pr-2 font-medium">สถานะ</th>
                  <th className="pb-2 pr-2 text-right font-medium">ยอดรวม VAT</th>
                  <th className="w-10 pb-2" />
                </tr>
              </thead>
              <tbody>
                {quotations.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono">{doc.code}</td>
                    <td className="py-2 pr-2">
                      {new Date(doc.documentDate).toLocaleDateString('th-TH')}
                    </td>
                    <td className="py-2 pr-2">
                      {QUOTATION_STATUS_LABEL[doc.status] ?? doc.status}
                      {doc.voidReason && (
                        <span className="ml-1 text-xs text-gray-400">({doc.voidReason})</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatCurrency(Number(doc.grandTotal))}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => openPrint(doc.id)}
                        className="text-gray-400 hover:text-primary-600"
                        title="พิมพ์"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Modals */}
      <EstimateFormModal
        open={editEstimateOpen}
        onClose={() => setEditEstimateOpen(false)}
        projectId={projectId}
        estimate={estimate}
      />
      <EstimateItemModal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false)
          setEditItem(null)
        }}
        estimateId={id}
        item={editItem}
      />
      <ImportSubQuotationModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        estimateId={id}
        projectId={projectId}
      />
      <IssueQuotationModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        estimateId={id}
        previous={activeQuotation}
        onIssued={openPrint}
      />
      <VoidQuotationModal
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        document={voidTarget}
      />
      <ConfirmModal
        open={!!deleteItemTarget}
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={handleDeleteItem}
        title={`ลบรายการ "${deleteItemTarget?.name}"`}
        confirmLabel="ลบ"
        danger
        loading={deleteItem.isPending}
      />
    </div>
  )
}
