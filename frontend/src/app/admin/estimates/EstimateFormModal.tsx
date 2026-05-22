'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea, Button } from '@construction/ui'
import { X, Save, Plus } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useCreateEstimate, useUpdateEstimate, type Estimate } from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'

const schema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อใบประเมิน'),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  projectId: number
  estimate?: Estimate | null
}

export function EstimateFormModal({ open, onClose, projectId, estimate }: Props) {
  const { success, error: toastError } = useToast()
  const isEdit = !!estimate
  const createMutation = useCreateEstimate()
  const updateMutation = useUpdateEstimate(estimate?.id ?? 0, projectId)
  const isPending = createMutation.isPending || updateMutation.isPending

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
        title: estimate?.title ?? '',
        description: estimate?.description ?? '',
      })
    }
  }, [open, estimate, reset])

  async function onSubmit(values: FormData) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values)
        success('แก้ไขใบประเมินสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...values, projectId })
        success('สร้างใบประเมินสำเร็จ')
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
      title={isEdit ? 'แก้ไขใบประเมิน' : 'สร้างใบประเมินใหม่'}
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
          label="ชื่อใบประเมิน"
          {...register('title')}
          error={errors.title?.message}
          required
        />
        <Textarea label="รายละเอียด" {...register('description')} rows={3} />
      </form>
    </FormModal>
  )
}
