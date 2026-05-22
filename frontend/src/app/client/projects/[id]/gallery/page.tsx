'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ImageIcon,
  X,
  ZoomIn,
  FileText,
  FileSpreadsheet,
  File,
  Film,
  Music,
  Download,
  Package,
} from 'lucide-react'
import { useClientFiles } from '@/hooks/useClientProjects'
import type { ClientFile } from '@/hooks/useClientProjects'

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
])
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif|heic)$/i

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004') + '/api/v1'
const fileUrl = (key: string) => `${BASE_URL}/files/${key}`

function isImage(f: ClientFile) {
  return IMAGE_MIME.has(f.mimeType ?? '') || IMAGE_EXT.test(f.originalName)
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mimeType, name }: { mimeType: string | null; name: string }) {
  const mime = mimeType ?? ''
  if (mime.includes('pdf') || name.endsWith('.pdf'))
    return <FileText className="h-8 w-8 text-red-400" />
  if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xlsx?|csv)$/i.test(name))
    return <FileSpreadsheet className="h-8 w-8 text-green-400" />
  if (mime.includes('word') || mime.includes('document') || /\.(docx?)$/i.test(name))
    return <FileText className="h-8 w-8 text-blue-400" />
  if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(name))
    return <Film className="h-8 w-8 text-purple-400" />
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a)$/i.test(name))
    return <Music className="h-8 w-8 text-pink-400" />
  if (mime.includes('zip') || mime.includes('rar') || /\.(zip|rar|7z)$/i.test(name))
    return <Package className="h-8 w-8 text-amber-400" />
  return <File className="h-8 w-8 text-gray-400" />
}

// ─── Tab Button ──────────────────────────────────────────────────────────────
function TabBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-white text-primary-700 shadow-sm' : 'text-white/60 hover:text-white/90'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? 'bg-primary-100 text-primary-600' : 'bg-white/10 text-white/50'}`}
      >
        {count}
      </span>
    </button>
  )
}

// ─── Image Grid ───────────────────────────────────────────────────────────────
function ImageGrid({ images, onOpen }: { images: ClientFile[]; onOpen: (src: string) => void }) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ImageIcon className="h-12 w-12 text-white/20" />
        <p className="mt-3 text-sm text-white/40">ยังไม่มีรูปภาพ</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {images.map((img) => {
        const src = fileUrl(img.storageKey)
        return (
          <button
            key={img.id}
            onClick={() => onOpen(src)}
            className="group relative aspect-square overflow-hidden bg-white/5 active:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={img.originalName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
              <ZoomIn className="h-5 w-5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── File List ────────────────────────────────────────────────────────────────
function FileList({ files }: { files: ClientFile[] }) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <File className="h-12 w-12 text-white/20" />
        <p className="mt-3 text-sm text-white/40">ยังไม่มีไฟล์</p>
      </div>
    )
  }
  return (
    <div className="space-y-1 p-4">
      {files.map((f) => (
        <a
          key={f.id}
          href={fileUrl(f.storageKey)}
          target="_blank"
          rel="noopener noreferrer"
          download={f.originalName}
          className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3 transition active:bg-white/20 hover:bg-white/15"
        >
          <div className="shrink-0">
            <FileTypeIcon mimeType={f.mimeType} name={f.originalName} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{f.originalName}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
              {f.size && <span>{formatSize(f.size)}</span>}
              {f.uploadedBy && <span>· โดย {f.uploadedBy.name}</span>}
            </div>
          </div>
          <Download className="h-4 w-4 shrink-0 text-white/30" />
        </a>
      ))}
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        className="absolute right-4 rounded-full bg-white/20 p-2 text-white"
        style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientGalleryPage() {
  const { id } = useParams<{ id: string }>()
  const { data: files, isLoading } = useClientFiles(Number(id))
  const [tab, setTab] = useState<'images' | 'files'>('images')
  const [lightbox, setLightbox] = useState<string | null>(null)

  const images = files?.filter(isImage) ?? []
  const docs = files?.filter((f) => !isImage(f)) ?? []

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 p-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/10" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Tab bar */}
      <div className="sticky top-0 z-10 flex gap-1 bg-primary-900/80 px-3 py-2 backdrop-blur">
        <TabBtn
          label="รูปภาพ"
          count={images.length}
          active={tab === 'images'}
          onClick={() => setTab('images')}
        />
        <TabBtn
          label="ไฟล์"
          count={docs.length}
          active={tab === 'files'}
          onClick={() => setTab('files')}
        />
      </div>

      {tab === 'images' && <ImageGrid images={images} onOpen={setLightbox} />}
      {tab === 'files' && <FileList files={docs} />}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}
