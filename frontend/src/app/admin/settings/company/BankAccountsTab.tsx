'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardBody, EmptyState, Input, Table } from '@construction/ui'
import type { TableColumn } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/providers/toast-provider'
import {
  useCompany,
  useCreateBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
  type BankAccount,
} from '@/hooks/useCompany'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อย่อ'),
  bankName: z.string().min(1, 'กรุณากรอกชื่อธนาคาร'),
  branchName: z.string().optional(),
  accountType: z.string().optional(),
  accountName: z.string().min(1, 'กรุณากรอกชื่อบัญชี'),
  accountNo: z.string().min(1, 'กรุณากรอกเลขที่บัญชี'),
  isDefault: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export function BankAccountsTab() {
  const { data: company, isLoading } = useCompany()
  const create = useCreateBankAccount()
  const update = useUpdateBankAccount()
  const remove = useDeleteBankAccount()
  const toast = useToast()

  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function openCreate() {
    setEditing(null)
    reset({
      name: '',
      bankName: '',
      branchName: '',
      accountType: 'ออมทรัพย์',
      accountName: '',
      accountNo: '',
    })
    setOpen(true)
  }

  function openEdit(account: BankAccount) {
    setEditing(account)
    reset({
      name: account.name,
      bankName: account.bankName,
      branchName: account.branchName ?? '',
      accountType: account.accountType,
      accountName: account.accountName,
      accountNo: account.accountNo,
      isDefault: account.isDefault,
    })
    setOpen(true)
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...values })
      else await create.mutateAsync(values)
      toast.success(editing ? 'แก้ไขบัญชีธนาคารแล้ว' : 'เพิ่มบัญชีธนาคารแล้ว')
      setOpen(false)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  async function setDefault(account: BankAccount) {
    try {
      await update.mutateAsync({ id: account.id, isDefault: true })
      toast.success(`ตั้ง ${account.name} เป็นบัญชีหลักแล้ว`)
    } catch {
      toast.error('ตั้งบัญชีหลักไม่สำเร็จ')
    }
  }

  async function onDelete(account: BankAccount) {
    if (!confirm(`ลบบัญชี ${account.name} (${account.accountNo})?`)) return
    try {
      await remove.mutateAsync(account.id)
      toast.success('ลบบัญชีแล้ว')
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'ลบไม่สำเร็จ'
      toast.error(message)
    }
  }

  const columns: TableColumn<BankAccount>[] = [
    {
      key: 'name',
      header: 'ชื่อย่อ',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{row.name}</span>
          {row.isDefault && <Badge variant="success">บัญชีหลัก</Badge>}
          {!row.isActive && <Badge variant="default">ปิดใช้งาน</Badge>}
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'ธนาคาร',
      render: (row) => (
        <div>
          <div>{row.bankName}</div>
          {row.branchName && <div className="text-xs text-gray-400">{row.branchName}</div>}
        </div>
      ),
    },
    { key: 'accountName', header: 'ชื่อบัญชี', render: (row) => row.accountName },
    {
      key: 'accountNo',
      header: 'เลขที่บัญชี',
      render: (row) => (
        <span className="font-mono tracking-wide">
          {row.accountNo}
          <span className="ml-2 text-xs text-gray-400">{row.accountType}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              icon={CheckCircle2}
              onClick={() => setDefault(row)}
              title="ตั้งเป็นบัญชีหลัก"
            >
              ตั้งเป็นหลัก
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={Pencil}
            onClick={() => openEdit(row)}
            title="แก้ไข"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => onDelete(row)}
            title="ลบ"
          />
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState />

  const accounts = company?.bankAccounts ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          บัญชีหลักจะถูกพิมพ์บนใบแจ้งหนี้และใบวางบิลเป็นค่าเริ่มต้น
        </p>
        <Button icon={Plus} onClick={openCreate}>
          เพิ่มบัญชี
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Landmark}
              title="ยังไม่มีบัญชีธนาคาร"
              description="เพิ่มบัญชีอย่างน้อยหนึ่งบัญชีเพื่อให้พิมพ์ช่องทางชำระเงินบนเอกสารได้"
            />
          </CardBody>
        </Card>
      ) : (
        <Card padding="none">
          <Table columns={columns} data={accounts} keyExtractor={(row) => String(row.id)} />
        </Card>
      )}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'แก้ไขบัญชีธนาคาร' : 'เพิ่มบัญชีธนาคาร'}
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
          <Input
            label="ชื่อย่อ"
            hint="ใช้เลือกใน dropdown เช่น กสิกรไทย ออมทรัพย์"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="ธนาคาร" error={errors.bankName?.message} {...register('bankName')} />
            <Input label="สาขา" {...register('branchName')} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="ประเภทบัญชี" {...register('accountType')} />
            <Input
              label="เลขที่บัญชี"
              error={errors.accountNo?.message}
              {...register('accountNo')}
            />
          </div>
          <Input
            label="ชื่อบัญชี"
            error={errors.accountName?.message}
            {...register('accountName')}
          />
        </form>
      </FormModal>
    </div>
  )
}
