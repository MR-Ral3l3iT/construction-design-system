'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea, Button } from '@construction/ui'
import { X, Save, Plus, AlertTriangle } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useCreateDesignTask, useUpdateDesignTask, type DesignTask } from '@/hooks/useDesignTasks'
import { useToast } from '@/providers/toast-provider'

const schema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่องาน'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  projectId: number
  task?: DesignTask | null
  designStart?: string
  designEnd?: string
}

export function DesignTaskFormModal({
  open,
  onClose,
  projectId,
  task,
  designStart,
  designEnd,
}: Props) {
  const { success, error: toastError } = useToast()
  const isEdit = !!task
  const createMutation = useCreateDesignTask()
  const updateMutation = useUpdateDesignTask(task?.id ?? 0, projectId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? '',
        description: task?.description ?? '',
        startDate: task?.startDate ? task.startDate.slice(0, 10) : '',
        dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
      })
    }
  }, [open, task, reset])

  const watchedStart = watch('startDate')
  const watchedDue = watch('dueDate')

  const dateWarning = useMemo(() => {
    if (!designStart && !designEnd) return null
    const warnings: string[] = []
    if (designStart && watchedStart && watchedStart < designStart)
      warnings.push(`วันเริ่มต้น (${watchedStart}) ก่อนช่วงออกแบบ (${designStart})`)
    if (designEnd && watchedStart && watchedStart > designEnd)
      warnings.push(`วันเริ่มต้น (${watchedStart}) เกินช่วงออกแบบ (${designEnd})`)
    if (designEnd && watchedDue && watchedDue > designEnd)
      warnings.push(`วันกำหนดส่ง (${watchedDue}) เกินช่วงออกแบบ (${designEnd})`)
    if (designStart && watchedDue && watchedDue < designStart)
      warnings.push(`วันกำหนดส่ง (${watchedDue}) ก่อนช่วงออกแบบ (${designStart})`)
    return warnings.length ? warnings : null
  }, [designStart, designEnd, watchedStart, watchedDue])

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      description: values.description || undefined,
      startDate: values.startDate || undefined,
      dueDate: values.dueDate || undefined,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขงานออกแบบสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('สร้างงานออกแบบสำเร็จ')
      }
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'แก้ไขงานออกแบบ' : 'สร้างงานออกแบบใหม่'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={isEdit ? Save : Plus}
            onClick={handleSubmit(onSubmit)}
            loading={isPending}
          >
            {isEdit ? 'บันทึก' : 'สร้าง'}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="ชื่องานออกแบบ"
          {...register('title')}
          error={errors.title?.message}
          required
        />
        <Textarea label="รายละเอียด" {...register('description')} rows={3} />
        <div>
          {(designStart || designEnd) && (
            <p className="mb-1.5 text-xs text-gray-500">
              ช่วงออกแบบโครงการ:{' '}
              <span className="font-medium text-primary-600">
                {designStart ?? '—'} ถึง {designEnd ?? '—'}
              </span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="วันเริ่มต้น"
              type="date"
              {...register('startDate')}
              min={designStart}
              max={designEnd}
            />
            <Input
              label="วันกำหนดส่ง"
              type="date"
              {...register('dueDate')}
              min={designStart}
              max={designEnd}
            />
          </div>
          {dateWarning && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="space-y-0.5">
                {dateWarning.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700">
                    {w}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </FormModal>
  )
}
