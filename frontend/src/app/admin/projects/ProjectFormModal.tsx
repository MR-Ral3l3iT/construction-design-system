'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea, Button } from '@construction/ui'
import { X, Save, Plus, Paperclip, Image, Trash2, FileText } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { ThaiAddressFields } from '@/components/shared/ThaiAddressFields'
import { useCreateProject, useUpdateProject, type Project } from '@/hooks/useProjects'
import { useCustomers } from '@/hooks/useCustomers'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'
import { convertToWebP, isImageFile } from '@/lib/imageUtils'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อโครงการ'),
  type: z.string().min(1, 'กรุณาเลือกประเภทโครงการ'),
  customerId: z.coerce.number().min(1, 'กรุณาเลือกลูกค้า'),
  addressLine: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  subdistrict: z.string().optional(),
  postcode: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  areaSize: z.string().optional(),
  description: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PendingFile {
  file: File
  preview?: string
}

interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
  project?: Project | null
  defaultCustomerId?: number
}

const PROJECT_TYPE_OPTIONS = [
  { value: 'DESIGN_ONLY', label: 'ออกแบบ (DS)' },
  { value: 'CONSTRUCTION', label: 'ก่อสร้าง (CN)' },
  { value: 'TURNKEY', label: 'ออกแบบ + ก่อสร้าง (DC)' },
]

async function uploadFile(projectId: number, file: File, category: string) {
  const form = new FormData()
  form.append('file', file)
  const params = new URLSearchParams({ projectId: String(projectId), category })
  await api.post(`/files/upload?${params}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function ProjectFormModal({
  open,
  onClose,
  project,
  defaultCustomerId,
}: ProjectFormModalProps) {
  const { success, error: toastError } = useToast()
  const isEdit = !!project
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject(project?.id ?? 0)
  const isPending = createMutation.isPending || updateMutation.isPending
  const { data: customersData } = useCustomers({ pageSize: 200 })

  const [pendingPlans, setPendingPlans] = useState<PendingFile[]>([])
  const [pendingImages, setPendingImages] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const planInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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
        name: project?.name ?? '',
        type: project?.type ?? 'DESIGN_ONLY',
        customerId: project?.customer?.id ?? defaultCustomerId ?? 0,
        addressLine: project?.addressLine ?? '',
        province: project?.province ?? '',
        district: project?.district ?? '',
        subdistrict: project?.subdistrict ?? '',
        postcode: project?.postcode ?? '',
        latitude: project?.latitude != null ? String(project.latitude) : '',
        longitude: project?.longitude != null ? String(project.longitude) : '',
        areaSize: project?.areaSize != null ? String(project.areaSize) : '',
        description: project?.description ?? '',
        budgetMin: project?.budgetMin ?? undefined,
        budgetMax: project?.budgetMax ?? undefined,
        startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project?.endDate ? project.endDate.slice(0, 10) : '',
      })
      setPendingPlans([])
      setPendingImages([])
    }
  }, [open, project, defaultCustomerId, reset])

  async function handlePlanFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const processed = await Promise.all(
      files.map(async (f) => {
        const converted = isImageFile(f) ? await convertToWebP(f) : f
        const preview = isImageFile(converted) ? URL.createObjectURL(converted) : undefined
        return { file: converted, preview }
      }),
    )
    setPendingPlans((prev) => [...prev, ...processed])
    e.target.value = ''
  }

  async function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const processed = await Promise.all(
      files.map(async (f) => {
        const converted = await convertToWebP(f)
        const preview = URL.createObjectURL(converted)
        return { file: converted, preview }
      }),
    )
    setPendingImages((prev) => [...prev, ...processed])
    e.target.value = ''
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      addressLine: values.addressLine || undefined,
      province: values.province || undefined,
      district: values.district || undefined,
      subdistrict: values.subdistrict || undefined,
      postcode: values.postcode || undefined,
      latitude: values.latitude || undefined,
      longitude: values.longitude || undefined,
      areaSize: values.areaSize || undefined,
      description: values.description || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    }
    try {
      let projectId: number
      if (isEdit) {
        await updateMutation.mutateAsync(payload)
        projectId = project!.id
        success('แก้ไขข้อมูลโครงการสำเร็จ')
      } else {
        const created = await createMutation.mutateAsync(payload)
        projectId = created.id
        success('สร้างโครงการใหม่สำเร็จ')
      }

      if (pendingPlans.length || pendingImages.length) {
        setUploading(true)
        try {
          await Promise.all([
            ...pendingPlans.map((p) => uploadFile(projectId, p.file, 'PLAN')),
            ...pendingImages.map((p) => uploadFile(projectId, p.file, 'IMAGE')),
          ])
        } catch {
          toastError('บันทึกโครงการสำเร็จ แต่อัปโหลดบางไฟล์ไม่สำเร็จ')
        } finally {
          setUploading(false)
        }
      }

      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const typeValue = watch('type') ?? 'DESIGN_ONLY'
  const isSubmitting = isPending || uploading

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'แก้ไขโครงการ' : 'สร้างโครงการใหม่'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={isEdit ? Save : Plus}
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            {isEdit ? 'บันทึก' : 'สร้าง'}
          </Button>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Info */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            ข้อมูลพื้นฐาน
          </p>
          <div className="space-y-4">
            <Input
              label="ชื่อโครงการ"
              {...register('name')}
              error={errors.name?.message}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="ประเภทโครงการ"
                options={PROJECT_TYPE_OPTIONS}
                value={typeValue}
                onChange={(e) => setValue('type', e.target.value)}
                error={errors.type?.message}
              />
              <Select
                label="ลูกค้า"
                options={[
                  { value: '0', label: '— เลือกลูกค้า —' },
                  ...(customersData?.data ?? []).map((c) => ({
                    value: String(c.id),
                    label: c.companyName ? `${c.name} (${c.companyName})` : c.name,
                  })),
                ]}
                value={String(watch('customerId') || 0)}
                onChange={(e) => setValue('customerId', Number(e.target.value))}
                error={errors.customerId?.message}
              />
            </div>
            <Textarea label="รายละเอียด" {...register('description')} rows={2} />
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              สถานที่ตั้งโครงการ
            </p>
            {(() => {
              const selectedCustomer = (customersData?.data ?? []).find(
                (c) => c.id === watch('customerId'),
              )
              const hasAddress = !!(selectedCustomer?.address || selectedCustomer?.province)
              return (
                <button
                  type="button"
                  disabled={!hasAddress}
                  title={
                    !selectedCustomer
                      ? 'เลือกลูกค้าก่อน'
                      : !hasAddress
                        ? 'ลูกค้าไม่มีข้อมูลที่อยู่'
                        : ''
                  }
                  onClick={() => {
                    if (!selectedCustomer) return
                    setValue('addressLine', selectedCustomer.address ?? '')
                    setValue('province', selectedCustomer.province ?? '')
                    setValue('district', selectedCustomer.district ?? '')
                    setValue('subdistrict', selectedCustomer.subdistrict ?? '')
                    setValue('postcode', selectedCustomer.postcode ?? '')
                  }}
                  className={[
                    'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    hasAddress
                      ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                      : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400',
                  ].join(' ')}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                  </svg>
                  ใช้ที่อยู่เดียวกับลูกค้า
                </button>
              )
            })()}
          </div>
          <div className="space-y-4">
            <Input label="ที่อยู่" {...register('addressLine')} placeholder="เลขที่ ถนน หมู่บ้าน" />
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
            <div className="grid grid-cols-3 gap-4">
              <Input label="ละติจูด" {...register('latitude')} placeholder="เช่น 13.7563" />
              <Input label="ลองติจูด" {...register('longitude')} placeholder="เช่น 100.5018" />
              <Input label="ขนาดพื้นที่ (ตร.ม.)" {...register('areaSize')} placeholder="เช่น 250" />
            </div>
          </div>
        </div>

        {/* Budget & Dates */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            งบประมาณและระยะเวลา
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="งบประมาณต่ำสุด (บาท)" type="number" {...register('budgetMin')} />
              <Input label="งบประมาณสูงสุด (บาท)" type="number" {...register('budgetMax')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="วันเริ่มต้นโครงการ" type="date" {...register('startDate')} />
              <Input label="วันสิ้นสุดโครงการ" type="date" {...register('endDate')} />
            </div>
          </div>
        </div>

        {/* Plan Attachments */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            แปลน / ไฟล์แนบ
          </p>
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-200 p-4 text-center hover:border-primary-300 hover:bg-primary-50/30"
            onClick={() => planInputRef.current?.click()}
          >
            <Paperclip className="mx-auto mb-1 h-5 w-5 text-gray-400" />
            <p className="text-xs text-gray-500">คลิกเพื่อแนบแปลน หรือ ไฟล์ PDF</p>
            <p className="mt-0.5 text-xs text-gray-400">รูปภาพจะถูกแปลงเป็น WebP อัตโนมัติ</p>
          </div>
          <input
            ref={planInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={handlePlanFiles}
          />
          {pendingPlans.length > 0 && (
            <div className="mt-2 space-y-1">
              {pendingPlans.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5">
                  {p.preview ? (
                    <img src={p.preview} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                    {p.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingPlans((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Images */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            ภาพประกอบโครงการ
          </p>
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-200 p-4 text-center hover:border-primary-300 hover:bg-primary-50/30"
            onClick={() => imageInputRef.current?.click()}
          >
            <Image className="mx-auto mb-1 h-5 w-5 text-gray-400" />
            <p className="text-xs text-gray-500">คลิกเพื่อเพิ่มภาพประกอบโครงการ</p>
            <p className="mt-0.5 text-xs text-gray-400">
              รองรับ JPEG, PNG, WebP — แปลงเป็น WebP อัตโนมัติ
            </p>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleImageFiles}
          />
          {pendingImages.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {pendingImages.map((p, i) => (
                <div key={i} className="group relative">
                  <img
                    src={p.preview}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </FormModal>
  )
}
