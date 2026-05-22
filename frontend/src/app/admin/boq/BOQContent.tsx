'use client'

import React from 'react'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  type LucideIcon,
  ClipboardList,
  Plus,
  Lock,
  X,
  Send,
  CheckCircle,
  RotateCcw,
  Eye,
  FileText,
} from 'lucide-react'
import { Button, Table, Badge, Pagination, EmptyState, Select } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import { useBOQsByProject, useCreateBOQ, type BOQ } from '@/hooks/useBOQ'
import { useDesignTasksByProject } from '@/hooks/useDesignTasks'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'
import { Input } from '@construction/ui'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  projectId: number
}

export function BOQContent({ projectId }: Props) {
  const { success, error } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedDesignTaskId, setSelectedDesignTaskId] = useState<number | undefined>()

  const { data, isLoading } = useBOQsByProject(projectId, page)
  const { data: designTasksData } = useDesignTasksByProject(projectId)
  const designTasks = (designTasksData?.data ?? []).filter((dt) => dt.status === 'APPROVED')
  const createMutation = useCreateBOQ()

  const statusMutation = useMutation({
    mutationFn: async ({ boqId, status }: { boqId: number; status: string }) => {
      const { data } = await api.patch(`/boq/${boqId}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['boq', 'project', projectId] })
      if (vars.status === 'DRAFT') success('กลับสู่โหมดแก้ไขแล้ว')
      if (vars.status === 'APPROVED') success('อนุมัติ BOQ สำเร็จ')
      if (vars.status === 'LOCKED') success('ล็อก BOQ สำเร็จ')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      error(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    },
  })

  const boqs = data?.data ?? []
  const meta = data?.meta

  async function handleCreate() {
    if (!title.trim()) return error('กรุณากรอกชื่อ BOQ')
    try {
      await createMutation.mutateAsync({
        projectId,
        title: title.trim(),
        ...(selectedDesignTaskId ? { designTaskId: selectedDesignTaskId } : {}),
      })
      success('สร้าง BOQ สำเร็จ')
      setTitle('')
      setSelectedDesignTaskId(undefined)
      setCreateOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      error(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const STATUS_ACTIONS: Record<
    string,
    { label: string; next: string; icon: LucideIcon; variant?: 'primary' | 'outline' | 'danger' }[]
  > = {
    DRAFT: [{ label: 'ส่งตรวจสอบ', next: 'REVIEW', icon: Send }],
    REVIEW: [
      { label: 'อนุมัติ', next: 'APPROVED', icon: CheckCircle },
      { label: 'กลับเป็นร่าง', next: 'DRAFT', icon: RotateCcw },
    ],
    APPROVED: [
      { label: 'ล็อก BOQ', next: 'LOCKED', icon: Lock },
      { label: 'กลับแก้ไข', next: 'DRAFT', icon: RotateCcw, variant: 'outline' },
    ],
  }

  const columns = [
    {
      key: 'code',
      header: 'รหัส / ชื่อ',
      render: (b: BOQ) => (
        <div>
          <p className="text-xs font-mono text-gray-400">
            {b.code} · v{b.version}
          </p>
          <p className="font-medium text-gray-900">{b.title}</p>
          {b.designTask && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
              <FileText className="h-3 w-3" />
              {b.designTask.title} (Rev.{b.designTask.revisionNo})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (b: BOQ) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={b.status} />
          {b.isLocked && (
            <Badge variant="info">
              <Lock className="mr-1 h-3 w-3 inline" />
              ล็อก
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'มูลค่า',
      render: (b: BOQ) => (
        <div>
          <p className="font-semibold text-gray-900">{formatCurrency(b.totalAmount)}</p>
          <div className="mt-0.5 flex gap-3 text-xs text-gray-500">
            <span>วัสดุ {formatCurrency(b.materialCost)}</span>
            <span>แรง {formatCurrency(b.laborCost)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (b: BOQ) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!b.isLocked &&
            STATUS_ACTIONS[b.status]?.map((action) => (
              <Button
                key={action.next}
                variant={
                  action.variant ??
                  (action.next === 'APPROVED' || action.next === 'LOCKED' ? 'primary' : 'outline')
                }
                size="sm"
                icon={action.icon}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ boqId: b.id, status: action.next })}
              >
                {action.label}
              </Button>
            ))}
          <Link href={`/admin/boq/${b.id}?projectId=${projectId}`}>
            <Button variant="ghost" size="sm" icon={Eye}>
              รายละเอียด
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">BOQ ทั้งหมด {meta?.totalItems ?? 0} รายการ</p>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
          สร้าง BOQ
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : boqs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="ยังไม่มี BOQ"
          description="สร้าง BOQ แรกสำหรับโครงการนี้"
          action={
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
              สร้าง BOQ
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={boqs} keyExtractor={(b) => String(b.id)} />
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

      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setTitle('')
          setSelectedDesignTaskId(undefined)
        }}
        title="สร้าง BOQ ใหม่"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setCreateOpen(false)
                setTitle('')
                setSelectedDesignTaskId(undefined)
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleCreate}
              loading={createMutation.isPending}
            >
              สร้าง
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="ชื่อ BOQ"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น BOQ งานโครงสร้าง ชั้น 1"
            required
          />
          {designTasks.length > 0 && (
            <Select
              label="Drawing อ้างอิง (ไม่บังคับ)"
              value={selectedDesignTaskId?.toString() ?? ''}
              onChange={(e) =>
                setSelectedDesignTaskId(e.target.value ? Number(e.target.value) : undefined)
              }
              options={[
                { value: '', label: '— ไม่ระบุ Drawing —' },
                ...designTasks.map((dt) => ({
                  value: String(dt.id),
                  label: `${dt.title} (Rev.${dt.revisionNo})`,
                })),
              ]}
            />
          )}
        </div>
      </FormModal>
    </div>
  )
}
