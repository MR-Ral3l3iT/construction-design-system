'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button } from '@construction/ui'
import { X, Save, Plus } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useAddEstimateItem, useUpdateEstimateItem, type EstimateItem } from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อรายการ'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0).default(1),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0).default(0),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  estimateId: number
  item?: EstimateItem | null
}

export function EstimateItemModal({ open, onClose, estimateId, item }: Props) {
  const { success, error: toastError } = useToast()
  const isEdit = !!item
  const addMutation = useAddEstimateItem(estimateId)
  const updateMutation = useUpdateEstimateItem(estimateId)
  const isPending = addMutation.isPending || updateMutation.isPending

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
        name: item?.name ?? '',
        description: item?.description ?? '',
        quantity: item?.quantity ?? 1,
        unit: item?.unit ?? '',
        unitPrice: item?.unitPrice ?? 0,
      })
    }
  }, [open, item, reset])

  const quantity = watch('quantity') ?? 0
  const unitPrice = watch('unitPrice') ?? 0
  const total = Number(quantity) * Number(unitPrice)

  async function onSubmit(values: FormData) {
    try {
      if (isEdit && item) {
        await updateMutation.mutateAsync({ itemId: item.id, payload: values })
        success('แก้ไขรายการสำเร็จ')
      } else {
        await addMutation.mutateAsync(values)
        success('เพิ่มรายการสำเร็จ')
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
      title={isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
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
            {isEdit ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="ชื่อรายการ" {...register('name')} error={errors.name?.message} required />
        <Input label="รายละเอียด" {...register('description')} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="จำนวน" type="number" step="0.01" {...register('quantity')} />
          <Input label="หน่วย" {...register('unit')} placeholder="เช่น ตร.ม., งาน" />
          <Input label="ราคาต่อหน่วย (฿)" type="number" step="0.01" {...register('unitPrice')} />
        </div>
        <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm">
          <span className="text-gray-500">รวม: </span>
          <span className="font-semibold text-primary-700">
            {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(total)}
          </span>
        </div>
      </form>
    </FormModal>
  )
}
