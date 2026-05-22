'use client'

import { useState } from 'react'
import {
  FileText,
  Image as ImageIcon,
  Film,
  File,
  FolderOpen,
  Folder,
  Upload,
  Trash2,
  Download,
  X,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  ChevronRight,
} from 'lucide-react'
import { Button, Badge, EmptyState, FileUpload, Select, Pagination } from '@construction/ui'
import { SearchInput } from '@/components/shared/SearchInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormModal } from '@/components/shared/FormModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { useFilesByProject, useUploadFile, useDeleteFile, type FileAsset } from '@/hooks/useFiles'
import { useToast } from '@/providers/toast-provider'

const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'PLAN', label: 'แปลน / ไฟล์แนบ', color: 'text-blue-500 bg-blue-50' },
  { key: 'IMAGE', label: 'ภาพประกอบ', color: 'text-pink-500 bg-pink-50' },
  { key: 'DESIGN', label: 'งานออกแบบ', color: 'text-violet-500 bg-violet-50' },
  { key: 'BOQ', label: 'BOQ', color: 'text-green-500 bg-green-50' },
  { key: 'CONTRACT', label: 'สัญญา', color: 'text-amber-500 bg-amber-50' },
  { key: 'DAILY_UPDATE', label: 'อัปเดตรายวัน', color: 'text-cyan-500 bg-cyan-50' },
  { key: 'ISSUE', label: 'ปัญหา', color: 'text-red-500 bg-red-50' },
  { key: 'PAYMENT', label: 'งวดเงิน', color: 'text-emerald-500 bg-emerald-50' },
  { key: 'HANDOVER', label: 'ส่งมอบ', color: 'text-teal-500 bg-teal-50' },
  { key: 'OTHER', label: 'อื่นๆ', color: 'text-gray-500 bg-gray-100' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))
const UPLOAD_CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c.key, label: c.label }))

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('pdf') || mimeType.includes('postscript')) return FileText
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text'))
    return FileText
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return FileArchive
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('html') ||
    mimeType.includes('xml')
  )
    return FileCode
  return File
}

function getIconBg(mimeType: string | null) {
  if (!mimeType) return 'bg-gray-100 text-gray-400'
  if (mimeType.startsWith('image/')) return 'bg-pink-50 text-pink-500'
  if (mimeType.startsWith('video/')) return 'bg-purple-50 text-purple-500'
  if (mimeType.includes('pdf')) return 'bg-red-50 text-red-500'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return 'bg-green-50 text-green-500'
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text'))
    return 'bg-blue-50 text-blue-500'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return 'bg-amber-50 text-amber-500'
  return 'bg-gray-100 text-gray-400'
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
  projectId: number
}

export function FilesContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState('OTHER')
  const [deleteTarget, setDeleteTarget] = useState<FileAsset | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 10

  const { data: files, isLoading } = useFilesByProject(projectId)
  const uploadMutation = useUploadFile()
  const deleteMutation = useDeleteFile({ projectId })

  const allFiles = files ?? []

  // Count per category
  const countByCategory = allFiles.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] ?? 0) + 1
    return acc
  }, {})

  // Filtered file list
  const filtered = allFiles.filter((f) => {
    const matchFolder = selectedFolder === null || f.category === selectedFolder
    const matchSearch = !search || f.originalName.toLowerCase().includes(search.toLowerCase())
    return matchFolder && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openUpload() {
    if (selectedFolder) setUploadCategory(selectedFolder)
    setUploadOpen(true)
  }

  async function handleUpload() {
    if (uploadFiles.length === 0) return toastError('กรุณาเลือกไฟล์')
    let hasError = false
    for (const file of uploadFiles) {
      try {
        await uploadMutation.mutateAsync({ projectId, file, category: uploadCategory })
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

  const folderLabel = selectedFolder
    ? (CATEGORY_MAP[selectedFolder]?.label ?? selectedFolder)
    : 'ไฟล์ทั้งหมด'

  return (
    <div className="flex gap-4 min-h-[520px]">
      {/* ─── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* All files */}
          <button
            onClick={() => {
              setSelectedFolder(null)
              setSearch('')
              setPage(1)
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              selectedFolder === null
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                selectedFolder === null ? 'bg-primary-100' : 'bg-gray-100'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
            </div>
            <span className="flex-1 text-left truncate">ไฟล์ทั้งหมด</span>
            <span
              className={`text-xs font-medium ${selectedFolder === null ? 'text-primary-500' : 'text-gray-400'}`}
            >
              {allFiles.length}
            </span>
          </button>

          <div className="border-t border-gray-100" />

          {/* Category folders */}
          {CATEGORIES.map((cat) => {
            const count = countByCategory[cat.key] ?? 0
            const isSelected = selectedFolder === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setSelectedFolder(cat.key)
                  setSearch('')
                  setPage(1)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    isSelected ? 'bg-primary-100' : cat.color
                  }`}
                >
                  {isSelected ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                </div>
                <span className="flex-1 text-left truncate text-xs leading-tight">{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-xs font-medium ${isSelected ? 'text-primary-500' : 'text-gray-400'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium truncate">{folderLabel}</span>
            <span className="text-gray-400 shrink-0">({filtered.length})</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-44">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v)
                  setPage(1)
                }}
                placeholder="ค้นหาไฟล์..."
              />
            </div>
            <Button variant="primary" size="sm" icon={Upload} onClick={openUpload}>
              อัปโหลด
            </Button>
          </div>
        </div>

        {/* File list */}
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={search ? 'ไม่พบไฟล์' : 'โฟลเดอร์นี้ยังว่างอยู่'}
            description={search ? 'ลองเปลี่ยนคำค้นหา' : 'อัปโหลดไฟล์แรกสำหรับโฟลเดอร์นี้'}
            action={
              !search ? (
                <Button variant="primary" size="sm" icon={Upload} onClick={openUpload}>
                  อัปโหลดไฟล์
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y">
            {paginated.map((f) => {
              const Icon = getFileIcon(f.mimeType)
              const iconStyle = getIconBg(f.mimeType)
              const isImage = f.mimeType?.startsWith('image/')
              const catInfo = CATEGORY_MAP[f.category]
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Thumbnail / icon */}
                  {isImage ? (
                    <button
                      onClick={() => setLightboxUrl(f.url)}
                      className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  )}

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{f.originalName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {selectedFolder === null && catInfo && (
                        <Badge variant="outline">{catInfo.label}</Badge>
                      )}
                      <span className="text-xs text-gray-400">{formatBytes(f.size ?? 0)}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(f.createdAt).toLocaleDateString('th-TH')}
                      </span>
                      {f.uploadedBy && (
                        <span className="text-xs text-gray-400">โดย {f.uploadedBy.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {isImage ? (
                      <button
                        onClick={() => setLightboxUrl(f.url)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                        title="ดูภาพ"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                        title="เปิดไฟล์"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => downloadFile(f.url, f.originalName)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-green-300 hover:bg-green-50 hover:text-green-600"
                      title="ดาวน์โหลด"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(f)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      title="ลบ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && paginated.length > 0 && (
          <div className="flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ─── Upload modal ──────────────────────────────────────────────── */}
      <FormModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setUploadFiles([])
        }}
        title="อัปโหลดไฟล์"
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
        <div className="space-y-4">
          <Select
            label="โฟลเดอร์"
            options={UPLOAD_CATEGORY_OPTIONS}
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
          />
          <FileUpload
            multiple
            maxSizeMb={200}
            hint="รองรับ PDF, Word, Excel, รูปภาพ, วิดีโอ (สูงสุด 200 MB)"
            onFilesChange={setUploadFiles}
          />
        </div>
      </FormModal>

      {/* ─── Delete confirm ────────────────────────────────────────────── */}
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

      {/* ─── Image Lightbox ────────────────────────────────────────────── */}
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
