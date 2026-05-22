'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Pencil,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  Trash2,
  Printer,
  Receipt,
} from 'lucide-react'
import { Button, Table, Pagination, EmptyState, Badge, Input, Select } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormModal } from '@/components/shared/FormModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { EstimateFormModal } from './EstimateFormModal'
import { CollapsibleSubQuotation } from './SubQuotationPanel'
import { useEstimatesByProject, useDeleteEstimate, type Estimate } from '@/hooks/useEstimates'
import { useBOQsByProject } from '@/hooks/useBOQ'
import {
  useQuotationsByProject,
  useCreateQuotation,
  useDeleteQuotation,
  QUOTATION_STATUS_LABEL,
  QUOTATION_STATUS_COLOR,
  type QuotationListItem,
} from '@/hooks/useQuotation'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  projectId: number
}

export function EstimatesContent({ projectId }: Props) {
  const { success, error } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Estimate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null)

  // Quotation state
  const [qtModalOpen, setQtModalOpen] = useState(false)
  const [qtTitle, setQtTitle] = useState('')
  const [qtBoqId, setQtBoqId] = useState('')
  const [qtDeleteTarget, setQtDeleteTarget] = useState<number | null>(null)

  const { data, isLoading } = useEstimatesByProject(projectId, page)
  const deleteMutation = useDeleteEstimate(projectId)
  const { data: boqList } = useBOQsByProject(projectId)
  const { data: quotationList } = useQuotationsByProject(projectId)
  const createQuotation = useCreateQuotation()
  const deleteQuotation = useDeleteQuotation(projectId)

  const boqs = boqList?.data ?? []
  const quotations = quotationList?.data ?? []

  const statusMutation = useMutation({
    mutationFn: async ({ estimateId, status }: { estimateId: number; status: string }) => {
      const { data } = await api.patch(`/estimates/${estimateId}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['estimates', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['estimates', vars.estimateId] })
      qc.invalidateQueries({ queryKey: ['estimates', 'overview'] })
      qc.invalidateQueries({ queryKey: ['sub-quotation', 'quotation'] })
    },
  })

  const qtStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.patch(`/quotation/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotation', 'project', projectId] }),
  })

  function renderQuotationActions(q: QuotationListItem) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {q.status === 'DRAFT' && (
          <Button
            variant="outline"
            size="sm"
            icon={Send}
            loading={qtStatusMutation.isPending}
            onClick={() => qtStatusMutation.mutate({ id: q.id, status: 'SENT' })}
          >
            ส่งให้ลูกค้า
          </Button>
        )}
        {q.status === 'SENT' && (
          <>
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle}
              loading={qtStatusMutation.isPending}
              onClick={() => {
                qtStatusMutation.mutate({ id: q.id, status: 'ACCEPTED' })
                success('อนุมัติใบเสนอราคาสำเร็จ')
              }}
            >
              ตอบรับ
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              loading={qtStatusMutation.isPending}
              onClick={() => qtStatusMutation.mutate({ id: q.id, status: 'REJECTED' })}
            >
              ปฏิเสธ
            </Button>
          </>
        )}
        {q.status === 'REJECTED' && (
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            loading={qtStatusMutation.isPending}
            onClick={() => qtStatusMutation.mutate({ id: q.id, status: 'DRAFT' })}
          >
            กลับเป็นร่าง
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={Printer}
          onClick={() => window.open(`/print/quotation/${q.id}`, '_blank')}
        >
          พิมพ์
        </Button>
        {q.status === 'DRAFT' && (
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setQtDeleteTarget(q.id)}>
            ลบ
          </Button>
        )}
      </div>
    )
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบใบประเมินสำเร็จ')
    } catch {
      error('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleCreateQuotation() {
    if (!qtTitle.trim()) return error('กรุณากรอกชื่อใบเสนอราคา')
    const boqId = parseInt(qtBoqId, 10)
    if (!boqId) return error('กรุณาเลือก BOQ')
    try {
      const q = await createQuotation.mutateAsync({ projectId, boqId, title: qtTitle.trim() })
      success('สร้างใบเสนอราคาสำเร็จ')
      setQtTitle('')
      setQtBoqId('')
      setQtModalOpen(false)
      window.open(`/print/quotation/${q.id}`, '_blank')
    } catch {
      error('เกิดข้อผิดพลาด')
    }
  }

  async function handleDeleteQuotation() {
    if (!qtDeleteTarget) return
    try {
      await deleteQuotation.mutateAsync(qtDeleteTarget)
      success('ลบใบเสนอราคาสำเร็จ')
    } catch {
      error('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setQtDeleteTarget(null)
    }
  }

  const estimates = data?.data ?? []
  const meta = data?.meta

  const columns = [
    {
      key: 'code',
      header: 'รหัส / ชื่อ',
      render: (e: Estimate) => (
        <div>
          <p className="text-xs font-mono text-gray-400">{e.code}</p>
          <p className="font-medium text-gray-900">{e.title}</p>
          {e.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{e.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (e: Estimate) => <StatusBadge status={e.status} />,
    },
    {
      key: 'total',
      header: 'มูลค่ารวม',
      render: (e: Estimate) => (
        <span className="font-semibold text-gray-900">{formatCurrency(e.totalAmount)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (e: Estimate) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {e.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={Send}
                onClick={() => statusMutation.mutate({ estimateId: e.id, status: 'SENT' })}
                loading={statusMutation.isPending}
              >
                ส่งให้ลูกค้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Pencil}
                onClick={() => {
                  setEditTarget(e)
                  setFormOpen(true)
                }}
              >
                แก้ไข
              </Button>
            </>
          )}
          {e.status === 'SENT' && (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle}
                onClick={() => {
                  statusMutation.mutate({ estimateId: e.id, status: 'APPROVED' })
                  success('อนุมัติใบประเมินสำเร็จ')
                }}
              >
                อนุมัติ
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={XCircle}
                onClick={() => statusMutation.mutate({ estimateId: e.id, status: 'REJECTED' })}
              >
                ปฏิเสธ
              </Button>
            </>
          )}
          {e.status === 'REJECTED' && (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => statusMutation.mutate({ estimateId: e.id, status: 'DRAFT' })}
            >
              กลับเป็นร่าง
            </Button>
          )}
          <Link href={`/admin/estimates/${e.id}?projectId=${projectId}`}>
            <Button variant="ghost" size="sm" icon={Eye}>
              รายละเอียด
            </Button>
          </Link>
          {e.status === 'DRAFT' && (
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteTarget(e)}>
              ลบ
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">ใบประเมินราคาทั้งหมด {meta?.totalItems ?? 0} รายการ</p>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          สร้างใบประเมิน
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : estimates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="ยังไม่มีใบประเมิน"
          description="สร้างใบประเมินราคาแรกสำหรับโครงการนี้"
          action={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditTarget(null)
                setFormOpen(true)
              }}
            >
              สร้างใบประเมิน
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={estimates} keyExtractor={(e) => String(e.id)} />
          {meta && (
            <div className="flex justify-end">
              <Pagination
                page={page}
                totalPages={meta.totalPages}
                totalItems={meta.totalItems}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* ─── ใบเสนอราคา section ─── */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary-600" />
            <h3 className="font-medium text-gray-900">ใบเสนอราคา</h3>
            {quotations.length > 0 && <Badge variant="info">{quotations.length}</Badge>}
          </div>
          {boqs.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setQtTitle('')
                setQtBoqId(boqs.length === 1 ? String(boqs[0].id) : '')
                setQtModalOpen(true)
              }}
            >
              สร้างใบเสนอราคา
            </Button>
          ) : (
            <Link href={`/admin/boq?projectId=${projectId}`}>
              <Button variant="outline" size="sm">
                สร้าง BOQ ก่อน
              </Button>
            </Link>
          )}
        </div>

        {boqs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
            <Receipt className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">ยังไม่มีใบเสนอราคา</p>
            <p className="mt-1 text-xs text-gray-400">
              ต้องสร้าง BOQ ในโครงการนี้ก่อน จึงจะสามารถสร้างใบเสนอราคาได้
            </p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
            <Receipt className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              ยังไม่มีใบเสนอราคา — กด &quot;สร้างใบเสนอราคา&quot; เพื่อ snapshot จาก BOQ
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {quotations.map((q) => (
              <div key={q.id}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-mono text-xs text-gray-400">{q.code}</p>
                    <p className="text-sm font-medium text-gray-900">{q.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Intl.NumberFormat('th-TH', {
                        style: 'currency',
                        currency: 'THB',
                        maximumFractionDigits: 0,
                      }).format(Number(q.totalAmount))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant={QUOTATION_STATUS_COLOR[q.status]}>
                      {QUOTATION_STATUS_LABEL[q.status]}
                    </Badge>
                    {renderQuotationActions(q)}
                  </div>
                </div>
                {q.boqId && (
                  <CollapsibleSubQuotation quotationId={q.id} quotationStatus={q.status} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <EstimateFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        estimate={editTarget}
      />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`ลบใบประเมิน "${deleteTarget?.title}"`}
        description="ใบประเมินและรายการทั้งหมดจะถูกลบ ไม่สามารถกู้คืนได้"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />

      {/* Create Quotation Modal */}
      <FormModal
        open={qtModalOpen}
        onClose={() => setQtModalOpen(false)}
        title="สร้างใบเสนอราคาจาก BOQ"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setQtModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Receipt}
              onClick={handleCreateQuotation}
              loading={createQuotation.isPending}
            >
              สร้าง
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="ชื่อใบเสนอราคา"
            value={qtTitle}
            onChange={(e) => setQtTitle(e.target.value)}
            required
            placeholder="เช่น ใบเสนอราคางานก่อสร้าง"
          />
          {boqs.length > 1 && (
            <Select
              label="เลือก BOQ"
              value={qtBoqId}
              onChange={(e) => setQtBoqId(e.target.value)}
              options={[
                { value: '', label: 'เลือก BOQ' },
                ...boqs.map((b) => ({ value: String(b.id), label: `${b.code} — ${b.title}` })),
              ]}
            />
          )}
          <p className="text-xs text-gray-500">
            ระบบจะ snapshot หมวดงาน หัวข้อย่อย และยอดรวมจาก BOQ
            {boqs.length === 1 ? ` ${boqs[0].code}` : ''} ไว้ในใบเสนอราคา
          </p>
        </div>
      </FormModal>

      <ConfirmModal
        open={!!qtDeleteTarget}
        onClose={() => setQtDeleteTarget(null)}
        onConfirm={handleDeleteQuotation}
        title="ลบใบเสนอราคา"
        description="ใบเสนอราคานี้จะถูกลบ ไม่สามารถกู้คืนได้"
        confirmLabel="ลบ"
        danger
        loading={deleteQuotation.isPending}
      />
    </div>
  )
}
