'use client'

import { useState } from 'react'
import { Plus, ShieldCheck, UserCog, UserX, Pencil, Trash2, X, Save } from 'lucide-react'
import { Button, Table, Badge, EmptyState, Input, Select } from '@construction/ui'
import { Tabs, TabList, Tab, TabPanel } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type User,
  type CreateUserPayload,
} from '@/hooks/useUsers'
import {
  useRoles,
  useRole,
  usePermissionsGrouped,
  useUpdateRolePermissions,
  type Role,
} from '@/hooks/useRoles'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'ใช้งาน',
  INACTIVE: 'ปิดใช้',
  SUSPENDED: 'ระงับ',
}

const createSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
  phone: z.string().optional(),
})
const editSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  phone: z.string().optional(),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
  status: z.string().optional(),
})
type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema>

export function TeamContent() {
  return (
    <Tabs defaultValue="users">
      <TabList>
        <Tab value="users">ผู้ใช้งาน</Tab>
        <Tab value="roles">บทบาทและสิทธิ์</Tab>
      </TabList>
      <TabPanel value="users">
        <UsersPanel />
      </TabPanel>
      <TabPanel value="roles">
        <RolesPanel />
      </TabPanel>
    </Tabs>
  )
}

function UsersPanel() {
  const { success, error: toastError } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])

  const { data, isLoading } = useUsers({ search: search || undefined })
  const { data: roles } = useRoles()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser(editTarget?.id ?? 0)
  const assignRolesMutation = useUpdateUser(roleModalUser?.id ?? 0)
  const deleteMutation = useDeleteUser()

  const createForm = useForm<CreateFormData>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  function openCreate() {
    setEditTarget(null)
    createForm.reset({ name: '', email: '', password: '', phone: '' })
    setFormOpen(true)
  }

  function openEdit(u: User) {
    setEditTarget(u)
    editForm.reset({ name: u.name, phone: u.phone ?? '', password: '', status: u.status })
    setFormOpen(true)
  }

  async function onCreateSubmit(values: CreateFormData) {
    try {
      await createMutation.mutateAsync(values)
      success('สร้างผู้ใช้งานสำเร็จ')
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function onEditSubmit(values: EditFormData) {
    const payload = { ...values, password: values.password || undefined }
    try {
      await updateMutation.mutateAsync(payload)
      success('แก้ไขผู้ใช้งานสำเร็จ')
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบผู้ใช้งานสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleAssignRoles() {
    if (!roleModalUser) return
    try {
      await assignRolesMutation.mutateAsync({ roleIds: selectedRoleIds })
      success('บันทึกบทบาทสำเร็จ')
      setRoleModalUser(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const users = data?.data ?? []

  const columns = [
    {
      key: 'name',
      header: 'ชื่อ',
      render: (u: User) => (
        <div>
          <p className="font-medium text-gray-900">{u.name}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'เบอร์โทร',
      render: (u: User) => <span className="text-sm text-gray-600">{u.phone ?? '-'}</span>,
    },
    {
      key: 'roles',
      header: 'บทบาท',
      render: (u: User) => (
        <div className="flex flex-wrap gap-1">
          {u.roles?.length ? (
            u.roles.map((r) => (
              <Badge key={r.role.id} variant="info">
                {r.role.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-gray-400">ยังไม่มีบทบาท</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (u: User) => <StatusBadge status={u.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (u: User) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRoleModalUser(u)
              setSelectedRoleIds(u.roles?.map((r) => r.role.id) ?? [])
            }}
          >
            <ShieldCheck className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(u)}>
            แก้ไข
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(u)}>
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="ค้นหาชื่อ / อีเมล"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
          เพิ่มผู้ใช้
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="ยังไม่มีผู้ใช้งาน"
          description="เพิ่มผู้ใช้งานแรก"
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              เพิ่มผู้ใช้
            </Button>
          }
        />
      ) : (
        <Table columns={columns} data={users} keyExtractor={(u) => String(u.id)} />
      )}

      {/* Create modal */}
      <FormModal
        open={formOpen && !editTarget}
        onClose={() => setFormOpen(false)}
        title="เพิ่มผู้ใช้งาน"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={createForm.handleSubmit(onCreateSubmit)}
              loading={createMutation.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <Input
            label="ชื่อ"
            {...createForm.register('name')}
            error={createForm.formState.errors.name?.message}
            required
          />
          <Input
            label="อีเมล"
            type="email"
            {...createForm.register('email')}
            error={createForm.formState.errors.email?.message}
            required
          />
          <Input
            label="รหัสผ่าน"
            type="password"
            {...createForm.register('password')}
            error={createForm.formState.errors.password?.message}
            required
          />
          <Input label="เบอร์โทร" {...createForm.register('phone')} />
        </form>
      </FormModal>

      {/* Edit modal */}
      <FormModal
        open={formOpen && !!editTarget}
        onClose={() => setFormOpen(false)}
        title={`แก้ไข — ${editTarget?.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={editForm.handleSubmit(onEditSubmit)}
              loading={updateMutation.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={editForm.handleSubmit(onEditSubmit)}>
          <Input
            label="ชื่อ"
            {...editForm.register('name')}
            error={editForm.formState.errors.name?.message}
            required
          />
          <Input label="เบอร์โทร" {...editForm.register('phone')} />
          <Input
            label="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
            type="password"
            {...editForm.register('password')}
            error={editForm.formState.errors.password?.message}
          />
          <Select
            label="สถานะ"
            {...editForm.register('status')}
            onChange={(e) => editForm.setValue('status', e.target.value)}
            options={[
              { value: 'ACTIVE', label: STATUS_LABEL.ACTIVE },
              { value: 'INACTIVE', label: STATUS_LABEL.INACTIVE },
              { value: 'SUSPENDED', label: STATUS_LABEL.SUSPENDED },
            ]}
          />
        </form>
      </FormModal>

      {/* Assign roles modal */}
      <FormModal
        open={!!roleModalUser}
        onClose={() => setRoleModalUser(null)}
        title={`บทบาท — ${roleModalUser?.name}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setRoleModalUser(null)}>
              ยกเลิก
            </Button>
            <Button variant="primary" icon={Save} onClick={handleAssignRoles}>
              บันทึก
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {roles?.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                checked={selectedRoleIds.includes(role.id)}
                onChange={(e) => {
                  setSelectedRoleIds((prev) =>
                    e.target.checked ? [...prev, role.id] : prev.filter((id) => id !== role.id),
                  )
                }}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{role.name}</p>
                {role._count && <p className="text-xs text-gray-500">{role._count.users} ผู้ใช้</p>}
              </div>
            </label>
          ))}
        </div>
      </FormModal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`ลบผู้ใช้ "${deleteTarget?.name}"`}
        description="ผู้ใช้งานจะถูกลบออกจากระบบ"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function RolesPanel() {
  const { success, error: toastError } = useToast()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())

  const { data: roles, isLoading } = useRoles()
  const { data: roleDetail } = useRole(selectedRoleId ?? 0)
  const { data: permissionsGrouped } = usePermissionsGrouped()
  const updatePermsMutation = useUpdateRolePermissions(selectedRoleId ?? 0)

  function openRole(role: Role) {
    setSelectedRoleId(role.id)
    const keys = new Set(role.permissions?.map((rp) => rp.permission.key) ?? [])
    setPendingKeys(keys)
  }

  function toggleKey(key: string) {
    setPendingKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleGroup(group: string, perms: { key: string }[]) {
    const allChecked = perms.every((p) => pendingKeys.has(p.key))
    setPendingKeys((prev) => {
      const next = new Set(prev)
      perms.forEach((p) => (allChecked ? next.delete(p.key) : next.add(p.key)))
      return next
    })
  }

  async function handleSave() {
    try {
      await updatePermsMutation.mutateAsync(Array.from(pendingKeys))
      success('บันทึก permissions สำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="pt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Role list */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">บทบาท</p>
        {(roles ?? []).map((role) => (
          <button
            key={role.id}
            onClick={() => openRole(role)}
            className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
              selectedRoleId === role.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{role.name}</p>
              <Badge variant="outline">{role._count?.users ?? 0} คน</Badge>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {role.permissions?.length ?? 0} permissions
            </p>
          </button>
        ))}
      </div>

      {/* Permission editor */}
      <div className="lg:col-span-2">
        {!selectedRoleId ? (
          <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-sm text-gray-400">
            เลือก Role เพื่อจัดการ Permissions
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{roleDetail?.name}</p>
                <p className="text-xs text-gray-500">{pendingKeys.size} permissions เลือกอยู่</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Save}
                onClick={handleSave}
                loading={updatePermsMutation.isPending}
              >
                บันทึก
              </Button>
            </div>

            {permissionsGrouped &&
              Object.entries(permissionsGrouped).map(([group, perms]) => {
                const allChecked = perms.every((p) => pendingKeys.has(p.key))
                const someChecked = perms.some((p) => pendingKeys.has(p.key))
                return (
                  <div key={group} className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-3 border-b px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked && !allChecked
                        }}
                        onChange={() => toggleGroup(group, perms)}
                      />
                      <p className="text-sm font-semibold text-gray-800 capitalize">{group}</p>
                      <Badge variant="outline">
                        {perms.filter((p) => pendingKeys.has(p.key)).length}/{perms.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-0 divide-y sm:grid-cols-3">
                      {perms.map((p) => (
                        <label
                          key={p.key}
                          className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600"
                            checked={pendingKeys.has(p.key)}
                            onChange={() => toggleKey(p.key)}
                          />
                          <span className="text-xs text-gray-700">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
