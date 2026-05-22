'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Phone,
  Mail,
  MapPin,
  Hash,
  ChevronRight,
  ShieldCheck,
  Pencil,
  Trash2,
  Plus,
  X,
  KeyRound,
  Send,
} from 'lucide-react'
import { Card, CardBody, Badge, Button, Select, Input } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormModal } from '@/components/shared/FormModal'
import { CustomerAvatarUpload } from '@/components/shared/CustomerAvatarUpload'
import { CustomerFormModal } from '../CustomerFormModal'
import {
  useCustomer,
  useUpdateLeadStatus,
  useDeleteCustomer,
  useCreateCustomerAccount,
  useUpdateCustomerAccount,
  useDeleteCustomerAccount,
  useUploadCustomerAvatar,
  useSendCustomerCredentials,
} from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import { useToast } from '@/providers/toast-provider'

const LEAD_STATUS_OPTIONS = [
  { value: 'INTERESTED', label: 'สนใจ' },
  { value: 'SITE_VISIT', label: 'นัดสำรวจ' },
  { value: 'QUOTED', label: 'เสนอราคาแล้ว' },
  { value: 'CLOSED_WON', label: 'ปิดการขายสำเร็จ' },
  { value: 'CLOSED_LOST', label: 'ไม่สนใจ' },
]

const TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: 'บุคคลธรรมดา',
  COMPANY: 'นิติบุคคล / บริษัท',
}

interface Props {
  id: number
}

export function CustomerDetail({ id }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { data: customer, isLoading } = useCustomer(id)
  const { data: projectsData } = useProjects({ customerId: id, pageSize: 20 })
  const updateLeadStatus = useUpdateLeadStatus(id)
  const deleteMutation = useDeleteCustomer()
  const createAccountMutation = useCreateCustomerAccount(id)
  const updateAccountMutation = useUpdateCustomerAccount(id)
  const deleteAccountMutation = useDeleteCustomerAccount(id)
  const avatarUploadMutation = useUploadCustomerAvatar(id)
  const sendCredentialsMutation = useSendCustomerCredentials(id)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [editAccountEmail, setEditAccountEmail] = useState('')
  const [editAccountPassword, setEditAccountPassword] = useState('')
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [sendCredOpen, setSendCredOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!customer) {
    return <p className="text-gray-500">ไม่พบข้อมูลลูกค้า</p>
  }

  async function handleLeadStatus(status: string) {
    try {
      await updateLeadStatus.mutateAsync(status)
      success('อัปเดต Lead Status สำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id)
      success('ลบลูกค้าสำเร็จ')
      router.push('/admin/customers')
    } catch {
      toastError('เกิดข้อผิดพลาดในการลบ')
    }
  }

  async function handleCreateAccount() {
    if (!accountEmail || !accountPassword) return toastError('กรุณากรอกข้อมูลให้ครบ')
    try {
      await createAccountMutation.mutateAsync({ email: accountEmail, password: accountPassword })
      success('สร้างบัญชี Client Portal สำเร็จ')
      setAccountOpen(false)
      setAccountEmail('')
      setAccountPassword('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  function openEditAccount() {
    setEditAccountEmail(customer?.user?.email ?? '')
    setEditAccountPassword('')
    setEditAccountOpen(true)
  }

  async function handleUpdateAccount() {
    const payload: { email?: string; password?: string } = {}
    if (editAccountEmail && editAccountEmail !== customer?.user?.email)
      payload.email = editAccountEmail
    if (editAccountPassword) payload.password = editAccountPassword
    if (!payload.email && !payload.password) return toastError('ไม่มีข้อมูลที่เปลี่ยนแปลง')
    try {
      await updateAccountMutation.mutateAsync(payload)
      success('แก้ไขบัญชีสำเร็จ')
      setEditAccountOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccountMutation.mutateAsync()
      success('ลบบัญชีสำเร็จ')
      setDeleteAccountOpen(false)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleSendCredentials() {
    try {
      await sendCredentialsMutation.mutateAsync()
      success('ส่งอีเมลข้อมูลเข้าสู่ระบบสำเร็จ')
      setSendCredOpen(false)
    } catch {
      toastError('เกิดข้อผิดพลาดในการส่งอีเมล')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CustomerAvatarUpload
                avatarUrl={customer.avatarUrl}
                name={customer.name}
                type={customer.type}
                size="lg"
                uploading={avatarUploadMutation.isPending}
                onFileSelected={(file) => avatarUploadMutation.mutate(file)}
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
                {customer.companyName && (
                  <p className="text-sm text-gray-500">{customer.companyName}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TYPE_LABEL[customer.type] ?? customer.type}</Badge>
                  <StatusBadge status={customer.leadStatus} />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
                แก้ไข
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteOpen(true)}>
                ลบ
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lead Status Card */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Lead Status
              </p>
              <p className="mt-0.5 text-sm text-gray-600">
                อัปเดตสถานะการติดตามลูกค้าในแต่ละขั้นตอน
              </p>
            </div>
            <Select
              options={LEAD_STATUS_OPTIONS}
              value={customer.leadStatus}
              onChange={(e) => handleLeadStatus(e.target.value)}
              className="sm:w-52"
            />
          </div>
          {/* Pipeline steps */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {LEAD_STATUS_OPTIONS.map((opt, idx) => {
              const steps = LEAD_STATUS_OPTIONS.map((o) => o.value)
              const currentIdx = steps.indexOf(customer.leadStatus)
              const isActive = customer.leadStatus === opt.value
              const isDone = idx < currentIdx
              return (
                <div key={opt.value} className="flex min-w-0 flex-1 items-center">
                  <button
                    onClick={() => handleLeadStatus(opt.value)}
                    className={`flex-1 truncate rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : isDone
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                  {idx < LEAD_STATUS_OPTIONS.length - 1 && (
                    <div
                      className={`mx-0.5 h-px w-3 shrink-0 ${idx < currentIdx ? 'bg-primary-300' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Main content: 2/3 left + 1/3 right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact Info — spans 2 columns */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardBody>
              <h3 className="mb-4 font-medium text-gray-900">ข้อมูลติดต่อ</h3>
              <dl className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-24 shrink-0 text-sm text-gray-500">เบอร์โทร</dt>
                    <dd className="text-sm text-gray-900">{customer.phone}</dd>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-24 shrink-0 text-sm text-gray-500">อีเมล</dt>
                    <dd className="text-sm text-gray-900">{customer.email}</dd>
                  </div>
                )}
                {customer.lineId && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-24 shrink-0 text-sm text-gray-500">LINE ID</dt>
                    <dd className="text-sm text-gray-900">{customer.lineId}</dd>
                  </div>
                )}
                {(customer.address || customer.province) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-24 shrink-0 text-sm text-gray-500">ที่อยู่</dt>
                    <dd className="text-sm text-gray-900">
                      {[
                        customer.address,
                        customer.subdistrict,
                        customer.district,
                        customer.province,
                        customer.postcode,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </dd>
                  </div>
                )}
              </dl>
              {customer.note && (
                <>
                  <hr className="my-4" />
                  <div>
                    <p className="mb-1 text-xs text-gray-500">หมายเหตุ</p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{customer.note}</p>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Projects inline in left column */}
          {projectsData && (
            <Card>
              <CardBody>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">โครงการทั้งหมด</h3>
                  <Badge variant="outline">
                    {projectsData.meta?.totalItems ?? projectsData.data?.length ?? 0} โครงการ
                  </Badge>
                </div>
                {(projectsData.data?.length ?? 0) === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีโครงการ</p>
                ) : (
                  <div className="space-y-2">
                    {projectsData.data.map((p) => (
                      <Link
                        key={p.id}
                        href={`/admin/projects/${p.id}`}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-mono text-xs text-gray-400">{p.code}</p>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={p.status} />
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right sidebar — 1 column, less cluttered */}
        <div className="space-y-4">
          {/* Client Portal Account */}
          <Card>
            <CardBody>
              <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                <ShieldCheck className="h-4 w-4 text-primary-500" />
                Client Portal
              </h3>
              {customer.user ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">อีเมลที่ใช้ login</p>
                      <p className="truncate text-sm font-medium text-gray-900">
                        {customer.user.email}
                      </p>
                    </div>
                    <Badge variant={customer.user.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {customer.user.status === 'ACTIVE' ? 'ใช้งาน' : 'ระงับ'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={KeyRound}
                      className="flex-1"
                      onClick={openEditAccount}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Send}
                      onClick={() => setSendCredOpen(true)}
                    >
                      ส่งอีเมล
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setDeleteAccountOpen(true)}
                    >
                      <span className="text-red-500">ลบบัญชี</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-xs text-gray-400">ยังไม่มีบัญชี Client Portal</p>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    className="w-full"
                    onClick={() => setAccountOpen(true)}
                  >
                    สร้างบัญชี
                  </Button>
                </div>
              )}
              <hr className="my-3" />
              <Link
                href={`/admin/projects?customerId=${id}`}
                className="flex items-center justify-between rounded-lg p-2 text-sm text-primary-600 hover:bg-primary-50"
              >
                <span>ดูโครงการทั้งหมด</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />
      <FormModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title="สร้างบัญชี Client Portal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setAccountOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleCreateAccount}
              loading={createAccountMutation.isPending}
            >
              สร้างบัญชี
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            สร้างบัญชีสำหรับ <strong>{customer.name}</strong> เพื่อเข้าใช้ Client Portal
          </p>
          <Input
            label="อีเมล"
            type="email"
            value={accountEmail}
            onChange={(e) => setAccountEmail(e.target.value)}
            placeholder="customer@email.com"
            required
          />
          <Input
            label="รหัสผ่าน"
            type="password"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
          />
        </div>
      </FormModal>
      {/* Edit account modal */}
      <FormModal
        open={editAccountOpen}
        onClose={() => setEditAccountOpen(false)}
        title="แก้ไขบัญชี Client Portal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditAccountOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={KeyRound}
              onClick={handleUpdateAccount}
              loading={updateAccountMutation.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            แก้ไขข้อมูล login ของ <strong>{customer.name}</strong>
          </p>
          <Input
            label="อีเมล"
            type="email"
            value={editAccountEmail}
            onChange={(e) => setEditAccountEmail(e.target.value)}
            placeholder="customer@email.com"
          />
          <Input
            label="รหัสผ่านใหม่"
            type="password"
            value={editAccountPassword}
            onChange={(e) => setEditAccountPassword(e.target.value)}
            placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
          />
        </div>
      </FormModal>

      {/* Delete account confirm */}
      <ConfirmModal
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
        title="ลบบัญชี Client Portal"
        description={`ลบบัญชีของ ${customer.name} (${customer.user?.email}) ลูกค้าจะไม่สามารถเข้า Client Portal ได้อีก`}
        confirmLabel="ลบบัญชี"
        danger
        loading={deleteAccountMutation.isPending}
      />

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`ลบลูกค้า "${customer.name}"`}
        description="ข้อมูลลูกค้าและความเชื่อมโยงทั้งหมดจะถูกซ่อน"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />

      {/* Send credentials modal */}
      <ConfirmModal
        open={sendCredOpen}
        onClose={() => setSendCredOpen(false)}
        onConfirm={handleSendCredentials}
        title="ส่งข้อมูลเข้าสู่ระบบทางอีเมล"
        description={`ระบบจะส่งอีเมลพร้อมลิงก์ Client Portal และ อีเมล login ไปยัง ${customer.user?.email}`}
        confirmLabel="ส่งอีเมล"
        loading={sendCredentialsMutation.isPending}
      />
    </div>
  )
}
