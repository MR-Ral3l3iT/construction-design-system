'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save } from 'lucide-react'
import { Alert, Button, Card, CardBody, Input, Switch } from '@construction/ui'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/providers/toast-provider'
import { useCompany, useUpdateCompany } from '@/hooks/useCompany'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อบริษัท'),
  branchName: z.string().min(1, 'กรุณากรอกชื่อสาขา'),
  branchCode: z.string().regex(/^\d{5}$/, 'รหัสสาขาต้องเป็นตัวเลข 5 หลัก (00000 = สำนักงานใหญ่)'),
  taxId: z.string().regex(/^\d{13}$/, 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก'),
  address: z.string().min(1, 'กรุณากรอกที่อยู่'),
  contactLine: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('อีเมลไม่ถูกต้อง').or(z.literal('')).optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
  signatureName: z.string().optional(),
  isVatRegistered: z.boolean(),
  defaultVatPercent: z.coerce.number().min(0).max(100),
})
type FormValues = z.input<typeof schema>

export function CompanyProfileTab() {
  const { data: company, isLoading } = useCompany()
  const update = useUpdateCompany()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!company) return
    reset({
      name: company.name,
      branchName: company.branchName,
      branchCode: company.branchCode,
      taxId: company.taxId ?? '',
      address: company.address ?? '',
      contactLine: company.contactLine ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      website: company.website ?? '',
      logoUrl: company.logoUrl ?? '',
      signatureUrl: company.signatureUrl ?? '',
      signatureName: company.signatureName ?? '',
      isVatRegistered: company.isVatRegistered,
      defaultVatPercent: Number(company.defaultVatRate) * 100,
    })
  }, [company, reset])

  const isVatRegistered = watch('isVatRegistered')

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        ...values,
        defaultVatPercent: Number(values.defaultVatPercent),
        email: values.email || undefined,
      })
      toast.success('บันทึกข้อมูลบริษัทแล้ว')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  if (isLoading) return <LoadingState variant="card" />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <Alert variant="info" title="ข้อมูลนี้พิมพ์ลงบนเอกสารทุกใบ">
        ชื่อ ที่อยู่ และเลขประจำตัวผู้เสียภาษีจะถูกคัดลอกลงในเอกสาร ณ วันที่ออก — เอกสารที่ออกไปแล้ว
        จะไม่เปลี่ยนตามการแก้ไขที่นี่
      </Alert>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-gray-800">ข้อมูลนิติบุคคล</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="ชื่อบริษัท" error={errors.name?.message} {...register('name')} />
            <Input
              label="เลขประจำตัวผู้เสียภาษี"
              hint="13 หลัก ไม่ต้องใส่ขีด"
              error={errors.taxId?.message}
              {...register('taxId')}
            />
            <Input
              label="ชื่อสาขา"
              error={errors.branchName?.message}
              {...register('branchName')}
            />
            <Input
              label="รหัสสาขา"
              hint="00000 = สำนักงานใหญ่"
              error={errors.branchCode?.message}
              {...register('branchCode')}
            />
          </div>
          <Input label="ที่อยู่" error={errors.address?.message} {...register('address')} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-gray-800">ข้อมูลติดต่อ</h3>
          <Input
            label="บรรทัดติดต่อบนหัวเอกสาร"
            hint="ข้อความที่พิมพ์ใต้ที่อยู่ เช่น โทรศัพท์: 086-6449565  e-mail : uat.arch@gmail.com"
            {...register('contactLine')}
          />
          <div className="grid md:grid-cols-3 gap-4">
            <Input label="โทรศัพท์" {...register('phone')} />
            <Input label="อีเมล" error={errors.email?.message} {...register('email')} />
            <Input label="เว็บไซต์" {...register('website')} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-gray-800">โลโก้และลายเซ็น</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Input label="URL โลโก้" hint="เช่น /uat-logo.svg" {...register('logoUrl')} />
            <Input label="URL ลายเซ็น" {...register('signatureUrl')} />
            <Input
              label="ชื่อใต้ลายเซ็น"
              hint="เช่น ( อธิป ชลสวัสดิ์ )"
              {...register('signatureName')}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-gray-800">ภาษีมูลค่าเพิ่ม</h3>
          <Switch
            checked={!!isVatRegistered}
            onChange={(e) => setValue('isVatRegistered', e.target.checked, { shouldDirty: true })}
            label="บริษัทจดทะเบียนภาษีมูลค่าเพิ่ม"
          />
          {isVatRegistered ? (
            <div className="max-w-xs">
              <Input
                type="number"
                step="0.01"
                label="อัตรา VAT เริ่มต้น (%)"
                error={errors.defaultVatPercent?.message}
                {...register('defaultVatPercent')}
              />
            </div>
          ) : (
            <Alert variant="warning">
              เมื่อไม่ได้จด VAT ระบบจะไม่ออกเลขใบกำกับภาษีบนใบเสร็จ และไม่คิดภาษีขายในรายงาน ภ.พ.30
            </Alert>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          icon={Save}
          loading={update.isPending}
          disabled={!isDirty && !update.isPending}
        >
          บันทึก
        </Button>
      </div>
    </form>
  )
}
