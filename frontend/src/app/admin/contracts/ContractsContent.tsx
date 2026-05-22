'use client'

import React from 'react'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type LucideIcon,
  Handshake,
  Plus,
  Eye,
  X,
  Save,
  Pencil,
  PlayCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button, Table, Pagination, EmptyState, Input, Select } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import {
  useContractsByProject,
  useCreateContract,
  useUpdateContract,
  type Contract,
} from '@/hooks/useContracts'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

const schema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อสัญญา'),
  totalAmount: z.coerce.number().min(0).optional(),
  contractDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const STATUS_ACTIONS: Record<string, { label: string; next: string; icon: LucideIcon }[]> = {
  DRAFT: [{ label: 'เปิดใช้งาน', next: 'ACTIVE', icon: PlayCircle }],
  ACTIVE: [
    { label: 'เสร็จสิ้น', next: 'COMPLETED', icon: CheckCircle },
    { label: 'ยกเลิก', next: 'CANCELLED', icon: XCircle },
  ],
}

interface Props {
  projectId: number
}

export function ContractsContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Contract | null>(null)
  const [detailTarget, setDetailTarget] = useState<Contract | null>(null)

  const { data, isLoading } = useContractsByProject(projectId, page)
  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract(editTarget?.id ?? 0, projectId)

  const statusMutation = useMutation({
    mutationFn: async ({ contractId, status }: { contractId: number; status: string }) => {
      const { data } = await api.patch(`/contracts/${contractId}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', 'project', projectId] }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function openCreate() {
    setEditTarget(null)
    reset({ title: '', totalAmount: undefined, contractDate: '', startDate: '', endDate: '' })
    setFormOpen(true)
  }

  function openEdit(c: Contract) {
    setEditTarget(c)
    reset({
      title: c.title,
      totalAmount: c.totalAmount,
      contractDate: c.contractDate?.slice(0, 10) ?? '',
      startDate: c.startDate?.slice(0, 10) ?? '',
      endDate: c.endDate?.slice(0, 10) ?? '',
    })
    setFormOpen(true)
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      contractDate: values.contractDate || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขสัญญาสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('สร้างสัญญาสำเร็จ')
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const contracts = data?.data ?? []
  const meta = data?.meta

  const columns = [
    {
      key: 'code',
      header: 'รหัส / ชื่อ',
      render: (c: Contract) => (
        <button className="text-left" onClick={() => setDetailTarget(c)}>
          <p className="text-xs font-mono text-gray-400">{c.code}</p>
          <p className="font-medium text-primary-700 hover:underline">{c.title}</p>
        </button>
      ),
    },
    { key: 'status', header: 'สถานะ', render: (c: Contract) => <StatusBadge status={c.status} /> },
    {
      key: 'amount',
      header: 'มูลค่าสัญญา',
      render: (c: Contract) => (
        <span className="font-semibold">{formatCurrency(c.totalAmount)}</span>
      ),
    },
    {
      key: 'dates',
      header: 'วันที่',
      render: (c: Contract) => (
        <div className="text-xs text-gray-500 space-y-0.5">
          {c.contractDate && <p>ทำสัญญา: {new Date(c.contractDate).toLocaleDateString('th-TH')}</p>}
          {c.startDate && <p>เริ่ม: {new Date(c.startDate).toLocaleDateString('th-TH')}</p>}
          {c.endDate && <p>สิ้นสุด: {new Date(c.endDate).toLocaleDateString('th-TH')}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c: Contract) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {STATUS_ACTIONS[c.status]?.map((action) => (
            <Button
              key={action.next}
              variant={
                action.next === 'ACTIVE' || action.next === 'COMPLETED' ? 'primary' : 'danger'
              }
              size="sm"
              icon={action.icon}
              onClick={() => statusMutation.mutate({ contractId: c.id, status: action.next })}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setDetailTarget(c)}>
            <Eye className="h-4 w-4" />
          </Button>
          {c.status === 'DRAFT' && (
            <Button variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(c)}>
              แก้ไข
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">สัญญาทั้งหมด {meta?.totalItems ?? 0} รายการ</p>
        <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
          สร้างสัญญา
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="ยังไม่มีสัญญา"
          description="สร้างสัญญาแรกสำหรับโครงการนี้"
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              สร้างสัญญา
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={contracts} keyExtractor={(c) => String(c.id)} />
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

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'แก้ไขสัญญา' : 'สร้างสัญญาใหม่'}
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
              {editTarget ? 'บันทึก' : 'สร้าง'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="ชื่อสัญญา" {...register('title')} error={errors.title?.message} required />
          <Input label="มูลค่าสัญญา (บาท)" type="number" {...register('totalAmount')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="วันที่ทำสัญญา" type="date" {...register('contractDate')} />
            <Input label="วันเริ่มงาน" type="date" {...register('startDate')} />
            <Input label="วันสิ้นสุด" type="date" {...register('endDate')} />
          </div>
        </form>
      </FormModal>

      {/* Contract detail modal */}
      <FormModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={detailTarget?.code ?? 'รายละเอียดสัญญา'}
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
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">ชื่อสัญญา</p>
              <p className="font-semibold text-gray-900">{detailTarget.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">มูลค่าสัญญา</p>
                <p className="font-semibold text-primary-700">
                  {formatCurrency(detailTarget.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">สถานะ</p>
                <StatusBadge status={detailTarget.status} />
              </div>
            </div>
            <hr />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">วันที่ทำสัญญา</p>
                <p>
                  {detailTarget.contractDate
                    ? new Date(detailTarget.contractDate).toLocaleDateString('th-TH')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">วันเริ่มงาน</p>
                <p>
                  {detailTarget.startDate
                    ? new Date(detailTarget.startDate).toLocaleDateString('th-TH')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">วันสิ้นสุด</p>
                <p>
                  {detailTarget.endDate
                    ? new Date(detailTarget.endDate).toLocaleDateString('th-TH')
                    : '-'}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              สร้างเมื่อ: {new Date(detailTarget.createdAt).toLocaleDateString('th-TH')}
            </div>
          </div>
        )}
      </FormModal>
    </div>
  )
}
