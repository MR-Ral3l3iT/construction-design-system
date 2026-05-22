'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Pencil, Trash2, Eye, Building2, User } from 'lucide-react'
import { Button, Table, Pagination, Select, EmptyState } from '@construction/ui'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { CustomerFormModal } from './CustomerFormModal'
import { useCustomers, useDeleteCustomer, type Customer } from '@/hooks/useCustomers'
import { useToast } from '@/providers/toast-provider'

const TYPE_OPTIONS = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'INDIVIDUAL', label: 'บุคคลธรรมดา' },
  { value: 'COMPANY', label: 'นิติบุคคล' },
]

const LEAD_STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'INTERESTED', label: 'สนใจ' },
  { value: 'SITE_VISIT', label: 'นัดสำรวจ' },
  { value: 'QUOTED', label: 'เสนอราคาแล้ว' },
  { value: 'CLOSED_WON', label: 'ปิดการขายสำเร็จ' },
  { value: 'CLOSED_LOST', label: 'ไม่สนใจ' },
]

const TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: 'บุคคลธรรมดา',
  COMPANY: 'นิติบุคคล',
}

export function CustomersContent() {
  const { success, error } = useToast()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [leadStatus, setLeadStatus] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const { data, isLoading } = useCustomers({
    search,
    type: type || undefined,
    leadStatus: leadStatus || undefined,
    page,
    pageSize: 20,
  })
  const deleteMutation = useDeleteCustomer()

  const customers = data?.data ?? []
  const meta = data?.meta

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(c: Customer) {
    setEditTarget(c)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบลูกค้าสำเร็จ')
    } catch {
      error('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'ชื่อลูกค้า',
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt={c.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center ${c.type === 'COMPANY' ? 'bg-primary-100' : 'bg-primary-100'}`}
              >
                {c.type === 'COMPANY' ? (
                  <Building2 className="h-4 w-4 text-primary-500" />
                ) : (
                  <User className="h-4 w-4 text-primary-500" />
                )}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{c.name}</p>
            {c.companyName && <p className="text-xs text-gray-500">{c.companyName}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'ประเภท',
      render: (c: Customer) => (
        <span className="text-sm text-gray-600">{TYPE_LABEL[c.type] ?? c.type}</span>
      ),
    },
    {
      key: 'contact',
      header: 'ติดต่อ',
      render: (c: Customer) => (
        <div className="text-sm text-gray-600">
          {c.phone && <p>{c.phone}</p>}
          {c.email && <p className="text-gray-400">{c.email}</p>}
        </div>
      ),
    },
    {
      key: 'leadStatus',
      header: 'Lead Status',
      render: (c: Customer) => <StatusBadge status={c.leadStatus} />,
    },
    {
      key: 'projects',
      header: 'โครงการ',
      render: (c: Customer) => (
        <span className="text-sm text-gray-600">{c._count?.projects ?? 0} โครงการ</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c: Customer) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/customers/${c.id}`}>
            <Button variant="ghost" size="sm" icon={Eye}>
              ดูรายละเอียด
            </Button>
          </Link>
          <Button variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(c)}>
            แก้ไข
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteTarget(c)}>
            ลบ
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="ค้นหาชื่อ, บริษัท, เบอร์โทร..."
          />
        </div>
        <div className="w-44">
          <Select
            options={TYPE_OPTIONS}
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-48">
          <Select
            options={LEAD_STATUS_OPTIONS}
            value={leadStatus}
            onChange={(e) => {
              setLeadStatus(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreate} size="sm">
          สร้างลูกค้าใหม่
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="ไม่พบข้อมูลลูกค้า"
          description="เริ่มต้นโดยเพิ่มลูกค้าใหม่เข้าสู่ระบบ"
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              สร้างลูกค้าใหม่
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={customers} keyExtractor={(c) => String(c.id)} />
          {meta && (
            <div className="flex justify-end">
              <Pagination
                page={page}
                totalPages={meta.totalPages}
                totalItems={meta.totalItems}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} customer={editTarget} />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`ลบลูกค้า "${deleteTarget?.name}"`}
        description="ข้อมูลลูกค้าและความเชื่อมโยงทั้งหมดจะถูกซ่อน การดำเนินการนี้ไม่สามารถยกเลิกได้"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
