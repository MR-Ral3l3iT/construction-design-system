'use client'

import { useState } from 'react'
import {
  Paperclip,
  Upload,
  Trash2,
  Download,
  Eye,
  ExternalLink,
  X,
  Image as ImageIcon,
  FileText,
  File,
  Film,
} from 'lucide-react'
import { Button, FileUpload } from '@construction/ui'
import { FormModal } from './FormModal'
import { ConfirmModal } from './ConfirmModal'
import { useUploadFile, useDeleteFile, type FileAsset } from '@/hooks/useFiles'
import { useToast } from '@/providers/toast-provider'

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text'))
    return FileText
  return File
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  files: FileAsset[]
  projectId: number
  entityId: number
  entityType: 'dailyUpdate' | 'issue'
  category: string
  readOnly?: boolean
}

export function FileAttachments({
  files,
  projectId,
  entityId,
  entityType,
  category,
  readOnly,
}: Props) {
  const { success, error: toastError } = useToast()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [deleteTarget, setDeleteTarget] = useState<FileAsset | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const uploadMutation = useUploadFile()
  const deleteMutation = useDeleteFile({ projectId })

  async function handleUpload() {
    if (uploadFiles.length === 0) return toastError('กรุณาเลือกไฟล์')
    let hasError = false
    for (const file of uploadFiles) {
      try {
        await uploadMutation.mutateAsync({
          projectId,
          [entityType === 'dailyUpdate' ? 'dailyUpdateId' : 'issueId']: entityId,
          file,
          category,
        })
      } catch {
        hasError = true
      }
    }
    if (!hasError) {
      success(`อัปโหลด ${uploadFiles.length} ไฟล์สำเร็จ`)
      setUploadOpen(false)
      setUploadFiles([])
    } else {
      toastError('บางไฟล์อัปโหลดไม่สำเร็จ')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบไฟล์สำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Paperclip className="h-4 w-4 text-gray-400" />
          <span>ไฟล์แนบ</span>
          {files.length > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {files.length}
            </span>
          )}
        </div>
        {!readOnly && (
          <Button variant="ghost" size="sm" icon={Upload} onClick={() => setUploadOpen(true)}>
            แนบไฟล์
          </Button>
        )}
      </div>

      {files.length > 0 ? (
        <div className="space-y-1.5">
          {files.map((f) => {
            const Icon = getFileIcon(f.mimeType)
            const isImage = f.mimeType?.startsWith('image/')
            return (
              <div
                key={f.id}
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                {isImage ? (
                  <button
                    onClick={() => setLightboxUrl(f.url)}
                    className="group relative h-8 w-8 shrink-0 overflow-hidden rounded bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.originalName} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white text-gray-400">
                    <Icon className="h-4 w-4" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-gray-800">{f.originalName}</p>
                  <p className="text-xs text-gray-400">{formatBytes(f.size ?? 0)}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isImage ? (
                    <button
                      onClick={() => setLightboxUrl(f.url)}
                      className="rounded p-1 text-gray-400 hover:bg-white hover:text-primary-600"
                      title="ดูภาพ"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1 text-gray-400 hover:bg-white hover:text-primary-600"
                      title="เปิดไฟล์"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => downloadFile(f.url, f.originalName)}
                    className="rounded p-1 text-gray-400 hover:bg-white hover:text-green-600"
                    title="ดาวน์โหลด"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => setDeleteTarget(f)}
                      className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-600"
                      title="ลบ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400 py-1">ยังไม่มีไฟล์แนบ</p>
      )}

      {/* Upload modal */}
      <FormModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setUploadFiles([])
        }}
        title="แนบไฟล์"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setUploadOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Upload}
              onClick={handleUpload}
              loading={uploadMutation.isPending}
            >
              อัปโหลด
            </Button>
          </div>
        }
      >
        <FileUpload
          multiple
          maxSizeMb={200}
          hint="รองรับ PDF, Word, Excel, รูปภาพ, วิดีโอ (สูงสุด 200 MB)"
          onFilesChange={setUploadFiles}
        />
      </FormModal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`ลบไฟล์ "${deleteTarget?.originalName}"`}
        description="ไฟล์จะถูกลบและไม่สามารถกู้คืนได้"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
