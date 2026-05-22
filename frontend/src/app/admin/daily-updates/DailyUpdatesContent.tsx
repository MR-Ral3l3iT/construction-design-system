'use client'

import { useState } from 'react'
import { FileText, Plus, Send, Eye, X, Save, Pencil } from 'lucide-react'
import { Button, Table, Badge, EmptyState } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import { FileAttachments } from '@/components/shared/FileAttachments'
import {
  useDailyUpdatesByProject,
  useCreateDailyUpdate,
  useUpdateDailyUpdate,
  usePublishDailyUpdate,
  type DailyUpdate,
} from '@/hooks/useDailyUpdates'
import { useFilesByDailyUpdate } from '@/hooks/useFiles'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea } from '@construction/ui'

const schema = z.object({
  date: z.string().min(1, 'กรุณาระบุวันที่'),
  workDone: z.string().min(1, 'กรุณากรอกงานที่ทำ'),
  nextPlan: z.string().optional(),
  problem: z.string().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
})
type FormData = z.infer<typeof schema>

function DailyUpdateDetail({
  update,
  projectId,
  onClose,
}: {
  update: DailyUpdate
  projectId: number
  onClose: () => void
}) {
  const { data: files = [] } = useFilesByDailyUpdate(update.id)
  return (
    <FormModal
      open
      onClose={onClose}
      title={`รายงาน ${new Date(update.date).toLocaleDateString('th-TH')}`}
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" icon={X} onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={update.status} />
          <span className="text-gray-500">
            ความคืบหน้า: <strong>{update.progress}%</strong>
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">งานที่ทำวันนี้</p>
          <p className="whitespace-pre-wrap text-gray-800">{update.workDone}</p>
        </div>
        {update.nextPlan && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">แผนงานวันต่อไป</p>
            <p className="whitespace-pre-wrap text-gray-800">{update.nextPlan}</p>
          </div>
        )}
        {update.problem && (
          <div>
            <p className="text-xs font-medium text-red-500 mb-1">ปัญหาและอุปสรรค</p>
            <p className="whitespace-pre-wrap text-red-700">{update.problem}</p>
          </div>
        )}
        {update.reportedBy && (
          <p className="text-xs text-gray-400">ผู้รายงาน: {update.reportedBy.name}</p>
        )}
        <div className="border-t pt-3">
          <FileAttachments
            files={files}
            projectId={projectId}
            entityId={update.id}
            entityType="dailyUpdate"
            category="DAILY_UPDATE"
            readOnly={update.status === 'PUBLISHED'}
          />
        </div>
      </div>
    </FormModal>
  )
}

interface Props {
  projectId: number
}

export function DailyUpdatesContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DailyUpdate | null>(null)
  const [detailTarget, setDetailTarget] = useState<DailyUpdate | null>(null)

  const { data, isLoading } = useDailyUpdatesByProject(projectId)
  const createMutation = useCreateDailyUpdate()
  const updateMutation = useUpdateDailyUpdate(editTarget?.id ?? 0, projectId)
  const publishMutation = usePublishDailyUpdate(projectId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function openCreate() {
    setEditTarget(null)
    reset({
      date: new Date().toISOString().slice(0, 10),
      workDone: '',
      nextPlan: '',
      problem: '',
      progress: 0,
    })
    setFormOpen(true)
  }

  function openEdit(u: DailyUpdate) {
    setEditTarget(u)
    reset({
      date: u.date.slice(0, 10),
      workDone: u.workDone,
      nextPlan: u.nextPlan ?? '',
      problem: u.problem ?? '',
      progress: u.progress,
    })
    setFormOpen(true)
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      nextPlan: values.nextPlan || undefined,
      problem: values.problem || undefined,
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขรายงานสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('สร้างรายงานสำเร็จ')
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handlePublish(id: number) {
    try {
      await publishMutation.mutateAsync(id)
      success('เผยแพร่รายงานสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const updates = data?.data ?? []

  const columns = [
    {
      key: 'date',
      header: 'วันที่',
      render: (u: DailyUpdate) => (
        <button className="text-left" onClick={() => setDetailTarget(u)}>
          <span className="font-medium text-primary-700 hover:underline">
            {new Date(u.date).toLocaleDateString('th-TH')}
          </span>
        </button>
      ),
    },
    {
      key: 'workDone',
      header: 'งานที่ทำ',
      render: (u: DailyUpdate) => (
        <div className="max-w-xs">
          <p className="line-clamp-2 text-sm text-gray-700">{u.workDone}</p>
          {u.problem && (
            <p className="mt-0.5 line-clamp-1 text-xs text-red-500">ปัญหา: {u.problem}</p>
          )}
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'ความคืบหน้า',
      render: (u: DailyUpdate) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${u.progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{u.progress}%</span>
        </div>
      ),
    },
    {
      key: 'reportedBy',
      header: 'ผู้รายงาน',
      render: (u: DailyUpdate) => (
        <span className="text-sm text-gray-600">{u.reportedBy?.name ?? '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (u: DailyUpdate) => <StatusBadge status={u.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (u: DailyUpdate) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDetailTarget(u)}>
            <Eye className="h-4 w-4" />
          </Button>
          {u.status === 'DRAFT' && (
            <>
              <Button variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(u)}>
                แก้ไข
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                loading={publishMutation.isPending}
                onClick={() => handlePublish(u.id)}
              >
                เผยแพร่
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">รายงานทั้งหมด {updates.length} รายการ</p>
        <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
          เพิ่มรายงาน
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : updates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="ยังไม่มีรายงานประจำวัน"
          description="บันทึกผลการทำงานประจำวันแรก"
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              เพิ่มรายงาน
            </Button>
          }
        />
      ) : (
        <Table columns={columns} data={updates} keyExtractor={(u) => String(u.id)} />
      )}

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'แก้ไขรายงาน' : 'เพิ่มรายงานประจำวัน'}
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
          <Input
            label="วันที่"
            type="date"
            {...register('date')}
            error={errors.date?.message}
            required
          />
          <Textarea
            label="งานที่ทำวันนี้"
            {...register('workDone')}
            rows={3}
            error={errors.workDone?.message}
            required
          />
          <Textarea label="แผนงานวันต่อไป" {...register('nextPlan')} rows={2} />
          <Textarea label="ปัญหาและอุปสรรค" {...register('problem')} rows={2} />
          <Input
            label="ความคืบหน้ารวม (%)"
            type="number"
            min={0}
            max={100}
            {...register('progress')}
          />
        </form>
      </FormModal>

      {/* Detail modal */}
      {detailTarget && (
        <DailyUpdateDetail
          update={detailTarget}
          projectId={projectId}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
