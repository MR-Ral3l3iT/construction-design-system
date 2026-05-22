'use client'

import React from 'react'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  type LucideIcon,
  Pencil,
  Plus,
  CheckCircle,
  Play,
  Send,
  RotateCcw,
  Eye,
  Trash2,
  Clock,
  Loader2,
  Search,
  RefreshCw,
  Ban,
  CalendarRange,
  Settings,
} from 'lucide-react'
import { Button, Table, Pagination, EmptyState } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { DesignTaskFormModal } from './DesignTaskFormModal'
import {
  useDesignTasksByProject,
  useDeleteDesignTask,
  useDesignTaskSummary,
  type DesignTask,
} from '@/hooks/useDesignTasks'
import { useProject } from '@/hooks/useProjects'
import { DesignTimelineModal } from './DesignTimelineModal'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'

const STATUS_CONFIG = [
  {
    key: 'TODO',
    label: 'รอดำเนินการ',
    icon: Clock,
    bg: 'bg-gray-50',
    iconColor: 'text-gray-400',
    numColor: 'text-gray-700',
    border: 'border-gray-200',
  },
  {
    key: 'IN_PROGRESS',
    label: 'กำลังดำเนินการ',
    icon: Loader2,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-400',
    numColor: 'text-blue-700',
    border: 'border-blue-200',
  },
  {
    key: 'WAITING_REVIEW',
    label: 'รอตรวจสอบ',
    icon: Search,
    bg: 'bg-amber-50',
    iconColor: 'text-amber-400',
    numColor: 'text-amber-700',
    border: 'border-amber-200',
  },
  {
    key: 'REVISION',
    label: 'แก้ไข',
    icon: RefreshCw,
    bg: 'bg-orange-50',
    iconColor: 'text-orange-400',
    numColor: 'text-orange-700',
    border: 'border-orange-200',
  },
  {
    key: 'APPROVED',
    label: 'อนุมัติแล้ว',
    icon: CheckCircle,
    bg: 'bg-green-50',
    iconColor: 'text-green-500',
    numColor: 'text-green-700',
    border: 'border-green-200',
  },
  {
    key: 'CANCELLED',
    label: 'ยกเลิก',
    icon: Ban,
    bg: 'bg-red-50',
    iconColor: 'text-red-400',
    numColor: 'text-red-700',
    border: 'border-red-200',
  },
]

const STATUS_ACTIONS: Record<
  string,
  {
    label: string
    next: string
    variant: 'primary' | 'outline' | 'danger' | 'ghost'
    icon: LucideIcon
  }[]
> = {
  TODO: [{ label: 'เริ่มงาน', next: 'IN_PROGRESS', variant: 'primary', icon: Play }],
  IN_PROGRESS: [{ label: 'ส่งตรวจสอบ', next: 'WAITING_REVIEW', variant: 'primary', icon: Send }],
  WAITING_REVIEW: [
    { label: 'อนุมัติ', next: 'APPROVED', variant: 'primary', icon: CheckCircle },
    { label: 'ขอแก้ไข', next: 'REVISION', variant: 'outline', icon: RotateCcw },
  ],
  REVISION: [{ label: 'กลับทำงาน', next: 'IN_PROGRESS', variant: 'outline', icon: Play }],
}

interface Props {
  projectId: number
}

export function DesignTasksContent({ projectId }: Props) {
  const { success, error } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DesignTask | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DesignTask | null>(null)
  const [projectEditOpen, setProjectEditOpen] = useState(false)

  const { data, isLoading } = useDesignTasksByProject(projectId, page)
  const { data: summaryAll } = useDesignTaskSummary()
  const { data: project } = useProject(projectId)
  const deleteMutation = useDeleteDesignTask(projectId)

  const designStart = project?.designStartDate ? project.designStartDate.slice(0, 10) : null
  const designEnd = project?.designEndDate ? project.designEndDate.slice(0, 10) : null

  const projectSummary = summaryAll?.[projectId] ?? {}
  const totalTasks = Object.values(projectSummary).reduce((a, b) => a + b, 0)
  const approvedCount = projectSummary['APPROVED'] ?? 0
  const approvedPct = totalTasks > 0 ? Math.round((approvedCount / totalTasks) * 100) : 0

  const statusMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
      note,
    }: {
      taskId: number
      status: string
      note?: string
    }) => {
      const { data } = await api.patch(`/design-tasks/${taskId}/status`, { status, note })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['design-tasks', 'project', projectId] })
      qc.invalidateQueries({ queryKey: ['design-tasks', 'task-summary'] })
    },
  })

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบงานออกแบบสำเร็จ')
    } catch {
      error('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeleteTarget(null)
    }
  }

  const tasks = data?.data ?? []
  const meta = data?.meta

  const columns = [
    {
      key: 'title',
      header: 'ชื่องาน',
      render: (t: DesignTask) => (
        <div>
          <p className="font-medium text-gray-900">{t.title}</p>
          {t.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{t.description}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>Rev. {t.revisionNo}</span>
            {t.dueDate && <span>กำหนด: {new Date(t.dueDate).toLocaleDateString('th-TH')}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (t: DesignTask) => <StatusBadge status={t.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (t: DesignTask) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {STATUS_ACTIONS[t.status]?.map((action) => (
            <Button
              key={action.next}
              variant={action.variant}
              size="sm"
              icon={action.icon}
              onClick={() => {
                statusMutation.mutate({ taskId: t.id, status: action.next })
                if (action.next === 'APPROVED') success('อนุมัติงานออกแบบสำเร็จ')
              }}
              loading={statusMutation.isPending}
            >
              {action.label}
            </Button>
          ))}
          <Link href={`/admin/design-tasks/${t.id}?projectId=${projectId}`}>
            <Button variant="ghost" size="sm" icon={Eye}>
              รายละเอียด
            </Button>
          </Link>
          {(t.status === 'TODO' || t.status === 'IN_PROGRESS') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTarget(t)
                setFormOpen(true)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteTarget(t)}>
            ลบ
          </Button>
        </div>
      ),
    },
  ]

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Design Timeline Banner */}
      <div
        className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${designStart && designEnd ? 'border-primary-200 bg-primary-50' : 'border-dashed border-gray-300 bg-gray-50'}`}
      >
        <div className="flex items-center gap-3">
          <CalendarRange
            className={`h-5 w-5 shrink-0 ${designStart && designEnd ? 'text-primary-500' : 'text-gray-400'}`}
          />
          <div>
            <p
              className={`text-sm font-medium ${designStart && designEnd ? 'text-primary-800' : 'text-gray-500'}`}
            >
              {designStart && designEnd
                ? `ระยะเวลาออกแบบ: ${fmtDate(designStart)} – ${fmtDate(designEnd)}`
                : 'ยังไม่ได้กำหนดระยะเวลาออกแบบ'}
            </p>
            {designStart && designEnd && (
              <p className="text-xs text-primary-600">งานออกแบบย่อยทั้งหมดต้องอยู่ภายในช่วงนี้</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={Settings} onClick={() => setProjectEditOpen(true)}>
          {designStart && designEnd ? 'แก้ไข' : 'กำหนดระยะเวลา'}
        </Button>
      </div>

      {/* Status Summary */}
      {totalTasks > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">ภาพรวมสถานะงานออกแบบ</p>
            <span className="text-xs text-gray-400">
              ทั้งหมด {totalTasks} งาน · อนุมัติแล้ว {approvedPct}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
            {STATUS_CONFIG.filter((s) => s.key !== 'CANCELLED').map((s) => {
              const count = projectSummary[s.key] ?? 0
              const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0
              const barColor: Record<string, string> = {
                TODO: 'bg-gray-300',
                IN_PROGRESS: 'bg-blue-400',
                WAITING_REVIEW: 'bg-amber-400',
                REVISION: 'bg-orange-400',
                APPROVED: 'bg-green-500',
              }
              return pct > 0 ? (
                <div
                  key={s.key}
                  className={`h-full ${barColor[s.key]}`}
                  style={{ width: `${pct}%` }}
                  title={`${s.label}: ${count}`}
                />
              ) : null
            })}
          </div>
          {/* Status cards */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STATUS_CONFIG.map((s) => {
              const count = projectSummary[s.key] ?? 0
              const Icon = s.icon
              return (
                <div
                  key={s.key}
                  className={`flex flex-col items-center gap-1 rounded-lg border ${s.border} ${s.bg} px-2 py-2.5`}
                >
                  <Icon className={`h-4 w-4 ${s.iconColor}`} />
                  <span className={`text-lg font-bold leading-none ${s.numColor}`}>{count}</span>
                  <span className="text-center text-[10px] leading-tight text-gray-500">
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">งานออกแบบทั้งหมด {meta?.totalItems ?? 0} งาน</p>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          สร้างงานออกแบบ
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Pencil}
          title="ยังไม่มีงานออกแบบ"
          description="สร้างงานออกแบบแรกสำหรับโครงการนี้"
          action={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditTarget(null)
                setFormOpen(true)
              }}
            >
              สร้างงานออกแบบ
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={tasks} keyExtractor={(t) => String(t.id)} />
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

      <DesignTaskFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(null)
        }}
        projectId={projectId}
        task={editTarget}
        designStart={designStart ?? undefined}
        designEnd={designEnd ?? undefined}
      />
      <DesignTimelineModal
        open={projectEditOpen}
        onClose={() => setProjectEditOpen(false)}
        projectId={projectId}
        designStartDate={project?.designStartDate}
        designEndDate={project?.designEndDate}
      />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`ลบงานออกแบบ "${deleteTarget?.title}"`}
        description="งานออกแบบและข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบ ไม่สามารถกู้คืนได้"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
