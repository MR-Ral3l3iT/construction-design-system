'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button } from '@construction/ui'
import { X, Save, CalendarRange } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useUpdateProject } from '@/hooks/useProjects'
import { useToast } from '@/providers/toast-provider'

const schema = z
  .object({
    designStartDate: z.string().min(1, 'กรุณาระบุวันเริ่มต้น'),
    designEndDate: z.string().min(1, 'กรุณาระบุวันสิ้นสุด'),
  })
  .refine((d) => d.designStartDate <= d.designEndDate, {
    message: 'วันเริ่มต้นต้องไม่เกินวันสิ้นสุด',
    path: ['designEndDate'],
  })

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  projectId: number
  designStartDate?: string | null
  designEndDate?: string | null
}

export function DesignTimelineModal({
  open,
  onClose,
  projectId,
  designStartDate,
  designEndDate,
}: Props) {
  const { success, error: toastError } = useToast()
  const updateMutation = useUpdateProject(projectId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      reset({
        designStartDate: designStartDate ? designStartDate.slice(0, 10) : '',
        designEndDate: designEndDate ? designEndDate.slice(0, 10) : '',
      })
    }
  }, [open, designStartDate, designEndDate, reset])

  async function onSubmit(values: FormData) {
    try {
      await updateMutation.mutateAsync(values)
      success('บันทึกระยะเวลาออกแบบสำเร็จ')
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
      title="กำหนดระยะเวลางานออกแบบ"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose} disabled={updateMutation.isPending}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSubmit(onSubmit)}
            loading={updateMutation.isPending}
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5">
          <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
          <p className="text-xs text-primary-700">
            กำหนด timeline ให้งานออกแบบทั้งหมดในโครงการนี้ —
            งานออกแบบย่อยแต่ละชิ้นต้องอยู่ภายในช่วงนี้
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="วันเริ่มงานออกแบบ"
            type="date"
            {...register('designStartDate')}
            error={errors.designStartDate?.message}
            required
          />
          <Input
            label="วันสิ้นสุดงานออกแบบ"
            type="date"
            {...register('designEndDate')}
            error={errors.designEndDate?.message}
            required
          />
        </div>
      </form>
    </FormModal>
  )
}
