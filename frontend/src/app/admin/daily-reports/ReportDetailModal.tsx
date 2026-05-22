'use client'

import { useRef, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Pencil,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import {
  Badge,
  Button,
  Input,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
} from '@construction/ui'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormModal } from '@/components/shared/FormModal'
import { useToast } from '@/providers/toast-provider'
import {
  useAddReportImage,
  useAddReportIssue,
  useAddReportItem,
  useDailyReport,
  useDeleteReportImage,
  useDeleteReportIssue,
  useDeleteReportItem,
  usePublishDailyReport,
  useUpdateReportIssue,
  useUpdateReportItem,
  useWorkCategories,
  type DailyReportImage,
  type DailyReportIssue,
  type DailyReportItem,
  type ReportImageType,
} from '@/hooks/useDailyReports'

// ─── Labels ─────────────────────────────────────────────────────────────────

const WEATHER_LABEL: Record<string, string> = {
  SUNNY: '☀️ แดดจัด',
  PARTLY_CLOUDY: '🌤 มีเมฆบ้าง',
  CLOUDY: '☁️ ครึ้ม',
  RAINY: '🌧 ฝนตก',
  HEAVY_RAIN: '🌧🌧 ฝนหนัก',
  STORMY: '⛈ พายุ',
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'วางแผน',
  IN_PROGRESS: 'กำลังทำ',
  COMPLETED: 'เสร็จแล้ว',
}

const ITEM_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success'> = {
  PLANNED: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
}

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'ต่ำ',
  MEDIUM: 'ปานกลาง',
  HIGH: 'สูง',
  CRITICAL: 'วิกฤต',
}

const SEVERITY_VARIANT: Record<string, 'default' | 'warning' | 'danger'> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

const IMAGE_TYPE_LABEL: Record<ReportImageType, string> = {
  BEFORE: 'Before',
  AFTER: 'After',
  PROGRESS: 'ระหว่างดำเนินการ',
  OTHER: 'อื่นๆ',
}

const IMAGE_TYPE_STYLE: Record<ReportImageType, string> = {
  BEFORE: 'bg-blue-100 text-blue-700',
  AFTER: 'bg-green-100 text-green-700',
  PROGRESS: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const IMAGE_TYPE_OPTIONS: { value: ReportImageType; label: string }[] = [
  { value: 'BEFORE', label: 'Before — สภาพก่อนดำเนินการ' },
  { value: 'PROGRESS', label: 'ระหว่างดำเนินการ' },
  { value: 'AFTER', label: 'After — สภาพหลังดำเนินการ' },
  { value: 'OTHER', label: 'อื่นๆ' },
]

// ─── Image Upload Modal ──────────────────────────────────────────────────────

interface ImageUploadModalProps {
  itemId: number
  reportId: number
  onClose: () => void
}

function ImageUploadModal({ itemId, reportId, onClose }: ImageUploadModalProps) {
  const { success, error: toastError } = useToast()
  const addImage = useAddReportImage(reportId)
  const fileRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<
    { file: File; preview: string; caption: string; imageType: ReportImageType }[]
  >([])
  const [imageType, setImageType] = useState<ReportImageType>('PROGRESS')
  const [caption, setCaption] = useState('')
  const [dragging, setDragging] = useState(false)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const next = Array.from(incoming)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        caption,
        imageType,
      }))
    setFiles((prev) => [...prev, ...next])
  }

  function removeFile(idx: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function updateFile(
    idx: number,
    patch: Partial<{ caption: string; imageType: ReportImageType }>,
  ) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  async function handleUpload() {
    if (files.length === 0) return toastError('กรุณาเลือกรูปภาพอย่างน้อย 1 รูป')
    try {
      await Promise.all(
        files.map((f) =>
          addImage.mutateAsync({
            itemId,
            file: f.file,
            caption: f.caption || undefined,
            imageType: f.imageType,
          }),
        ),
      )
      success(`อัปโหลด ${files.length} รูปสำเร็จ`)
      onClose()
    } catch {
      toastError('อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง')
    }
  }

  return (
    <FormModal
      open
      onClose={onClose}
      title="เพิ่มรูปภาพ"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{files.length} รูปที่เลือก</p>
          <div className="flex gap-2">
            <Button variant="ghost" icon={X} onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Upload}
              onClick={handleUpload}
              loading={addImage.isPending}
              disabled={files.length === 0}
            >
              อัปโหลด
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Default type + caption applied to newly picked files */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="ประเภทรูปภาพ (default)"
            options={IMAGE_TYPE_OPTIONS}
            value={imageType}
            onChange={(e) => setImageType(e.target.value as ReportImageType)}
          />
          <Input
            label="Caption (default)"
            placeholder="คำอธิบาย..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        {/* Drop zone */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
            dragging
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-300'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
        >
          <Camera className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500">คลิกหรือลากรูปมาวางที่นี่</p>
          <p className="text-xs text-gray-400">รองรับ JPG, PNG, WEBP (สูงสุด 10 MB ต่อรูป)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* Preview list */}
        {files.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">แก้ไข caption และประเภทของแต่ละรูป</p>
            {files.map((f, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                {/* Thumbnail */}
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-red-600"
                    onClick={() => removeFile(idx)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {/* Inputs */}
                <div className="flex flex-1 flex-col gap-2">
                  <p className="truncate text-xs text-gray-400">{f.file.name}</p>
                  <Select
                    options={IMAGE_TYPE_OPTIONS}
                    value={f.imageType}
                    onChange={(e) =>
                      updateFile(idx, { imageType: e.target.value as ReportImageType })
                    }
                  />
                  <Input
                    placeholder="Caption..."
                    value={f.caption}
                    onChange={(e) => updateFile(idx, { caption: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormModal>
  )
}

// ─── Image Gallery ───────────────────────────────────────────────────────────

interface ImageGalleryProps {
  images: DailyReportImage[]
  reportId: number
  canEdit: boolean
}

function ImageGallery({ images, reportId, canEdit }: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<DailyReportImage | null>(null)
  const deleteImage = useDeleteReportImage(reportId)
  const { error: toastError } = useToast()

  if (images.length === 0) return null

  const grouped = IMAGE_TYPE_OPTIONS.reduce<Record<ReportImageType, DailyReportImage[]>>(
    (acc, opt) => {
      acc[opt.value] = images.filter((img) => img.imageType === opt.value)
      return acc
    },
    { BEFORE: [], PROGRESS: [], AFTER: [], OTHER: [] },
  )

  const hasBeforeAfter = grouped.BEFORE.length > 0 || grouped.AFTER.length > 0

  return (
    <div className="mt-3 space-y-3">
      {/* Before / After side-by-side when both exist */}
      {hasBeforeAfter && (
        <div className="grid grid-cols-2 gap-3">
          {(['BEFORE', 'AFTER'] as ReportImageType[]).map((type) => (
            <div key={type}>
              <p
                className={`mb-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${IMAGE_TYPE_STYLE[type]}`}
              >
                {IMAGE_TYPE_LABEL[type]}
              </p>
              {grouped[type].length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400">
                  ไม่มีรูป
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {grouped[type].map((img) => (
                    <ImageThumb
                      key={img.id}
                      img={img}
                      canEdit={canEdit}
                      onZoom={setLightbox}
                      onDelete={() => deleteImage.mutateAsync(img.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress + Other rows */}
      {(['PROGRESS', 'OTHER'] as ReportImageType[]).map((type) =>
        grouped[type].length === 0 ? null : (
          <div key={type}>
            <p
              className={`mb-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${IMAGE_TYPE_STYLE[type]}`}
            >
              {IMAGE_TYPE_LABEL[type]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grouped[type].map((img) => (
                <ImageThumb
                  key={img.id}
                  img={img}
                  canEdit={canEdit}
                  onZoom={setLightbox}
                  onDelete={() => deleteImage.mutateAsync(img.id)}
                />
              ))}
            </div>
          </div>
        ),
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[80vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={lightbox.caption ?? ''}
              className="max-h-[75vh] max-w-full rounded-xl object-contain"
            />
            {(lightbox.caption || lightbox.imageType) && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${IMAGE_TYPE_STYLE[lightbox.imageType]}`}
                >
                  {IMAGE_TYPE_LABEL[lightbox.imageType]}
                </span>
                {lightbox.caption && <p className="text-sm text-gray-200">{lightbox.caption}</p>}
              </div>
            )}
          </div>
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

interface ImageThumbProps {
  img: DailyReportImage
  canEdit: boolean
  onZoom: (img: DailyReportImage) => void
  onDelete: () => void
}

function ImageThumb({ img, canEdit, onZoom, onDelete }: ImageThumbProps) {
  return (
    <div className="group relative">
      <div className="relative h-20 w-20 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.imageUrl} alt={img.caption ?? ''} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="rounded p-1 text-white" onClick={() => onZoom(img)}>
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {canEdit && (
            <button className="rounded p-1 text-red-300 hover:text-red-200" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Type badge overlay */}
      <span
        className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${IMAGE_TYPE_STYLE[img.imageType]}`}
      >
        {img.imageType === 'BEFORE'
          ? 'B'
          : img.imageType === 'AFTER'
            ? 'A'
            : img.imageType === 'PROGRESS'
              ? 'P'
              : '—'}
      </span>
      {img.caption && (
        <p className="mt-0.5 w-20 truncate text-center text-[10px] text-gray-400">{img.caption}</p>
      )}
    </div>
  )
}

// ─── Add / Edit Item Form ────────────────────────────────────────────────────

interface ItemFormProps {
  reportId: number
  item?: DailyReportItem
  onClose: () => void
}

function ItemForm({ reportId, item, onClose }: ItemFormProps) {
  const { data: categories = [] } = useWorkCategories()
  const { success, error: toastError } = useToast()
  const addItem = useAddReportItem(reportId)
  const updateItem = useUpdateReportItem(reportId)

  const [categoryId, setCategoryId] = useState(item?.categoryId ?? 0)
  const [description, setDescription] = useState(item?.description ?? '')
  const [progress, setProgress] = useState(item?.progress ?? 0)
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ?? '')
  const [status, setStatus] = useState<'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'>(
    item?.status ?? 'IN_PROGRESS',
  )

  async function handleSubmit() {
    if (!categoryId || !description.trim()) return toastError('กรุณากรอกข้อมูลให้ครบ')
    const payload = {
      categoryId,
      description: description.trim(),
      progress: Number(progress),
      unit: unit.trim() || undefined,
      quantity: quantity ? Number(quantity) : undefined,
      status,
    }
    try {
      if (item) {
        await updateItem.mutateAsync({ itemId: item.id, ...payload })
        success('แก้ไขรายการงานสำเร็จ')
      } else {
        await addItem.mutateAsync(payload)
        success('เพิ่มรายการงานสำเร็จ')
      }
      onClose()
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const categoryOptions = [
    { value: '', label: '— เลือกหมวดงาน —' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ]
  const statusOptions = [
    { value: 'PLANNED', label: 'วางแผน' },
    { value: 'IN_PROGRESS', label: 'กำลังทำ' },
    { value: 'COMPLETED', label: 'เสร็จแล้ว' },
  ]

  return (
    <FormModal
      open
      onClose={onClose}
      title={item ? 'แก้ไขรายการงาน' : 'เพิ่มรายการงาน'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={item ? Pencil : Plus}
            onClick={handleSubmit}
            loading={addItem.isPending || updateItem.isPending}
          >
            {item ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label="หมวดงาน"
          required
          options={categoryOptions}
          value={String(categoryId)}
          onChange={(e) => setCategoryId(Number(e.target.value))}
        />
        <Textarea
          label="รายละเอียดงาน"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="ความคืบหน้า (%)"
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
          />
          <Select
            label="สถานะ"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="หน่วย"
            placeholder="เช่น ตร.ม., เมตร"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <Input
            label="ปริมาณ"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      </div>
    </FormModal>
  )
}

// ─── Add / Edit Issue Form ───────────────────────────────────────────────────

interface IssueFormProps {
  reportId: number
  issue?: DailyReportIssue
  onClose: () => void
}

function IssueForm({ reportId, issue, onClose }: IssueFormProps) {
  const { success, error: toastError } = useToast()
  const addIssue = useAddReportIssue(reportId)
  const updateIssue = useUpdateReportIssue(reportId)

  const [text, setText] = useState(issue?.issue ?? '')
  const [impact, setImpact] = useState(issue?.impact ?? '')
  const [solution, setSolution] = useState(issue?.solution ?? '')
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>(
    issue?.severity ?? 'MEDIUM',
  )
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>(issue?.status ?? 'OPEN')

  async function handleSubmit() {
    if (!text.trim()) return toastError('กรุณากรอกรายละเอียดปัญหา')
    const base = {
      issue: text.trim(),
      impact: impact.trim() || undefined,
      solution: solution.trim() || undefined,
      severity,
    }
    try {
      if (issue) {
        await updateIssue.mutateAsync({ issueId: issue.id, ...base, status })
        success('แก้ไขปัญหาสำเร็จ')
      } else {
        await addIssue.mutateAsync(base)
        success('เพิ่มปัญหาสำเร็จ')
      }
      onClose()
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  return (
    <FormModal
      open
      onClose={onClose}
      title={issue ? 'แก้ไขปัญหา' : 'เพิ่มปัญหา'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={issue ? Pencil : Plus}
            onClick={handleSubmit}
            loading={addIssue.isPending || updateIssue.isPending}
          >
            {issue ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Textarea
          label="ปัญหา / อุปสรรค"
          required
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Textarea
          label="ผลกระทบ"
          rows={2}
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
        />
        <Textarea
          label="แนวทางแก้ไข"
          rows={2}
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="ระดับความรุนแรง"
            options={[
              { value: 'LOW', label: 'ต่ำ' },
              { value: 'MEDIUM', label: 'ปานกลาง' },
              { value: 'HIGH', label: 'สูง' },
              { value: 'CRITICAL', label: 'วิกฤต' },
            ]}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
          />
          {issue && (
            <Select
              label="สถานะ"
              options={[
                { value: 'OPEN', label: 'เปิด' },
                { value: 'RESOLVED', label: 'แก้ไขแล้ว' },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'OPEN' | 'RESOLVED')}
            />
          )}
        </div>
      </div>
    </FormModal>
  )
}

// ─── Work Item Card ──────────────────────────────────────────────────────────

interface ItemCardProps {
  item: DailyReportItem
  reportId: number
  canEdit: boolean
}

function ItemCard({ item, reportId, canEdit }: ItemCardProps) {
  const { success, error: toastError } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const deleteItem = useDeleteReportItem(reportId)

  async function handleDeleteItem() {
    try {
      await deleteItem.mutateAsync(item.id)
      success('ลบรายการงานสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: item.category.color ?? '#94a3b8' }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-gray-400">{item.category.name}</span>
                <p className="mt-0.5 text-sm font-medium text-gray-800">{item.description}</p>
              </div>
              {canEdit && (
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    className="rounded p-1 text-gray-400 hover:text-primary-600"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar + status */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-gray-500">{item.progress}%</span>
              <Badge variant={ITEM_STATUS_VARIANT[item.status]}>
                {ITEM_STATUS_LABEL[item.status]}
              </Badge>
            </div>

            {(item.unit || item.quantity) && (
              <p className="mt-1 text-xs text-gray-400">
                {item.quantity && `${item.quantity} `}
                {item.unit}
              </p>
            )}

            {/* Image gallery */}
            <ImageGallery images={item.images} reportId={reportId} canEdit={canEdit} />

            {/* Add photo button */}
            {canEdit && (
              <button
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                onClick={() => setUploadOpen(true)}
              >
                <Camera className="h-3.5 w-3.5" />
                เพิ่มรูปภาพ {item.images.length > 0 && `(${item.images.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {editOpen && <ItemForm reportId={reportId} item={item} onClose={() => setEditOpen(false)} />}
      {deleteOpen && (
        <ConfirmModal
          open
          title="ลบรายการงาน"
          description={`ต้องการลบ "${item.description}" ใช่หรือไม่?`}
          confirmLabel="ลบ"
          loading={deleteItem.isPending}
          onConfirm={handleDeleteItem}
          onClose={() => setDeleteOpen(false)}
        />
      )}
      {uploadOpen && (
        <ImageUploadModal
          itemId={item.id}
          reportId={reportId}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </>
  )
}

// ─── Main Detail Modal ───────────────────────────────────────────────────────

interface Props {
  reportId: number
  onClose: () => void
}

export function ReportDetailModal({ reportId, onClose }: Props) {
  const { data: report, isLoading } = useDailyReport(reportId)
  const { success, error: toastError } = useToast()
  const publishMutation = usePublishDailyReport()

  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addIssueOpen, setAddIssueOpen] = useState(false)
  const [editIssue, setEditIssue] = useState<DailyReportIssue | null>(null)
  const deleteIssue = useDeleteReportIssue(reportId)

  const canEdit = report?.status === 'DRAFT'

  async function handlePublish() {
    try {
      await publishMutation.mutateAsync(reportId)
      success('เผยแพร่รายงานสำเร็จ')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const title = report
    ? `รายงาน ${new Date(report.reportDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : 'รายงานประจำวัน'

  return (
    <>
      <FormModal
        open
        onClose={onClose}
        title={title}
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 text-xs text-gray-400">
              {report?.createdBy && `สร้างโดย: ${report.createdBy.name}`}
            </div>
            <div className="flex flex-shrink-0 gap-2">
              {canEdit && report && (
                <Button
                  variant="primary"
                  icon={Send}
                  loading={publishMutation.isPending}
                  onClick={handlePublish}
                >
                  เผยแพร่
                </Button>
              )}
              <Button variant="ghost" icon={X} onClick={onClose}>
                ปิด
              </Button>
            </div>
          </div>
        }
      >
        {isLoading || !report ? (
          <div className="py-12 text-center text-sm text-gray-400">กำลังโหลด...</div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-4 rounded-xl bg-gray-50 p-4 text-sm">
              <div>
                <span className="text-xs text-gray-400">สภาพอากาศ</span>
                <p className="font-medium">
                  {report.weather ? WEATHER_LABEL[report.weather] : '—'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">ความคืบหน้ารวม</span>
                <p className="font-medium">{report.overallProgress}%</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">สถานะ</span>
                <p className="mt-0.5">
                  <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'warning'}>
                    {report.status === 'PUBLISHED' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                  </Badge>
                </p>
              </div>
              {report.nextPlan && (
                <div className="w-full">
                  <span className="text-xs text-gray-400">แผนงานวันต่อไป</span>
                  <p className="whitespace-pre-wrap text-gray-700">{report.nextPlan}</p>
                </div>
              )}
            </div>

            <Tabs defaultValue="items">
              <TabList>
                <Tab value="items" badge={report.items.length}>
                  รายการงาน
                </Tab>
                <Tab value="issues" badge={report.issues.length}>
                  ปัญหา
                </Tab>
              </TabList>

              <TabPanel value="items">
                <div className="space-y-3">
                  {report.items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีรายการงาน</p>
                  ) : (
                    report.items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        reportId={reportId}
                        canEdit={canEdit ?? false}
                      />
                    ))
                  )}
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Plus}
                      onClick={() => setAddItemOpen(true)}
                    >
                      เพิ่มรายการงาน
                    </Button>
                  )}
                </div>
              </TabPanel>

              <TabPanel value="issues">
                <div className="space-y-3">
                  {report.issues.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">ไม่พบปัญหา</p>
                  ) : (
                    report.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                                issue.severity === 'CRITICAL' || issue.severity === 'HIGH'
                                  ? 'text-red-500'
                                  : issue.severity === 'MEDIUM'
                                    ? 'text-yellow-500'
                                    : 'text-gray-400'
                              }`}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{issue.issue}</p>
                              <div className="mt-1 flex gap-2">
                                <Badge variant={SEVERITY_VARIANT[issue.severity]}>
                                  {SEVERITY_LABEL[issue.severity]}
                                </Badge>
                                <Badge variant={issue.status === 'RESOLVED' ? 'success' : 'danger'}>
                                  {issue.status === 'RESOLVED' ? 'แก้ไขแล้ว' : 'เปิด'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                className="rounded p-1 text-gray-400 hover:text-primary-600"
                                onClick={() => setEditIssue(issue)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="rounded p-1 text-gray-400 hover:text-red-500"
                                onClick={() => deleteIssue.mutateAsync(issue.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {issue.impact && (
                          <p className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">ผลกระทบ:</span> {issue.impact}
                          </p>
                        )}
                        {issue.solution && (
                          <p className="mt-1 text-xs text-gray-500">
                            <span className="font-medium">แนวทางแก้ไข:</span> {issue.solution}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Plus}
                      onClick={() => setAddIssueOpen(true)}
                    >
                      เพิ่มปัญหา
                    </Button>
                  )}
                </div>
              </TabPanel>
            </Tabs>
          </div>
        )}
      </FormModal>

      {addItemOpen && <ItemForm reportId={reportId} onClose={() => setAddItemOpen(false)} />}
      {addIssueOpen && <IssueForm reportId={reportId} onClose={() => setAddIssueOpen(false)} />}
      {editIssue && (
        <IssueForm reportId={reportId} issue={editIssue} onClose={() => setEditIssue(null)} />
      )}
    </>
  )
}
