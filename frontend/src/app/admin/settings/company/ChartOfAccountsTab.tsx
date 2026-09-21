'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ListTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardBody, EmptyState, Input, Select } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/providers/toast-provider'
import {
  ACCOUNT_TYPE_LABEL,
  useChartOfAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
  type AccountType,
  type ChartOfAccountNode,
} from '@/hooks/useAccountingSettings'

const schema = z.object({
  code: z.string().regex(/^\d{4}$/, 'รหัสบัญชีต้องเป็นตัวเลข 4 หลัก'),
  name: z.string().min(1, 'กรุณากรอกชื่อบัญชี'),
  type: z.enum(['INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY']),
  parentId: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const TYPE_VARIANT: Record<AccountType, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  INCOME: 'success',
  EXPENSE: 'danger',
  ASSET: 'info',
  LIABILITY: 'warning',
  EQUITY: 'default',
}

/** แผ่ tree เป็นรายการแบนพร้อมระดับชั้น เพื่อใช้ทั้งตารางและ dropdown เลือกบัญชีแม่ */
function flatten(
  nodes: ChartOfAccountNode[],
  depth = 0,
): Array<ChartOfAccountNode & { depth: number }> {
  return nodes.flatMap((n) => [{ ...n, depth }, ...flatten(n.children, depth + 1)])
}

export function ChartOfAccountsTab() {
  const { data: tree, isLoading } = useChartOfAccounts(true)
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const remove = useDeleteAccount()
  const toast = useToast()

  const [editing, setEditing] = useState<ChartOfAccountNode | null>(null)
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const rows = flatten(tree ?? [])

  function openCreate() {
    setEditing(null)
    reset({ code: '', name: '', type: 'EXPENSE', parentId: '' })
    setOpen(true)
  }

  function openEdit(account: ChartOfAccountNode) {
    setEditing(account)
    reset({
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId ? String(account.parentId) : '',
    })
    setOpen(true)
  }

  async function onSubmit(values: FormValues) {
    const parentId = values.parentId ? Number(values.parentId) : undefined
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          name: values.name,
          type: values.type,
          parentId: parentId ?? null,
        })
      } else {
        await create.mutateAsync({
          code: values.code,
          name: values.name,
          type: values.type,
          parentId,
        })
      }
      toast.success(editing ? 'แก้ไขบัญชีแล้ว' : 'เพิ่มบัญชีแล้ว')
      setOpen(false)
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'บันทึกไม่สำเร็จ'
      toast.error(message)
    }
  }

  async function onDelete(account: ChartOfAccountNode) {
    if (!confirm(`ลบบัญชี ${account.code} ${account.name}?`)) return
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

  if (isLoading) return <LoadingState />

  // บัญชีแม่เลือกได้เฉพาะระดับบนสุด เพื่อไม่ให้ผังลึกเกินสองชั้นจนอ่านงบยาก
  const parentOptions = [
    { value: '', label: '— ไม่มีบัญชีแม่ (บัญชีหมวดหลัก) —' },
    ...(tree ?? []).map((n) => ({ value: String(n.id), label: `${n.code} ${n.name}` })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          ใช้จัดหมวดรายรับ-รายจ่ายในสมุดบัญชี และเป็นตัวแบ่งหมวดในงบกำไรขาดทุนรายโครงการ
        </p>
        <Button icon={Plus} onClick={openCreate}>
          เพิ่มบัญชี
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={ListTree}
              title="ยังไม่มีผังบัญชี"
              description="รัน prisma db seed เพื่อสร้างผังบัญชีตั้งต้นสำหรับงานออกแบบและก่อสร้าง"
            />
          </CardBody>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group"
                style={{ paddingLeft: 16 + row.depth * 24 }}
              >
                <span
                  className={
                    row.depth === 0
                      ? 'font-mono font-semibold text-gray-800 w-14'
                      : 'font-mono text-gray-500 w-14'
                  }
                >
                  {row.code}
                </span>
                <span className={row.depth === 0 ? 'font-semibold text-gray-800' : 'text-gray-700'}>
                  {row.name}
                </span>
                {row.depth === 0 && (
                  <Badge variant={TYPE_VARIANT[row.type]}>{ACCOUNT_TYPE_LABEL[row.type]}</Badge>
                )}
                {!row.isActive && <Badge variant="default">ปิดใช้งาน</Badge>}
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            ))}
          </div>
        </Card>
      )}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี'}
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
              label="รหัสบัญชี"
              hint="4 หลัก เช่น 5100"
              disabled={!!editing}
              error={errors.code?.message}
              {...register('code')}
            />
            <Select
              label="หมวด"
              options={Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
              error={errors.type?.message}
              {...register('type')}
            />
          </div>
          <Input label="ชื่อบัญชี" error={errors.name?.message} {...register('name')} />
          <Select label="บัญชีแม่" options={parentOptions} {...register('parentId')} />
        </form>
      </FormModal>
    </div>
  )
}
