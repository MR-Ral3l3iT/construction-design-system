'use client'

import React, { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  type LucideIcon,
  Calendar,
  CheckCircle2,
  RefreshCcw,
  Pencil,
  Play,
  Send,
  Paperclip,
  MessageSquare,
  Upload,
  Trash2,
  Download,
  Eye,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Film,
  Send as SendIcon,
} from 'lucide-react'
import { Card, CardBody, Badge, Button } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { DesignTaskFormModal } from '../DesignTaskFormModal'
import { useDesignTask } from '@/hooks/useDesignTasks'
import {
  useFilesByDesignTask,
  useUploadFile,
  useDeleteFile,
  useDesignTaskComments,
  useCreateComment,
  useDeleteComment,
  type FileAsset,
  type Comment,
} from '@/hooks/useFiles'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'
import { convertToWebP, isImageFile } from '@/lib/imageUtils'

const STATUS_ACTIONS: Record<
  string,
  { label: string; next: string; variant: 'primary' | 'outline' | 'danger'; icon: LucideIcon }[]
> = {
  TODO: [{ label: 'เริ่มดำเนินงาน', next: 'IN_PROGRESS', variant: 'primary', icon: Play }],
  IN_PROGRESS: [{ label: 'ส่งตรวจสอบ', next: 'WAITING_REVIEW', variant: 'primary', icon: Send }],
  WAITING_REVIEW: [
    { label: 'อนุมัติ', next: 'APPROVED', variant: 'primary', icon: CheckCircle2 },
    { label: 'ขอแก้ไข (Revision)', next: 'REVISION', variant: 'outline', icon: RefreshCcw },
  ],
  REVISION: [{ label: 'กลับทำงาน', next: 'IN_PROGRESS', variant: 'outline', icon: Play }],
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text'))
    return FileText
  return File
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(url, '_blank')
  }
}

interface Props {
  id: number
  projectId: number
}

export function DesignTaskDetailContent({ id, projectId }: Props) {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const { data: task, isLoading } = useDesignTask(id)
  const { data: files } = useFilesByDesignTask(id)
  const { data: comments } = useDesignTaskComments(id)

  const uploadFileMutation = useUploadFile()
  const deleteFileMutation = useDeleteFile({ designTaskId: id })
  const createCommentMutation = useCreateComment(id)
  const deleteCommentMutation = useDeleteComment(id)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileAsset | null>(null)
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<Comment | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const statusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const { data } = await api.patch(`/design-tasks/${id}/status`, { status, note })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['design-tasks', id] })
      qc.invalidateQueries({ queryKey: ['design-tasks', 'project', projectId] })
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    setIsUploading(true)
    try {
      for (const raw of selected) {
        const file = isImageFile(raw) ? await convertToWebP(raw) : raw
        await uploadFileMutation.mutateAsync({ designTaskId: id, file, category: 'DESIGN' })
      }
      success(`อัปโหลด ${selected.length} ไฟล์สำเร็จ`)
    } catch {
      toastError('อัปโหลดไม่สำเร็จ')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteFile() {
    if (!deleteFileTarget) return
    try {
      await deleteFileMutation.mutateAsync(deleteFileTarget.id)
      success('ลบไฟล์สำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setDeleteFileTarget(null)
    }
  }

  async function handleSendComment() {
    const msg = commentText.trim()
    if (!msg) return
    try {
      await createCommentMutation.mutateAsync(msg)
      setCommentText('')
    } catch {
      toastError('ส่งความคิดเห็นไม่สำเร็จ')
    }
  }

  async function handleDeleteComment() {
    if (!deleteCommentTarget) return
    try {
      await deleteCommentMutation.mutateAsync(deleteCommentTarget.id)
      success('ลบความคิดเห็นสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setDeleteCommentTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!task) return <p className="text-gray-500">ไม่พบงานออกแบบ</p>

  const actions = STATUS_ACTIONS[task.status] ?? []
  const fileList = files ?? []
  const commentList = comments ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
              {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <Badge variant="outline">Rev. {task.revisionNo}</Badge>
                {task.project && (
                  <Link
                    href={`/admin/projects/${task.project.id}`}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {task.project.code} · {task.project.name}
                  </Link>
                )}
              </div>
            </div>
            {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
              <Button variant="outline" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
                แก้ไข
              </Button>
            )}
          </div>

          {/* Dates */}
          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
            {task.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">วันเริ่มต้น</p>
                  <p className="text-sm text-gray-900">
                    {new Date(task.startDate).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">กำหนดส่ง</p>
                  <p className="text-sm text-gray-900">
                    {new Date(task.dueDate).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
            )}
            {task.approvedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">อนุมัติเมื่อ</p>
                  <p className="text-sm text-gray-900">
                    {new Date(task.approvedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status actions */}
          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {actions.map((action) => (
                <Button
                  key={action.next}
                  variant={action.variant}
                  size="sm"
                  icon={action.icon}
                  onClick={() => {
                    statusMutation.mutate({ status: action.next })
                    if (action.next === 'APPROVED') success('อนุมัติงานออกแบบสำเร็จ')
                  }}
                  loading={statusMutation.isPending}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Files + Comments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- ไฟล์แนบ ---- */}
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium text-gray-900">
                <Paperclip className="h-4 w-4 text-primary-500" />
                ไฟล์แนบ
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {fileList.length}
                </span>
              </h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {fileList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Paperclip className="mb-2 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">ยังไม่มีไฟล์แนบ</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs text-primary-500 hover:underline"
                >
                  คลิกเพื่ออัปโหลด
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {fileList.map((f) => {
                  const isImage = f.mimeType?.startsWith('image/')
                  const Icon = getFileIcon(f.mimeType)
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                    >
                      {isImage ? (
                        <button
                          onClick={() => setLightboxUrl(f.url)}
                          className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-200"
                        >
                          <img
                            src={f.url}
                            alt={f.originalName}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                            <Eye className="h-3.5 w-3.5 text-white opacity-0 transition group-hover:opacity-100" />
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                          <Icon className="h-5 w-5 text-blue-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {f.originalName}
                        </p>
                        <p className="text-xs text-gray-400">{formatBytes(f.size ?? 0)}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {isImage ? (
                          <button
                            onClick={() => setLightboxUrl(f.url)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                            title="ดูภาพ"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                            title="เปิดไฟล์"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => downloadFile(f.url, f.originalName)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600"
                          title="ดาวน์โหลด"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteFileTarget(f)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* ---- ความคิดเห็น ---- */}
        <Card>
          <CardBody className="flex flex-col">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
              <MessageSquare className="h-4 w-4 text-primary-500" />
              ความคิดเห็น
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {commentList.length}
              </span>
            </h3>

            {/* Comment list */}
            <div className="mb-4 max-h-72 min-h-[8rem] flex-1 space-y-3 overflow-y-auto">
              {commentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="mb-2 h-10 w-10 text-gray-200" />
                  <p className="text-sm text-gray-400">ยังไม่มีความคิดเห็น</p>
                </div>
              ) : (
                commentList.map((c) => (
                  <div key={c.id} className="group flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {c.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{c.user.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.createdAt).toLocaleString('th-TH', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                        <button
                          onClick={() => setDeleteCommentTarget(c)}
                          className="ml-auto hidden rounded p-0.5 text-gray-300 hover:text-red-500 group-hover:block"
                          title="ลบ"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">
                        {c.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div className="border-t pt-3">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendComment()
                    }
                  }}
                  placeholder="พิมพ์ความคิดเห็น... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || createCommentMutation.isPending}
                  className="flex h-full items-center justify-center rounded-lg bg-primary-500 px-3 text-white hover:bg-primary-600 disabled:opacity-40"
                  title="ส่ง"
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modals */}
      <DesignTaskFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        task={task}
      />
      <ConfirmModal
        open={!!deleteFileTarget}
        onClose={() => setDeleteFileTarget(null)}
        onConfirm={handleDeleteFile}
        title={`ลบไฟล์ "${deleteFileTarget?.originalName}"`}
        description="ไฟล์จะถูกลบและไม่สามารถกู้คืนได้"
        confirmLabel="ลบ"
        danger
        loading={deleteFileMutation.isPending}
      />
      <ConfirmModal
        open={!!deleteCommentTarget}
        onClose={() => setDeleteCommentTarget(null)}
        onConfirm={handleDeleteComment}
        title="ลบความคิดเห็น"
        description="ความคิดเห็นนี้จะถูกลบถาวร"
        confirmLabel="ลบ"
        danger
        loading={deleteCommentMutation.isPending}
      />
    </div>
  )
}
