'use client'

import React from 'react'

import { useState } from 'react'
import {
  type LucideIcon,
  GitBranch,
  Plus,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Save,
  Pencil,
  ClipboardList,
  Send,
  CheckCircle,
} from 'lucide-react'
import { Button, Table, EmptyState } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import {
  useChangeRequestsByProject,
  useCreateChangeRequest,
  useUpdateChangeRequest,
  useApproveChangeRequest,
  useUpdateChangeRequestStatus,
  type ChangeRequest,
} from '@/hooks/useChangeRequests'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea } from '@construction/ui'

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '-'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

const CR_STATUS_ACTIONS: Record<
  string,
  { label: string; next: string; variant: 'primary' | 'outline' | 'danger'; icon: LucideIcon }[]
> = {
  REQUESTED: [
    { label: 'ประเมินราคา', next: 'ESTIMATING', variant: 'primary', icon: ClipboardList },
  ],
  ESTIMATING: [{ label: 'ส่งอนุมัติ', next: 'WAITING_APPROVAL', variant: 'primary', icon: Send }],
  APPROVED: [{ label: 'เสร็จสิ้น', next: 'COMPLETED', variant: 'outline', icon: CheckCircle }],
}

const schema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อคำขอ'),
  description: z.string().optional(),
  reason: z.string().optional(),
  estimatedAmount: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

const approveSchema = z.object({
  approvedAmount: z.coerce.number().min(0, 'กรอกจำนวนเงิน'),
})
type ApproveFormData = z.infer<typeof approveSchema>

interface Props {
  projectId: number
}

export function ChangeRequestsContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ChangeRequest | null>(null)
  const [approveTarget, setApproveTarget] = useState<ChangeRequest | null>(null)
  const [detailTarget, setDetailTarget] = useState<ChangeRequest | null>(null)

  const { data, isLoading } = useChangeRequestsByProject(projectId)
  const createMutation = useCreateChangeRequest()
  const updateMutation = useUpdateChangeRequest(editTarget?.id ?? 0, projectId)
  const approveMutation = useApproveChangeRequest(projectId)
  const statusMutation = useUpdateChangeRequestStatus(projectId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const approveForm = useForm<ApproveFormData>({ resolver: zodResolver(approveSchema) })

  function openCreate() {
    setEditTarget(null)
    reset({ title: '', description: '', reason: '', estimatedAmount: undefined })
    setFormOpen(true)
  }

  function openEdit(cr: ChangeRequest) {
    setEditTarget(cr)
    reset({
      title: cr.title,
      description: cr.description ?? '',
      reason: cr.reason ?? '',
      estimatedAmount: cr.estimatedAmount ?? undefined,
    })
    setFormOpen(true)
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      description: values.description || undefined,
      reason: values.reason || undefined,
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขคำขอสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('สร้างคำขอสำเร็จ')
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function onApprove(values: ApproveFormData) {
    if (!approveTarget) return
    try {
      await approveMutation.mutateAsync({
        id: approveTarget.id,
        approvedAmount: values.approvedAmount,
      })
      success('อนุมัติคำขอสำเร็จ')
      setApproveTarget(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleReject(id: number) {
    try {
      await statusMutation.mutateAsync({ id, status: 'REJECTED' })
      success('ปฏิเสธคำขอแล้ว')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await statusMutation.mutateAsync({ id, status })
      success('อัปเดตสถานะสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const crs = data?.data ?? []

  const columns = [
    {
      key: 'title',
      header: 'คำขอ',
      render: (cr: ChangeRequest) => (
        <button className="text-left" onClick={() => setDetailTarget(cr)}>
          <p className="font-medium text-primary-700 hover:underline">{cr.title}</p>
          {cr.reason && <p className="line-clamp-1 text-xs text-gray-500">เหตุผล: {cr.reason}</p>}
        </button>
      ),
    },
    {
      key: 'amounts',
      header: 'มูลค่า',
      render: (cr: ChangeRequest) => (
        <div className="text-sm">
          <p className="text-gray-600">
            ประมาณ: <span className="font-medium">{formatCurrency(cr.estimatedAmount)}</span>
          </p>
          {cr.approvedAmount != null && (
            <p className="text-green-600">
              อนุมัติ: <span className="font-medium">{formatCurrency(cr.approvedAmount)}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'requestedBy',
      header: 'ผู้ขอ',
      render: (cr: ChangeRequest) => (
        <span className="text-sm text-gray-600">{cr.requestedBy?.name ?? '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (cr: ChangeRequest) => <StatusBadge status={cr.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (cr: ChangeRequest) => {
        const actions = CR_STATUS_ACTIONS[cr.status] ?? []
        return (
          <div className="flex items-center justify-end gap-2">
            {actions.map(({ label, next, variant, icon }) => (
              <Button
                key={next}
                variant={variant}
                size="sm"
                icon={icon}
                loading={statusMutation.isPending}
                onClick={() => handleStatusChange(cr.id, next)}
              >
                {label}
              </Button>
            ))}
            {cr.status === 'WAITING_APPROVAL' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => {
                    setApproveTarget(cr)
                    approveForm.reset({ approvedAmount: cr.estimatedAmount ?? 0 })
                  }}
                >
                  อนุมัติ
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  loading={statusMutation.isPending}
                  onClick={() => handleReject(cr.id)}
                >
                  ปฏิเสธ
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setDetailTarget(cr)}>
              <Eye className="h-4 w-4" />
            </Button>
            {(cr.status === 'REQUESTED' || cr.status === 'ESTIMATING') && (
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(cr)}>
                แก้ไข
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">คำขอทั้งหมด {crs.length} รายการ</p>
        <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
          เพิ่มคำขอ
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : crs.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="ไม่มีคำขอเปลี่ยนแปลง"
          description="บันทึกคำขอเปลี่ยนแปลงขอบเขตหรืองบประมาณ"
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              เพิ่มคำขอ
            </Button>
          }
        />
      ) : (
        <Table columns={columns} data={crs} keyExtractor={(cr) => String(cr.id)} />
      )}

      {/* Create/Edit modal */}
      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'แก้ไขคำขอ' : 'เพิ่มคำขอเปลี่ยนแปลง'}
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
          <Input label="ชื่อคำขอ" {...register('title')} error={errors.title?.message} required />
          <Textarea label="รายละเอียด" {...register('description')} rows={3} />
          <Textarea label="เหตุผล" {...register('reason')} rows={2} />
          <Input label="มูลค่าประมาณ (บาท)" type="number" {...register('estimatedAmount')} />
        </form>
      </FormModal>

      {/* Approve modal */}
      <FormModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title={`อนุมัติคำขอ — ${approveTarget?.title}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setApproveTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={approveForm.handleSubmit(onApprove)}
              loading={approveMutation.isPending}
            >
              อนุมัติ
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={approveForm.handleSubmit(onApprove)}>
          <p className="text-sm text-gray-600">
            มูลค่าประมาณ:{' '}
            <span className="font-semibold">{formatCurrency(approveTarget?.estimatedAmount)}</span>
          </p>
          <Input
            label="มูลค่าที่อนุมัติ (บาท)"
            type="number"
            {...approveForm.register('approvedAmount')}
            error={approveForm.formState.errors.approvedAmount?.message}
            required
          />
        </form>
      </FormModal>

      {/* Detail modal */}
      <FormModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={detailTarget?.title ?? 'รายละเอียดคำขอ'}
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="ghost" icon={X} onClick={() => setDetailTarget(null)}>
              ปิด
            </Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <StatusBadge status={detailTarget.status} />
              {detailTarget.approvedAt && (
                <span className="text-xs text-green-600">
                  อนุมัติเมื่อ: {new Date(detailTarget.approvedAt).toLocaleDateString('th-TH')}
                </span>
              )}
            </div>
            {detailTarget.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">รายละเอียด</p>
                <p className="whitespace-pre-wrap text-gray-800">{detailTarget.description}</p>
              </div>
            )}
            {detailTarget.reason && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">เหตุผล</p>
                <p className="whitespace-pre-wrap text-gray-800">{detailTarget.reason}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-500">มูลค่าประมาณ</p>
                <p className="font-semibold">{formatCurrency(detailTarget.estimatedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">มูลค่าที่อนุมัติ</p>
                <p className="font-semibold text-green-600">
                  {formatCurrency(detailTarget.approvedAmount)}
                </p>
              </div>
            </div>
            {detailTarget.requestedBy && (
              <p className="text-xs text-gray-400">ผู้ขอ: {detailTarget.requestedBy.name}</p>
            )}
            <p className="text-xs text-gray-400">
              สร้างเมื่อ: {new Date(detailTarget.createdAt).toLocaleDateString('th-TH')}
            </p>
          </div>
        )}
      </FormModal>
    </div>
  )
}
