'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea, Button } from '@construction/ui'
import { X, Save, Plus } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { ThaiAddressFields } from '@/components/shared/ThaiAddressFields'
import { CustomerAvatarUpload } from '@/components/shared/CustomerAvatarUpload'
import {
  useCreateCustomer,
  useUpdateCustomer,
  useUploadCustomerAvatar,
  type Customer,
} from '@/hooks/useCustomers'
import { useToast } from '@/providers/toast-provider'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  type: z.string().optional(),
  companyName: z.string().optional(),
  taxId: z
    .string()
    .max(13, 'เลขประจำตัวผู้เสียภาษีต้องไม่เกิน 13 หลัก')
    .optional()
    .or(z.literal('')),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  subdistrict: z.string().optional(),
  postcode: z.string().optional(),
  note: z.string().optional(),
  leadStatus: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CustomerFormModalProps {
  open: boolean
  onClose: () => void
  customer?: Customer | null
}

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'บุคคลธรรมดา' },
  { value: 'COMPANY', label: 'นิติบุคคล / บริษัท' },
]

const LEAD_STATUS_OPTIONS = [
  { value: 'INTERESTED', label: 'สนใจ' },
  { value: 'SITE_VISIT', label: 'นัดสำรวจ' },
  { value: 'QUOTED', label: 'เสนอราคาแล้ว' },
  { value: 'CLOSED_WON', label: 'ปิดการขายสำเร็จ' },
  { value: 'CLOSED_LOST', label: 'ไม่สนใจ' },
]

export function CustomerFormModal({ open, onClose, customer }: CustomerFormModalProps) {
  const { success, error: toastError } = useToast()
  const isEdit = !!customer
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer(customer?.id ?? 0)
  const avatarUploadMutation = useUploadCustomerAvatar(customer?.id ?? 0)
  const isPending = createMutation.isPending || updateMutation.isPending
  const pendingAvatarRef = useRef<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? '',
        type: customer?.type ?? 'INDIVIDUAL',
        companyName: customer?.companyName ?? '',
        taxId: customer?.taxId ?? '',
        email: customer?.email ?? '',
        phone: customer?.phone ?? '',
        lineId: customer?.lineId ?? '',
        address: customer?.address ?? '',
        province: customer?.province ?? '',
        district: customer?.district ?? '',
        subdistrict: customer?.subdistrict ?? '',
        postcode: customer?.postcode ?? '',
        note: customer?.note ?? '',
        leadStatus: customer?.leadStatus ?? 'INTERESTED',
      })
      pendingAvatarRef.current = null
    }
  }, [open, customer, reset])

  function handleAvatarSelected(file: File) {
    pendingAvatarRef.current = file
    if (isEdit && customer?.id) {
      avatarUploadMutation.mutate(file, {
        onError: () => toastError('อัปโหลดรูปภาพไม่สำเร็จ'),
      })
    }
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      email: values.email || undefined,
      companyName: values.companyName || undefined,
      taxId: values.taxId || undefined,
      phone: values.phone || undefined,
      lineId: values.lineId || undefined,
      address: values.address || undefined,
      province: values.province || undefined,
      district: values.district || undefined,
      subdistrict: values.subdistrict || undefined,
      postcode: values.postcode || undefined,
      note: values.note || undefined,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขข้อมูลลูกค้าสำเร็จ')
      } else {
        const created = await createMutation.mutateAsync(payload)
        if (pendingAvatarRef.current && created?.id) {
          try {
            const form = new FormData()
            form.append('file', pendingAvatarRef.current)
            const { api } = await import('@/lib/api')
            await api.patch(`/customers/${created.id}/avatar`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } catch {
            // avatar upload failure is non-blocking
          }
        }
        success('สร้างลูกค้าใหม่สำเร็จ')
      }
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const typeValue = watch('type') ?? 'INDIVIDUAL'
  const leadStatusValue = watch('leadStatus') ?? 'INTERESTED'

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'แก้ไขข้อมูลลูกค้า' : 'สร้างลูกค้าใหม่'}
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
        {/* Avatar */}
        <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
          <CustomerAvatarUpload
            key={customer?.id ?? 'new'}
            avatarUrl={customer?.avatarUrl ?? null}
            name={watch('name') ?? ''}
            type={watch('type') ?? 'INDIVIDUAL'}
            size="md"
            uploading={avatarUploadMutation.isPending}
            onFileSelected={handleAvatarSelected}
          />
          <div>
            <p className="text-sm font-medium text-gray-700">รูปโปรไฟล์ลูกค้า</p>
            <p className="mt-0.5 text-xs text-gray-400">
              คลิกที่ไอคอนกล้องเพื่ออัปโหลด (JPEG, PNG, WebP — ไม่เกิน 5 MB)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="ประเภทลูกค้า"
            options={CUSTOMER_TYPE_OPTIONS}
            value={typeValue}
            onChange={(e) => setValue('type', e.target.value)}
          />
          <Select
            label="Lead Status"
            options={LEAD_STATUS_OPTIONS}
            value={leadStatusValue}
            onChange={(e) => setValue('leadStatus', e.target.value)}
          />
        </div>
        <Input
          label="ชื่อ-นามสกุล / ชื่อผู้ติดต่อ"
          {...register('name')}
          error={errors.name?.message}
          required
        />
        <Input
          label="ชื่อบริษัท / องค์กร"
          {...register('companyName')}
          placeholder="กรอกถ้าเป็นนิติบุคคล"
        />

        {typeValue === 'COMPANY' && (
          <Input
            label="เลขประจำตัวผู้เสียภาษี"
            {...register('taxId')}
            placeholder="0 0000 00000 00 0"
            maxLength={13}
            error={errors.taxId?.message}
            hint="13 หลัก ไม่ต้องมีขีด"
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="อีเมล" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="เบอร์โทรศัพท์" {...register('phone')} />
        </div>
        <Input label="LINE ID" {...register('lineId')} />
        <Input label="ที่อยู่" {...register('address')} />
        <div className="grid grid-cols-2 gap-4">
          <ThaiAddressFields
            value={{
              province: watch('province') ?? '',
              district: watch('district') ?? '',
              subdistrict: watch('subdistrict') ?? '',
              postcode: watch('postcode') ?? '',
            }}
            onChange={(v) => {
              setValue('province', v.province)
              setValue('district', v.district)
              setValue('subdistrict', v.subdistrict)
              setValue('postcode', v.postcode)
            }}
          />
        </div>
        <Textarea label="หมายเหตุ" {...register('note')} rows={3} />
      </form>
    </FormModal>
  )
}
