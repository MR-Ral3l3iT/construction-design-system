'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  PauseCircle,
  X,
  Save,
  Pencil,
  Trash2,
  Paperclip,
  FileText,
  Image,
  Download,
  ExternalLink,
  Clock,
  AlertCircle,
  CircleDot,
} from 'lucide-react'
import { matchTaskLinks } from '@/lib/taskLinks'
import { Button, EmptyState, Card, CardBody } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import { Input, Textarea } from '@construction/ui'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  usePlanTemplates,
  useProjectPlanByProject,
  useCreateProjectPlan,
  useUpdatePlanTask,
  useAddPlanTask,
  useDeletePlanTask,
  type ProjectPlan,
  type PlanPhase,
  type PlanTask,
  type PlanTemplateType,
  type TaskStatus,
} from '@/hooks/useProjectPlans'
import {
  useTaskFiles,
  useUploadTaskFiles,
  useDeleteTaskFile,
  type TaskFile,
} from '@/hooks/useTaskFiles'

// ─── constants ────────────────────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<PlanTemplateType, string> = {
  DESIGN_ONLY: 'ออกแบบเท่านั้น',
  DESIGN_BOQ: 'ออกแบบ + BOQ',
  CONSTRUCTION_ONLY: 'ก่อสร้างเท่านั้น',
  TURNKEY: 'ออกแบบ + ก่อสร้าง (Turnkey)',
}

const TEMPLATE_DESCRIPTIONS: Record<PlanTemplateType, string> = {
  DESIGN_ONLY: 'Pre Design → Concept Design → Design Development → Construction Drawing',
  DESIGN_BOQ: 'Pre Design → Concept Design → Design Development → Construction Drawing → BOQ',
  CONSTRUCTION_ONLY: 'Pre Construction → Site Prep → Structure → System → Finishing → Handover',
  TURNKEY: 'ครบทุกขั้นตอน ตั้งแต่ Requirement จนถึง Handover',
}

const STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; bar: string; border: string; icon: typeof Clock }
> = {
  TODO: {
    label: 'รอดำเนินการ',
    color: 'text-gray-500',
    bar: 'bg-gray-300',
    border: 'border-l-gray-300',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'กำลังทำ',
    color: 'text-blue-600',
    bar: 'bg-blue-400',
    border: 'border-l-blue-400',
    icon: CircleDot,
  },
  BLOCKED: {
    label: 'ติดขัด',
    color: 'text-red-500',
    bar: 'bg-red-400',
    border: 'border-l-red-400',
    icon: AlertCircle,
  },
  COMPLETED: {
    label: 'เสร็จสิ้น',
    color: 'text-green-600',
    bar: 'bg-green-500',
    border: 'border-l-green-500',
    icon: CheckCircle2,
  },
}

const STATUS_NEXT: Record<
  string,
  { label: string; next: TaskStatus; icon: typeof Play } | undefined
> = {
  TODO: { label: 'เริ่มงาน', next: 'IN_PROGRESS', icon: Play },
  IN_PROGRESS: { label: 'เสร็จสิ้น', next: 'COMPLETED', icon: CheckCircle2 },
  BLOCKED: { label: 'ดำเนินต่อ', next: 'IN_PROGRESS', icon: Play },
}

// ─── schemas ──────────────────────────────────────────────────────────────────

const addSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่องาน'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
type AddFormData = z.infer<typeof addSchema>

const editSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่องาน'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
})
type EditFormData = z.infer<typeof editSchema>

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── TaskAttachments ──────────────────────────────────────────────────────────

function TaskAttachments({ task, projectId }: { task: PlanTask; projectId: number }) {
  const { success, error: toastError } = useToast()
  const { data: files = [], isLoading } = useTaskFiles(task.id)
  const uploadMutation = useUploadTaskFiles(task.id, projectId)
  const deleteMutation = useDeleteTaskFile(task.id)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      try {
        await uploadMutation.mutateAsync(Array.from(fileList))
        success(`อัปโหลด ${fileList.length} ไฟล์สำเร็จ`)
      } catch {
        toastError('อัปโหลดไม่สำเร็จ')
      }
    },
    [uploadMutation, success, toastError],
  )

  async function handleDelete(f: TaskFile) {
    try {
      await deleteMutation.mutateAsync(f.id)
      success('ลบไฟล์สำเร็จ')
    } catch {
      toastError('ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-medium text-gray-500">
        ไฟล์แนบ {files.length > 0 && `(${files.length})`}
      </p>

      {isLoading ? (
        <p className="text-xs text-gray-400">กำลังโหลด...</p>
      ) : files.length > 0 ? (
        <div className="mb-3 space-y-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              {f.mimeType?.startsWith('image/') ? (
                <Image size={14} className="text-blue-500" />
              ) : (
                <FileText size={14} className="text-gray-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                {f.originalName}
              </span>
              {f.size && (
                <span className="shrink-0 text-xs text-gray-400">{formatBytes(f.size)}</span>
              )}
              {f.mimeType?.startsWith('image/') && f.url && (
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img
                    src={f.url}
                    alt={f.originalName}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                </a>
              )}
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-gray-400 hover:text-primary-600"
                >
                  <Download size={13} />
                </a>
              )}
              <button
                onClick={() => handleDelete(f)}
                className="shrink-0 text-gray-300 hover:text-red-500"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-xs transition-colors ${
          dragOver
            ? 'border-primary-400 bg-primary-50 text-primary-600'
            : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
        }`}
      >
        {uploadMutation.isPending ? (
          <span>กำลังอัปโหลด...</span>
        ) : (
          <>
            <Paperclip size={13} />
            <span>วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ─── InlineProgress ──────────────────────────────────────────────────────────

function InlineProgress({ task, planId }: { task: PlanTask; planId: number }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(task.progress)
  const { success } = useToast()
  const mutation = useUpdatePlanTask(planId)

  async function save() {
    await mutation.mutateAsync({ taskId: task.id, payload: { progress: val } })
    success('อัปเดต progress สำเร็จ')
    setEditing(false)
  }

  const meta = STATUS_META[task.status as TaskStatus] ?? STATUS_META.TODO
  const barColor =
    task.status === 'COMPLETED'
      ? 'bg-green-500'
      : task.status === 'BLOCKED'
        ? 'bg-red-400'
        : 'bg-blue-400'

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={100}
          value={val}
          onChange={(e) => setVal(Math.min(100, Math.max(0, Number(e.target.value))))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
          autoFocus
          className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <span className="text-xs text-gray-400">%</span>
        <button onClick={save} className="text-green-600 hover:text-green-700">
          <CheckCircle2 size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setVal(task.progress)
        setEditing(true)
      }}
      className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-100"
    >
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${task.progress}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${meta.color} group-hover:underline`}>
        {task.progress}%
      </span>
    </button>
  )
}

// ─── AttachmentBadge ──────────────────────────────────────────────────────────

function AttachmentBadge({ planTaskId, onEdit }: { planTaskId: number; onEdit: () => void }) {
  const { data: files = [] } = useTaskFiles(planTaskId)
  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
    >
      <Paperclip size={12} />
      {files.length > 0 && <span className="font-medium text-gray-600">{files.length}</span>}
    </button>
  )
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  planId,
  projectId,
  seq,
  onEdit,
  onDelete,
}: {
  task: PlanTask
  planId: number
  projectId: number
  seq: number
  onEdit: (t: PlanTask) => void
  onDelete: (t: PlanTask) => void
}) {
  const taskLinks = matchTaskLinks(task.title)
  const { success, error: toastError } = useToast()
  const updateMutation = useUpdatePlanTask(planId)
  const action = STATUS_NEXT[task.status]
  const meta = STATUS_META[task.status as TaskStatus] ?? STATUS_META.TODO
  const StatusIcon = meta.icon

  async function handleStatus() {
    if (!action) return
    try {
      await updateMutation.mutateAsync({ taskId: task.id, payload: { status: action.next } })
      success('อัปเดตสถานะสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  return (
    <tr
      className={`border-b last:border-0 border-l-4 ${meta.border} hover:bg-gray-50/60 transition-colors`}
    >
      {/* seq + title */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
            {seq}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900">{task.title}</span>
              {taskLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href(projectId)}
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${link.badgeCls}`}
                >
                  <ExternalLink size={10} />
                  {link.label}
                </Link>
              ))}
            </div>
            {task.description && (
              <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{task.description}</p>
            )}
          </div>
        </div>
      </td>

      {/* status */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <StatusIcon size={13} className={meta.color} />
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
        </div>
      </td>

      {/* progress */}
      <td className="px-3 py-3">
        <InlineProgress task={task} planId={planId} />
      </td>

      {/* dates */}
      <td className="px-3 py-3 text-xs text-gray-500">
        <div>{fmtDate(task.startDate)}</div>
        <div className="text-gray-400">{fmtDate(task.endDate)}</div>
      </td>

      {/* actions */}
      <td className="px-2 py-3">
        <div className="flex items-center justify-end gap-0.5">
          {action && (
            <Button
              variant="outline"
              size="sm"
              icon={action.icon}
              loading={updateMutation.isPending}
              onClick={handleStatus}
            >
              {action.label}
            </Button>
          )}
          {task.status === 'IN_PROGRESS' && (
            <Button
              variant="ghost"
              size="sm"
              icon={PauseCircle}
              loading={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutateAsync({ taskId: task.id, payload: { status: 'BLOCKED' } })
              }
            />
          )}
          <AttachmentBadge planTaskId={task.id} onEdit={() => onEdit(task)} />
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => onEdit(task)} />
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(task)} />
        </div>
      </td>
    </tr>
  )
}

// ─── PhaseSection ─────────────────────────────────────────────────────────────

function PhaseSection({
  phase,
  plan,
  defaultOpen,
  phaseNum,
}: {
  phase: PlanPhase
  plan: ProjectPlan
  defaultOpen?: boolean
  phaseNum: number
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<PlanTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<PlanTask | null>(null)
  const { success, error: toastError } = useToast()

  const addMutation = useAddPlanTask(plan.id)
  const updateMutation = useUpdatePlanTask(plan.id)
  const deleteMutation = useDeletePlanTask(plan.id)

  const {
    register: regAdd,
    handleSubmit: hsAdd,
    reset: resetAdd,
    formState: { errors: errAdd },
  } = useForm<AddFormData>({ resolver: zodResolver(addSchema) })
  const {
    register: regEdit,
    handleSubmit: hsEdit,
    reset: resetEdit,
    formState: { errors: errEdit },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  // Phase stats
  const total = phase.tasks.length
  const counts = {
    COMPLETED: phase.tasks.filter((t) => t.status === 'COMPLETED').length,
    IN_PROGRESS: phase.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    BLOCKED: phase.tasks.filter((t) => t.status === 'BLOCKED').length,
    TODO: phase.tasks.filter((t) => t.status === 'TODO').length,
  }
  const avgProgress =
    total > 0 ? Math.round(phase.tasks.reduce((s, t) => s + t.progress, 0) / total) : 0

  async function onAdd(values: AddFormData) {
    try {
      await addMutation.mutateAsync({
        phaseId: phase.id,
        payload: {
          title: values.title,
          description: values.description || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        },
      })
      success('เพิ่มงานสำเร็จ')
      setAddOpen(false)
      resetAdd()
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  function openEdit(t: PlanTask) {
    setEditTask(t)
    resetEdit({
      title: t.title,
      description: t.description ?? '',
      startDate: t.startDate?.slice(0, 10) ?? '',
      endDate: t.endDate?.slice(0, 10) ?? '',
      progress: t.progress,
    })
  }

  async function onEdit(values: EditFormData) {
    if (!editTask) return
    try {
      await updateMutation.mutateAsync({
        taskId: editTask.id,
        payload: {
          title: values.title,
          description: values.description || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          progress: values.progress,
        },
      })
      success('แก้ไขงานสำเร็จ')
      setEditTask(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function onDelete() {
    if (!deleteTask) return
    try {
      await deleteMutation.mutateAsync(deleteTask.id)
      success('ลบงานสำเร็จ')
      setDeleteTask(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Phase header */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
      >
        {/* number */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
          {phaseNum}
        </span>

        {/* name */}
        <span className="flex-1 font-semibold text-gray-900">{phase.name}</span>

        {/* status chips */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {counts.COMPLETED > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              ✓ {counts.COMPLETED}
            </span>
          )}
          {counts.IN_PROGRESS > 0 && (
            <span className="rounded-full bg-blue-100  px-2 py-0.5 text-xs font-medium text-blue-700">
              ⟳ {counts.IN_PROGRESS}
            </span>
          )}
          {counts.BLOCKED > 0 && (
            <span className="rounded-full bg-red-100   px-2 py-0.5 text-xs font-medium text-red-700">
              ! {counts.BLOCKED}
            </span>
          )}
          {counts.TODO > 0 && (
            <span className="rounded-full bg-gray-100  px-2 py-0.5 text-xs font-medium text-gray-600">
              ○ {counts.TODO}
            </span>
          )}
        </div>

        {/* progress */}
        <div className="flex items-center gap-2">
          <div className="relative h-2 w-28 overflow-hidden rounded-full bg-gray-100">
            {/* segmented bar */}
            {total > 0 &&
              (() => {
                const pctC = (counts.COMPLETED / total) * 100
                const pctI = (counts.IN_PROGRESS / total) * 100
                const pctB = (counts.BLOCKED / total) * 100
                return (
                  <>
                    <div
                      className="absolute left-0 top-0 h-full bg-green-500"
                      style={{ width: `${pctC}%` }}
                    />
                    <div
                      className="absolute top-0 h-full bg-blue-400"
                      style={{ left: `${pctC}%`, width: `${pctI}%` }}
                    />
                    <div
                      className="absolute top-0 h-full bg-red-400"
                      style={{ left: `${pctC + pctI}%`, width: `${pctB}%` }}
                    />
                  </>
                )
              })()}
          </div>
          <span className="w-8 text-right text-xs font-medium text-gray-600">{avgProgress}%</span>
        </div>

        <span className="text-gray-400">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {/* Task table */}
      {open && (
        <>
          <div className="border-t border-gray-100">
            {total === 0 ? (
              <p className="px-8 py-5 text-sm text-gray-400">ยังไม่มีงานในขั้นตอนนี้</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50/80 text-xs font-medium text-gray-500">
                  <tr>
                    <th className="py-2.5 pl-4 pr-2 text-left">งาน</th>
                    <th className="px-3 py-2.5 text-left">สถานะ</th>
                    <th className="px-3 py-2.5 text-left">ความคืบหน้า</th>
                    <th className="px-3 py-2.5 text-left">ช่วงเวลา</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {phase.tasks.map((t, i) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      planId={plan.id}
                      projectId={plan.project.id}
                      seq={i + 1}
                      onEdit={openEdit}
                      onDelete={setDeleteTask}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => {
                setAddOpen(true)
                resetAdd()
              }}
            >
              เพิ่มงาน
            </Button>
          </div>
        </>
      )}

      {/* Add task modal */}
      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`เพิ่มงานใน ${phase.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={hsAdd(onAdd)}
              loading={addMutation.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={hsAdd(onAdd)}>
          <Input label="ชื่องาน" {...regAdd('title')} error={errAdd.title?.message} required />
          <Textarea label="รายละเอียด" {...regAdd('description')} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="วันเริ่มต้น" type="date" {...regAdd('startDate')} />
            <Input label="วันสิ้นสุด" type="date" {...regAdd('endDate')} />
          </div>
        </form>
      </FormModal>

      {/* Edit task modal */}
      <FormModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        title={`แก้ไขงาน — ${editTask?.title}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditTask(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={hsEdit(onEdit)}
              loading={updateMutation.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={hsEdit(onEdit)}>
          <Input label="ชื่องาน" {...regEdit('title')} error={errEdit.title?.message} required />
          <Textarea label="รายละเอียด" {...regEdit('description')} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="วันเริ่มต้น" type="date" {...regEdit('startDate')} />
            <Input label="วันสิ้นสุด" type="date" {...regEdit('endDate')} />
          </div>
          <Input label="ความคืบหน้า (%)" type="number" min={0} max={100} {...regEdit('progress')} />
        </form>
        {editTask && <TaskAttachments task={editTask} projectId={plan.project.id} />}
      </FormModal>

      {/* Delete confirm modal */}
      <FormModal
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        title="ยืนยันการลบงาน"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setDeleteTask(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={onDelete}
              loading={deleteMutation.isPending}
            >
              ลบงาน
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          คุณต้องการลบงาน{' '}
          <span className="font-medium text-gray-900">&quot;{deleteTask?.title}&quot;</span>{' '}
          ใช่หรือไม่?
        </p>
        <p className="mt-1 text-xs text-gray-400">การลบนี้ไม่สามารถเรียกคืนได้</p>
      </FormModal>
    </div>
  )
}

// ─── PlanView ─────────────────────────────────────────────────────────────────

function PlanView({ plan }: { plan: ProjectPlan }) {
  const allTasks = plan.phases.flatMap((p) => p.tasks)
  const total = allTasks.length
  const counts = {
    COMPLETED: allTasks.filter((t) => t.status === 'COMPLETED').length,
    IN_PROGRESS: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    BLOCKED: allTasks.filter((t) => t.status === 'BLOCKED').length,
    TODO: allTasks.filter((t) => t.status === 'TODO').length,
  }
  const overallPct =
    total > 0 ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / total) : 0

  // Find active phase (first phase with IN_PROGRESS tasks, or first incomplete)
  const activePhase =
    plan.phases.find((p) => p.tasks.some((t) => t.status === 'IN_PROGRESS')) ??
    plan.phases.find((p) => p.tasks.some((t) => t.status !== 'COMPLETED'))

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
            {/* Big progress */}
            <div className="shrink-0 text-center sm:text-left">
              <p className="text-xs text-gray-500">ความคืบหน้ารวม</p>
              <p className="mt-0.5 text-4xl font-bold text-gray-900">
                {overallPct}
                <span className="text-xl font-normal text-gray-400">%</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{total} งานทั้งหมด</p>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-1 flex-wrap gap-3">
              {(
                [
                  ['COMPLETED', 'เสร็จแล้ว', 'bg-green-100 text-green-700'],
                  ['IN_PROGRESS', 'กำลังทำ', 'bg-blue-100 text-blue-700'],
                  ['BLOCKED', 'ติดขัด', 'bg-red-100 text-red-700'],
                  ['TODO', 'รอดำเนินการ', 'bg-gray-100 text-gray-600'],
                ] as const
              ).map(([key, label, cls]) => (
                <div
                  key={key}
                  className={`flex flex-col items-center rounded-xl px-4 py-2.5 ${cls}`}
                >
                  <span className="text-2xl font-bold">{counts[key]}</span>
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>

            {/* Meta */}
            <div className="shrink-0 text-right text-xs text-gray-400">
              <p className="font-medium text-gray-700">
                {plan.templateType ? TEMPLATE_LABELS[plan.templateType] : '—'}
              </p>
              <p className="mt-0.5">{plan.phases.length} ขั้นตอน</p>
              {activePhase && <p className="mt-1 text-primary-600">▶ {activePhase.name}</p>}
            </div>
          </div>

          {/* Overall segmented progress bar */}
          {total > 0 && (
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div className="flex h-full">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(counts.COMPLETED / total) * 100}%` }}
                />
                <div
                  className="h-full bg-blue-400 transition-all"
                  style={{ width: `${(counts.IN_PROGRESS / total) * 100}%` }}
                />
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${(counts.BLOCKED / total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-1.5 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              เสร็จ
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
              กำลังทำ
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              ติดขัด
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-200" />
              รอ
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Phases */}
      <div className="space-y-3">
        {plan.phases.map((phase, i) => (
          <PhaseSection
            key={phase.id}
            phase={phase}
            plan={plan}
            phaseNum={i + 1}
            defaultOpen={phase.id === activePhase?.id || i === 0}
          />
        ))}
      </div>
    </div>
  )
}

// ─── TemplatePicker ───────────────────────────────────────────────────────────

function TemplatePicker({ projectId }: { projectId: number }) {
  const { data: templates, isLoading } = usePlanTemplates()
  const createMutation = useCreateProjectPlan(projectId)
  const { success, error: toastError } = useToast()

  async function handleSelect(type: PlanTemplateType) {
    try {
      await createMutation.mutateAsync({ projectId, templateType: type })
      success('สร้างแผนงานสำเร็จ')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">เลือกประเภทแผนงานที่ตรงกับโครงการนี้</p>
      <div className="grid gap-3 md:grid-cols-3">
        {(templates ?? []).map((tmpl) => (
          <button
            key={tmpl.type}
            disabled={createMutation.isPending}
            onClick={() => handleSelect(tmpl.type)}
            className="group rounded-xl border-2 border-gray-200 p-5 text-left transition-all hover:border-primary-400 hover:bg-primary-50 disabled:opacity-60"
          >
            <p className="font-semibold text-gray-900 group-hover:text-primary-700">
              {TEMPLATE_LABELS[tmpl.type]}
            </p>
            <p className="mt-1 text-xs text-gray-500">{TEMPLATE_DESCRIPTIONS[tmpl.type]}</p>
            <p className="mt-3 text-xs text-gray-400">
              {tmpl.phases.length} ขั้นตอน · {tmpl.phases.reduce((s, p) => s + p.tasks.length, 0)}{' '}
              งาน
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── PlansContent (export) ────────────────────────────────────────────────────

interface Props {
  projectId: number
}

export function PlansContent({ projectId }: Props) {
  const { data: plan, isLoading } = useProjectPlanByProject(projectId)

  if (isLoading) return <LoadingState />

  if (!plan) {
    return (
      <EmptyState
        icon={Plus}
        title="ยังไม่มีแผนงาน"
        description="เลือก template เพื่อสร้างแผนงานสำหรับโครงการนี้"
        action={<TemplatePicker projectId={projectId} />}
      />
    )
  }

  return <PlanView plan={plan} />
}
