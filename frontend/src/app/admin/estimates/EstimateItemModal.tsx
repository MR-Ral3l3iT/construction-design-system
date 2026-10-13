'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button } from '@construction/ui'
import { X, Save, Plus } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useAddEstimateItem, useUpdateEstimateItem, type EstimateItem } from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'
import { textToLines, type ItemLine } from '@/lib/descLines'
import { LinesEditor } from './LinesEditor'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อรายการ'),
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

/** รายการเก่าที่ยังไม่มี lines → แตกจาก description */
const initialLines = (item?: EstimateItem | null): ItemLine[] => {
  const lines = item?.lines ?? textToLines(item?.description ?? '')
  return lines.length > 0 ? lines : [{ text: '' }]
}

export function EstimateItemModal({ open, onClose, estimateId, item }: Props) {
  const { success, error: toastError } = useToast()
  const isEdit = !!item
  const addMutation = useAddEstimateItem(estimateId)
  const updateMutation = useUpdateEstimateItem(estimateId)
  const isPending = addMutation.isPending || updateMutation.isPending

  const [lines, setLines] = useState<ItemLine[]>([{ text: '' }])
  const [isPriced, setIsPriced] = useState(true)
  const [rawMode, setRawMode] = useState(false)

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
        quantity: item?.quantity ?? 1,
        unit: item?.unit ?? '',
        unitPrice: item?.unitPrice ?? 0,
      })
      setLines(initialLines(item))
      setIsPriced(item?.isPriced ?? true)
    }
  }, [open, item, reset])

  const quantity = watch('quantity') ?? 0
  const unitPrice = watch('unitPrice') ?? 0
  const total = isPriced ? Number(quantity) * Number(unitPrice) : 0

  async function onSubmit(values: FormData) {
    // backend ตัดบรรทัดว่างและช่องว่างท้ายบรรทัดให้อีกชั้น
    const payload = { ...values, lines: lines.filter((l) => l.text.trim() !== ''), isPriced }
    try {
      if (isEdit && item) {
        await updateMutation.mutateAsync({ itemId: item.id, payload })
        success('แก้ไขรายการสำเร็จ')
      } else {
        await addMutation.mutateAsync(payload)
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
      size="xl"
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
            // ข้อความใน Raw Editor ยังไม่ถูกนำไปใช้ — ต้องกด "อัปเดตรายละเอียด" ก่อน
            disabled={rawMode}
          >
            {isEdit ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="ชื่อหมวด / รายการ"
          {...register('name')}
          error={errors.name?.message}
          placeholder="เช่น หมวดงานออกแบบและจัดทำแบบ"
          required
        />

        <LinesEditor lines={lines} onChange={setLines} onRawModeChange={setRawMode} />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!isPriced}
            onChange={(e) => setIsPriced(!e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          หัวข้อไม่มีราคา
          <span className="text-xs text-gray-400">
            (มีเลขลำดับ ช่องจำนวนและราคาเว้นว่าง ไม่นับในยอดรวม)
          </span>
        </label>

        {isPriced && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Input label="จำนวน" type="number" step="0.01" {...register('quantity')} />
              <Input label="หน่วย" {...register('unit')} placeholder="เช่น งาน, ตร.ม." />
              <Input
                label="ราคาต่อหน่วย (฿)"
                type="number"
                step="0.01"
                {...register('unitPrice')}
              />
            </div>
            <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm">
              <span className="text-gray-500">รวม: </span>
              <span className="font-semibold text-primary-700">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(
                  total,
                )}
              </span>
            </div>
          </>
        )}
      </form>
    </FormModal>
  )
}
