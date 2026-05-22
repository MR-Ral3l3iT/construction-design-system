'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Plus, ChevronRight, Trash2, Eye } from 'lucide-react'
import { Button, Table, Pagination, Select, EmptyState } from '@construction/ui'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { ProjectFormModal } from './ProjectFormModal'
import { useProjects, useDeleteProject, type ProjectListItem } from '@/hooks/useProjects'
import { useToast } from '@/providers/toast-provider'

const TYPE_OPTIONS = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'DESIGN_ONLY', label: 'ออกแบบ (DS)' },
  { value: 'CONSTRUCTION', label: 'ก่อสร้าง (CN)' },
  { value: 'TURNKEY', label: 'ออกแบบ + ก่อสร้าง (DC)' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'LEAD', label: 'รับงานใหม่' },
  { value: 'ESTIMATING', label: 'ประเมินราคา' },
  { value: 'DESIGNING', label: 'ออกแบบ' },
  { value: 'WAITING_APPROVAL', label: 'รออนุมัติ' },
  { value: 'BOQ', label: 'BOQ' },
  { value: 'CONTRACT', label: 'ทำสัญญา' },
  { value: 'CONSTRUCTION', label: 'ก่อสร้าง' },
  { value: 'HANDOVER', label: 'ส่งมอบ' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ (DS)',
  CONSTRUCTION: 'ก่อสร้าง (CN)',
  TURNKEY: 'DC',
}

export function ProjectsContent() {
  const { success, error } = useToast()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProjectListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null)

  const { data, isLoading } = useProjects({
    search,
    type: type || undefined,
    status: status || undefined,
    page,
    pageSize: 20,
  })
  const deleteMutation = useDeleteProject()

  const projects = data?.data ?? []
  const meta = data?.meta

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบโครงการสำเร็จ')
    } catch {
      error('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns = [
    {
      key: 'code',
      header: 'รหัส / ชื่อโครงการ',
      render: (p: ProjectListItem) => (
        <div>
          <p className="text-xs font-mono text-gray-400">{p.code}</p>
          <p className="font-medium text-gray-900">{p.name}</p>
          {p.customer && (
            <p className="text-xs text-gray-500">
              {p.customer.name}
              {p.customer.companyName ? ` · ${p.customer.companyName}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'ประเภท',
      render: (p: ProjectListItem) => (
        <span className="text-sm text-gray-600">{TYPE_LABEL[p.type] ?? p.type}</span>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (p: ProjectListItem) => <StatusBadge status={p.status} />,
    },
    {
      key: 'progress',
      header: 'ความคืบหน้า',
      render: (p: ProjectListItem) => (
        <div className="w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">{p.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-primary-500"
              style={{ width: `${p.progress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'ช่วงเวลา',
      render: (p: ProjectListItem) => (
        <div className="text-xs text-gray-500">
          {p.startDate && <p>เริ่ม: {new Date(p.startDate).toLocaleDateString('th-TH')}</p>}
          {p.endDate && <p>สิ้นสุด: {new Date(p.endDate).toLocaleDateString('th-TH')}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p: ProjectListItem) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/projects/${p.id}`}>
            <Button variant="ghost" size="sm" icon={Eye}>
              รายละเอียด
            </Button>
          </Link>
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteTarget(p)}>
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
            placeholder="ค้นหาชื่อโครงการ, รหัส..."
          />
        </div>
        <div className="w-48">
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
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreate} size="sm">
          สร้างโครงการ
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="ไม่พบโครงการ"
          description="เริ่มต้นโดยสร้างโครงการใหม่"
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              สร้างโครงการ
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={projects} keyExtractor={(p) => String(p.id)} />
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
      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={
          editTarget ? (editTarget as unknown as import('@/hooks/useProjects').Project) : null
        }
      />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`ลบโครงการ "${deleteTarget?.name}"`}
        description="ข้อมูลโครงการและข้อมูลที่เกี่ยวข้องจะถูกซ่อน"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
