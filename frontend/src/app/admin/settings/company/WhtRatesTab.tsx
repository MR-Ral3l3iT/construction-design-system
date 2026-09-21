'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus } from 'lucide-react'
import { Alert, Badge, Button, Card, Input, Switch, Table } from '@construction/ui'
import type { TableColumn } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/providers/toast-provider'
import {
  useCreateWhtRate,
  useUpdateWhtRate,
  useWhtRates,
  type WhtRate,
} from '@/hooks/useAccountingSettings'

const schema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัส'),
  percent: z.coerce.number().min(0, 'อัตราต้องไม่ติดลบ').max(100, 'อัตราต้องไม่เกิน 100'),
  description: z.string().min(1, 'กรุณากรอกคำอธิบาย'),
  section: z.string().optional(),
})
type FormValues = z.input<typeof schema>

export function WhtRatesTab() {
  const { data: rates, isLoading } = useWhtRates(true)
  const create = useCreateWhtRate()
  const update = useUpdateWhtRate()
  const toast = useToast()

  const [editing, setEditing] = useState<WhtRate | null>(null)
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function openCreate() {
    setEditing(null)
    reset({ code: '', percent: 3, description: '', section: '' })
    setOpen(true)
  }

  function openEdit(rate: WhtRate) {
    setEditing(rate)
    reset({
      code: rate.code,
      percent: rate.percent,
      description: rate.description,
      section: rate.section ?? '',
    })
    setOpen(true)
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        percent: Number(values.percent),
        description: values.description,
        section: values.section || undefined,
      }
      if (editing) await update.mutateAsync({ id: editing.id, ...payload })
      else await create.mutateAsync({ code: values.code, ...payload })
      toast.success(editing ? 'แก้ไขอัตราแล้ว' : 'เพิ่มอัตราแล้ว')
      setOpen(false)
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'บันทึกไม่สำเร็จ'
      toast.error(message)
    }
  }

  async function toggleActive(rate: WhtRate, isActive: boolean) {
    try {
      await update.mutateAsync({ id: rate.id, isActive })
    } catch {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ')
    }
  }

  const columns: TableColumn<WhtRate>[] = [
    {
      key: 'code',
      header: 'รหัส',
      width: '100px',
      render: (r) => <span className="font-mono">{r.code}</span>,
    },
    {
      key: 'percent',
      header: 'อัตรา',
      width: '90px',
      render: (r) => <Badge variant={r.percent === 0 ? 'default' : 'info'}>{r.percent}%</Badge>,
    },
    { key: 'description', header: 'ประเภทเงินได้', render: (r) => r.description },
    {
      key: 'section',
      header: 'มาตรา',
      width: '120px',
      render: (r) => <span className="text-gray-500">{r.section ?? '—'}</span>,
    },
    {
      key: 'isActive',
      header: 'ใช้งาน',
      width: '90px',
      render: (r) => (
        <Switch checked={r.isActive} onChange={(e) => toggleActive(r, e.target.checked)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (r) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            icon={Pencil}
            onClick={() => openEdit(r)}
            title="แก้ไข"
          />
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-4">
      <Alert variant="info" title="หัก ณ ที่จ่ายคิดจากฐานก่อน VAT">
        เช่น ค่างวด 150,000 บาท VAT 7% WHT 3% → VAT 10,500 · WHT 4,500 · รับเงินจริง 156,000 บาท
      </Alert>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          ผู้ออกเอกสารเลือกอัตราเองทุกใบ รายการนี้เป็นตัวเลือกใน dropdown
        </p>
        <Button icon={Plus} onClick={openCreate}>
          เพิ่มอัตรา
        </Button>
      </div>

      <Card padding="none">
        <Table columns={columns} data={rates ?? []} keyExtractor={(r) => String(r.id)} />
      </Card>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'แก้ไขอัตราหัก ณ ที่จ่าย' : 'เพิ่มอัตราหัก ณ ที่จ่าย'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={create.isPending || update.isPending}>
              บันทึก
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="รหัส"
              hint="เช่น WHT3"
              disabled={!!editing}
              error={errors.code?.message}
              {...register('code')}
            />
            <Input
              type="number"
              step="0.01"
              label="อัตรา (%)"
              error={errors.percent?.message}
              {...register('percent')}
            />
          </div>
          <Input
            label="ประเภทเงินได้"
            error={errors.description?.message}
            {...register('description')}
          />
          <Input label="มาตรา" hint="เช่น 40(7)(8)" {...register('section')} />
        </form>
      </FormModal>
    </div>
  )
}
