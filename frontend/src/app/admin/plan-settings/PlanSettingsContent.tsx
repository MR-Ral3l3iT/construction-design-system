'use client'

import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  GripVertical,
  CheckSquare,
  Square,
  ExternalLink,
  Info,
} from 'lucide-react'
import { Button, Card, CardBody, Input } from '@construction/ui'
import { matchTaskLinks, TASK_LINKS } from '@/lib/taskLinks'
import { FormModal } from '@/components/shared/FormModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  usePlanTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useAddTemplatePhase,
  useUpdateTemplatePhase,
  useDeleteTemplatePhase,
  useAddTemplateTask,
  useUpdateTemplateTask,
  useDeleteTemplateTask,
  type PlanTemplate,
  type TemplatePhase,
  type TemplateTask,
} from '@/hooks/useProjectPlans'

// ─── schemas ──────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ template'),
  type: z
    .string()
    .min(1, 'กรุณากรอกรหัส template')
    .regex(/^[A-Z0-9_]+$/, 'ใช้ตัวพิมพ์ใหญ่ A-Z และ _ เท่านั้น เช่น DESIGN_BOQ'),
})
type TemplateForm = z.infer<typeof templateSchema>

const phaseSchema = z.object({ name: z.string().min(1, 'กรุณากรอกชื่อขั้นตอน') })
type PhaseForm = z.infer<typeof phaseSchema>

const taskSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่องาน'),
  isOptional: z.boolean().optional(),
})
type TaskForm = z.infer<typeof taskSchema>

// ─── TemplateTaskRow ──────────────────────────────────────────────────────────

function TemplateTaskRow({
  task,
  onEdit,
  onDelete,
}: {
  task: TemplateTask
  onEdit: (t: TemplateTask) => void
  onDelete: (t: TemplateTask) => void
}) {
  const links = matchTaskLinks(task.title)
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50/60">
      <GripVertical size={14} className="shrink-0 text-gray-300" />
      <span className="flex-1 text-sm text-gray-800">{task.title}</span>
      {links.map((link) => (
        <span
          key={link.key}
          title={`งานนี้จะแสดง link ไปยัง${link.label}โดยอัตโนมัติ`}
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${link.badgeCls}`}
        >
          <ExternalLink size={10} />
          {link.label}
        </span>
      ))}
      {task.isOptional && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Optional</span>
      )}
      <button onClick={() => onEdit(task)} className="text-gray-400 hover:text-primary-600">
        <Pencil size={13} />
      </button>
      <button onClick={() => onDelete(task)} className="text-gray-400 hover:text-red-500">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── TemplatePhaseSection ─────────────────────────────────────────────────────

function TemplatePhaseSection({ phase, templateId }: { phase: TemplatePhase; templateId: number }) {
  const [open, setOpen] = useState(false)
  const [editPhaseOpen, setEditPhaseOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [editTask, setEditTask] = useState<TemplateTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<TemplateTask | null>(null)
  const { success, error: toastError } = useToast()

  const updatePhase = useUpdateTemplatePhase()
  const deletePhase = useDeleteTemplatePhase()
  const addTask = useAddTemplateTask()
  const updateTask = useUpdateTemplateTask()
  const deleteTaskMut = useDeleteTemplateTask()

  const phaseForm = useForm<PhaseForm>({
    resolver: zodResolver(phaseSchema),
    defaultValues: { name: phase.name },
  })
  const addTaskForm = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', isOptional: false },
  })
  const editTaskForm = useForm<TaskForm>({ resolver: zodResolver(taskSchema) })

  async function onUpdatePhase(v: PhaseForm) {
    try {
      await updatePhase.mutateAsync({ phaseId: phase.id, payload: { name: v.name } })
      success('แก้ไขขั้นตอนสำเร็จ')
      setEditPhaseOpen(false)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function onDeletePhase() {
    try {
      await deletePhase.mutateAsync(phase.id)
      success('ลบขั้นตอนสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function onAddTask(v: TaskForm) {
    try {
      await addTask.mutateAsync({
        phaseId: phase.id,
        payload: { title: v.title, isOptional: v.isOptional ?? false },
      })
      success('เพิ่มงานสำเร็จ')
      setAddTaskOpen(false)
      addTaskForm.reset()
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  function openEditTask(t: TemplateTask) {
    setEditTask(t)
    editTaskForm.reset({ title: t.title, isOptional: t.isOptional })
  }

  async function onEditTask(v: TaskForm) {
    if (!editTask) return
    try {
      await updateTask.mutateAsync({
        taskId: editTask.id,
        payload: { title: v.title, isOptional: v.isOptional ?? false },
      })
      success('แก้ไขงานสำเร็จ')
      setEditTask(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function onDeleteTask() {
    if (!deleteTask) return
    try {
      await deleteTaskMut.mutateAsync(deleteTask.id)
      success('ลบงานสำเร็จ')
      setDeleteTask(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      {/* Phase header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown size={15} className="text-gray-400" />
          ) : (
            <ChevronRight size={15} className="text-gray-400" />
          )}
          <span className="font-medium text-gray-800">{phase.name}</span>
          <span className="text-xs text-gray-400">({phase.tasks.length} งาน)</span>
        </button>
        <button
          onClick={() => {
            phaseForm.reset({ name: phase.name })
            setEditPhaseOpen(true)
          }}
          className="text-gray-400 hover:text-primary-600"
        >
          <Pencil size={13} />
        </button>
        <button onClick={onDeletePhase} className="text-gray-400 hover:text-red-500">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Tasks */}
      {open && (
        <div className="border-t border-gray-200 bg-white px-3 pb-3 pt-2">
          <div className="space-y-1.5">
            {phase.tasks.map((t) => (
              <TemplateTaskRow key={t.id} task={t} onEdit={openEditTask} onDelete={setDeleteTask} />
            ))}
          </div>
          <button
            onClick={() => {
              setAddTaskOpen(true)
              addTaskForm.reset({ title: '', isOptional: false })
            }}
            className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
          >
            <Plus size={13} /> เพิ่มงาน
          </button>
        </div>
      )}

      {/* Edit phase modal */}
      <FormModal
        open={editPhaseOpen}
        onClose={() => setEditPhaseOpen(false)}
        title="แก้ไขชื่อขั้นตอน"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditPhaseOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={phaseForm.handleSubmit(onUpdatePhase)}
              loading={updatePhase.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <Input
          label="ชื่อขั้นตอน"
          {...phaseForm.register('name')}
          error={phaseForm.formState.errors.name?.message}
          autoFocus
        />
      </FormModal>

      {/* Add task modal */}
      <FormModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        title={`เพิ่มงานใน ${phase.name}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setAddTaskOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={addTaskForm.handleSubmit(onAddTask)}
              loading={addTask.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="ชื่องาน"
            {...addTaskForm.register('title')}
            error={addTaskForm.formState.errors.title?.message}
            autoFocus
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <button
              type="button"
              onClick={() => addTaskForm.setValue('isOptional', !addTaskForm.watch('isOptional'))}
              className="text-gray-400"
            >
              {addTaskForm.watch('isOptional') ? (
                <CheckSquare size={16} className="text-primary-600" />
              ) : (
                <Square size={16} />
              )}
            </button>
            งานนี้เป็น Optional (ไม่บังคับ)
          </label>
        </div>
      </FormModal>

      {/* Edit task modal */}
      <FormModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        title="แก้ไขงาน"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditTask(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={editTaskForm.handleSubmit(onEditTask)}
              loading={updateTask.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="ชื่องาน"
            {...editTaskForm.register('title')}
            error={editTaskForm.formState.errors.title?.message}
            autoFocus
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <button
              type="button"
              onClick={() => editTaskForm.setValue('isOptional', !editTaskForm.watch('isOptional'))}
              className="text-gray-400"
            >
              {editTaskForm.watch('isOptional') ? (
                <CheckSquare size={16} className="text-primary-600" />
              ) : (
                <Square size={16} />
              )}
            </button>
            งานนี้เป็น Optional (ไม่บังคับ)
          </label>
        </div>
      </FormModal>

      {/* Delete task confirm */}
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
              onClick={onDeleteTask}
              loading={deleteTaskMut.isPending}
            >
              ลบ
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          ลบงาน <span className="font-medium">"{deleteTask?.title}"</span> ออกจาก template?
        </p>
      </FormModal>
    </div>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ tmpl }: { tmpl: PlanTemplate }) {
  const [addPhaseOpen, setAddPhaseOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { success, error: toastError } = useToast()

  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const addPhase = useAddTemplatePhase()

  const nameForm = useForm<{ name: string }>({ defaultValues: { name: tmpl.name } })
  const phaseForm = useForm<PhaseForm>({ resolver: zodResolver(phaseSchema) })

  const totalTasks = tmpl.phases.reduce((s, p) => s + p.tasks.length, 0)

  async function onUpdateName(v: { name: string }) {
    try {
      await updateTemplate.mutateAsync({ id: tmpl.id, payload: { name: v.name } })
      success('แก้ไขชื่อสำเร็จ')
      setEditOpen(false)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function onDelete() {
    try {
      await deleteTemplate.mutateAsync(tmpl.id)
      success('ลบ template สำเร็จ')
      setDeleteOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function onAddPhase(v: PhaseForm) {
    try {
      await addPhase.mutateAsync({ templateId: tmpl.id, payload: { name: v.name } })
      success('เพิ่มขั้นตอนสำเร็จ')
      setAddPhaseOpen(false)
      phaseForm.reset()
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  return (
    <Card>
      <CardBody>
        {/* Template header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
            <p className="mt-0.5 font-mono text-xs text-gray-400">{tmpl.type}</p>
            <p className="mt-1 text-xs text-gray-500">
              {tmpl.phases.length} ขั้นตอน · {totalTasks} งาน
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => {
                nameForm.reset({ name: tmpl.name })
                setEditOpen(true)
              }}
            >
              แก้ไขชื่อ
            </Button>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteOpen(true)} />
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-2">
          {tmpl.phases.map((phase) => (
            <TemplatePhaseSection key={phase.id} phase={phase} templateId={tmpl.id} />
          ))}
        </div>

        <button
          onClick={() => {
            setAddPhaseOpen(true)
            phaseForm.reset()
          }}
          className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
        >
          <Plus size={15} /> เพิ่มขั้นตอน
        </button>
      </CardBody>

      {/* Edit name modal */}
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="แก้ไขชื่อ Template"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={nameForm.handleSubmit(onUpdateName)}
              loading={updateTemplate.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <Input label="ชื่อ Template" {...nameForm.register('name')} autoFocus />
      </FormModal>

      {/* Add phase modal */}
      <FormModal
        open={addPhaseOpen}
        onClose={() => setAddPhaseOpen(false)}
        title="เพิ่มขั้นตอนใหม่"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setAddPhaseOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={phaseForm.handleSubmit(onAddPhase)}
              loading={addPhase.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <Input
          label="ชื่อขั้นตอน"
          {...phaseForm.register('name')}
          error={phaseForm.formState.errors.name?.message}
          autoFocus
        />
      </FormModal>

      {/* Delete confirm */}
      <FormModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="ยืนยันการลบ Template"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setDeleteOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={onDelete}
              loading={deleteTemplate.isPending}
            >
              ลบ Template
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          ลบ Template <span className="font-medium">"{tmpl.name}"</span>?
        </p>
        <p className="mt-1 text-xs text-red-500">ไม่สามารถลบได้หากมีโครงการใช้ template นี้อยู่</p>
      </FormModal>
    </Card>
  )
}

// ─── PlanSettingsContent ──────────────────────────────────────────────────────

export function PlanSettingsContent() {
  const { data: templates = [], isLoading } = usePlanTemplates()
  const [createOpen, setCreateOpen] = useState(false)
  const { success, error: toastError } = useToast()
  const createTemplate = useCreateTemplate()

  const form = useForm<TemplateForm>({ resolver: zodResolver(templateSchema) })

  async function onCreateTemplate(v: TemplateForm) {
    try {
      await createTemplate.mutateAsync({ name: v.name, type: v.type })
      success('สร้าง template สำเร็จ')
      setCreateOpen(false)
      form.reset()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-4">
      {/* Link shortcut info banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
        <div className="space-y-2 text-sm text-blue-900">
          <p className="font-medium">
            Shortcut Link อัตโนมัติ — ตั้งชื่องานให้ตรงคำด้านล่าง ระบบจะแสดง chip link ให้อัตโนมัติ
          </p>
          <div className="space-y-1.5">
            {TASK_LINKS.map((link) => (
              <div key={link.key} className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${link.badgeCls}`}
                >
                  <ExternalLink size={9} />
                  {link.label}
                </span>
                <span className="text-xs text-blue-700">
                  ชื่อมีคำว่า:{' '}
                  {link.pattern.source
                    .split('|')
                    .map((p) => p.replace(/\\b|\\s\*/g, '').replace(/\\/g, ''))
                    .map((kw) => (
                      <code key={kw} className="mx-0.5 rounded bg-blue-100 px-1">
                        {kw}
                      </code>
                    ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{templates.length} template</p>
        <Button
          variant="primary"
          icon={Plus}
          size="sm"
          onClick={() => {
            setCreateOpen(true)
            form.reset()
          }}
        >
          สร้าง Template ใหม่
        </Button>
      </div>

      {/* Template list */}
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((tmpl) => (
          <TemplateCard key={tmpl.id} tmpl={tmpl} />
        ))}
      </div>

      {/* Create template modal */}
      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="สร้าง Template ใหม่"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setCreateOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={form.handleSubmit(onCreateTemplate)}
              loading={createTemplate.isPending}
            >
              สร้าง
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onCreateTemplate)}>
          <Input
            label="ชื่อ Template"
            placeholder="เช่น ออกแบบ + ก่อสร้าง"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
            required
            autoFocus
          />
          <Input
            label="รหัส Template (ตัวพิมพ์ใหญ่ + _)"
            placeholder="เช่น DESIGN_CONSTRUCTION"
            {...form.register('type')}
            error={form.formState.errors.type?.message}
            required
          />
          <p className="text-xs text-gray-400">
            รหัสต้องไม่ซ้ำกับ template ที่มีอยู่ และใช้ได้เฉพาะ A-Z, 0-9, _ เท่านั้น
          </p>
        </form>
      </FormModal>
    </div>
  )
}
