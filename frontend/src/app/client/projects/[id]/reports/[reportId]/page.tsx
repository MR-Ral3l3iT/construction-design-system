'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Clock, X, Download, Loader2 } from 'lucide-react'
import { useClientReport } from '@/hooks/useClientProjects'
import type { ClientReportImage } from '@/hooks/useClientProjects'
import { downloadFile } from '@/lib/downloadFile'

const WEATHER_LABEL: Record<string, string> = {
  SUNNY: '☀️ แดดจัด',
  PARTLY_CLOUDY: '🌤 มีเมฆบ้าง',
  CLOUDY: '☁️ ครึ้ม',
  RAINY: '🌧 ฝนตก',
  HEAVY_RAIN: '🌧🌧 ฝนหนัก',
  STORMY: '⛈ พายุ',
}

const ITEM_STATUS_COLOR: Record<string, string> = {
  DONE: 'text-green-600',
  IN_PROGRESS: 'text-primary-600',
  PENDING: 'text-gray-400',
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  DONE: 'เสร็จแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  PENDING: 'รอดำเนินการ',
}

const IMAGE_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  BEFORE: { label: 'ก่อน', color: 'bg-orange-100 text-orange-600' },
  PROGRESS: { label: 'ระหว่างดำเนินการ', color: 'bg-blue-100 text-blue-600' },
  AFTER: { label: 'หลัง', color: 'bg-green-100 text-green-600' },
}

type LightboxItem = { src: string; filename: string }

function dateDisplay(d: string) {
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function timeStr(d: string) {
  return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function imageFilename(img: ClientReportImage): string {
  if (img.caption) return img.caption.replace(/[^a-zA-Z0-9ก-๙\-_.]/g, '_') + '.jpg'
  if (img.storageKey) return img.storageKey.split('/').pop() ?? 'image.jpg'
  return `image-${img.id}.jpg`
}

function DownloadButton({
  url,
  filename,
  dark = false,
}: {
  url: string
  filename: string
  dark?: boolean
}) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setLoading(true)
        downloadFile(url, filename).finally(() => setLoading(false))
      }}
      disabled={loading}
      className={`flex items-center justify-center rounded-full p-1.5 transition-opacity disabled:opacity-60 ${
        dark
          ? 'bg-black/50 text-white active:bg-black/70'
          : 'bg-white/80 text-gray-700 shadow active:bg-white'
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function ImageGallery({
  images,
  onOpen,
}: {
  images: ClientReportImage[]
  onOpen: (item: LightboxItem) => void
}) {
  const groups = ['BEFORE', 'PROGRESS', 'AFTER'] as const
  const hasImages = groups.some((t) => images.some((i) => i.imageType === t))
  if (!hasImages) return null

  return (
    <div className="space-y-3 pt-2">
      {groups.map((type) => {
        const imgs = images.filter((i) => i.imageType === type)
        if (!imgs.length) return null
        const cfg = IMAGE_TYPE_LABEL[type]
        return (
          <div key={type}>
            <span
              className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imgs.map((img) => (
                <div key={img.id} className="relative h-24 w-24 shrink-0">
                  <button
                    onClick={() => onOpen({ src: img.imageUrl, filename: imageFilename(img) })}
                    className="h-full w-full overflow-hidden rounded-xl bg-gray-100 active:opacity-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.imageUrl}
                      alt={img.caption ?? ''}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-0.5">
                        <p className="truncate text-[9px] text-white">{img.caption}</p>
                      </div>
                    )}
                  </button>
                  {/* Download overlay — bottom right */}
                  <div className="absolute bottom-1.5 right-1.5">
                    <DownloadButton url={img.imageUrl} filename={imageFilename(img)} dark />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ReportDetailPage() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>()
  const projectId = Number(id)
  const rId = Number(reportId)
  const router = useRouter()
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null)

  const { data: report, isLoading } = useClientReport(projectId, rId)

  return (
    <>
      <div className="flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-primary-900/60 px-4 py-3 backdrop-blur-md">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/50">รายงานประจำวัน</p>
            {report && (
              <p className="truncate text-sm font-semibold text-white">
                {dateDisplay(report.reportDate)}
              </p>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        )}

        {/* Content */}
        {report && (
          <div className="space-y-3 p-4">
            {/* Summary card */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 bg-primary-50 px-4 py-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {dateDisplay(report.reportDate)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    {report.weather && (
                      <span>{WEATHER_LABEL[report.weather] ?? report.weather}</span>
                    )}
                    {report.createdBy?.name && <span>โดย {report.createdBy.name}</span>}
                    {report.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        อัปเดต {timeStr(report.publishedAt)} น.
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-primary-500" />
                    <span className="text-2xl font-bold text-primary-600">
                      {report.overallProgress}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">ภาพรวม</p>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${report.overallProgress}%` }}
                />
              </div>
            </div>

            {/* Work items */}
            {report.items.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  รายการงาน ({report.items.length} รายการ)
                </p>
                {report.items.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-50 px-4 py-3">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.category.color ?? '#94a3b8' }}
                      />
                      <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {item.category.name}
                      </p>
                      <span
                        className={`text-xs font-bold ${ITEM_STATUS_COLOR[item.status] ?? 'text-gray-500'}`}
                      >
                        {ITEM_STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-3">
                      <p className="text-sm leading-relaxed text-gray-800">{item.description}</p>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-gray-400">ความคืบหน้า</span>
                          <span className="font-bold text-primary-600">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-primary-400 transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>

                      {(item.quantity || item.unit) && (
                        <p className="text-xs text-gray-400">
                          ปริมาณ: {item.quantity} {item.unit}
                        </p>
                      )}

                      {item.images?.length > 0 && (
                        <ImageGallery images={item.images} onOpen={setLightbox} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {report.nextPlan && (
              <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  แผนงานถัดไป
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{report.nextPlan}</p>
              </div>
            )}

            {report.issueSummary && (
              <div className="rounded-2xl bg-red-50 px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
                  ปัญหา / อุปสรรค
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-red-700">{report.issueSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          {/* Top-right actions */}
          <div
            className="absolute right-4 flex items-center gap-2"
            style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
          >
            <DownloadButton url={lightbox.src} filename={lightbox.filename} dark />
            <button
              onClick={() => setLightbox(null)}
              className="flex items-center justify-center rounded-full bg-black/50 p-2 text-white active:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
