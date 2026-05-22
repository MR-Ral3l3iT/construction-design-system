'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Calendar,
  Building2,
  ChevronRight,
  ClipboardList,
  Clock,
  X,
  Download,
  Loader2,
  User,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useClientProject, useClientLatestReport } from '@/hooks/useClientProjects'
import type { ClientReportImage } from '@/hooks/useClientProjects'
import { downloadFile } from '@/lib/downloadFile'

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ (DS)',
  CONSTRUCTION: 'ก่อสร้าง (CN)',
  TURNKEY: 'ออกแบบ + ก่อสร้าง (DC)',
}

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

const IMAGE_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  BEFORE: { label: 'ก่อน', color: 'bg-orange-100 text-orange-600' },
  AFTER: { label: 'หลัง', color: 'bg-green-100 text-green-600' },
  PROGRESS: { label: 'ระหว่างดำเนินการ', color: 'bg-blue-100 text-blue-600' },
}

type LightboxItem = { src: string; filename: string }

function imageFilename(img: ClientReportImage): string {
  if (img.caption) return img.caption.replace(/[^a-zA-Z0-9ก-๙\-_.]/g, '_') + '.jpg'
  if (img.storageKey) return img.storageKey.split('/').pop() ?? 'image.jpg'
  return `image-${img.id}.jpg`
}

function DownloadButton({ url, filename }: { url: string; filename: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setLoading(true)
        downloadFile(url, filename).finally(() => setLoading(false))
      }}
      disabled={loading}
      className="flex items-center justify-center rounded-full bg-black/50 p-1.5 text-white active:bg-black/70 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-50 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function dateStr(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function timeStr(d: string) {
  return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export default function ClientOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { data: project, isLoading } = useClientProject(projectId)
  const { data: latestReport } = useClientLatestReport(projectId)
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null)

  if (isLoading || !project) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 p-4">
        {/* Project Header */}
        <div className="rounded-2xl bg-white/15 px-5 py-5 text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-white/50">{project.code}</p>
              <h1 className="mt-0.5 text-xl font-bold leading-tight">{project.name}</h1>
              <p className="mt-1 text-sm text-white/60">
                {TYPE_LABEL[project.type] ?? project.type}
              </p>
            </div>
            <StatusBadge status={project.status} />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-white/60">ความคืบหน้าโดยรวม</span>
              <span className="font-bold text-white">{project.progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/80 transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Latest Daily Report */}
        {latestReport ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Report header */}
            <div className="flex items-start justify-between gap-3 bg-primary-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
                  <ClipboardList className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">
                    รายงานล่าสุด
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {dateStr(latestReport.reportDate)}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-primary-600">
                  {latestReport.overallProgress}%
                </p>
                <p className="text-[10px] text-gray-400">ภาพรวม</p>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {/* Meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-gray-400">
                {latestReport.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    อัปเดต {timeStr(latestReport.publishedAt)} น.
                  </span>
                )}
                {latestReport.weather && (
                  <span>{WEATHER_LABEL[latestReport.weather] ?? latestReport.weather}</span>
                )}
                {latestReport.createdBy?.name && <span>โดย {latestReport.createdBy.name}</span>}
              </div>

              {/* Overall progress bar */}
              <div className="px-4 py-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${latestReport.overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Work items */}
              {(latestReport.items?.length ?? 0) > 0 && (
                <div className="divide-y divide-gray-50">
                  {latestReport.items?.map((item) => (
                    <div key={item.id} className="px-4 py-3 space-y-2">
                      {/* Category + status */}
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.category.color ?? '#94a3b8' }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {item.category.name}
                        </span>
                        <span
                          className={`ml-auto text-xs font-bold ${ITEM_STATUS_COLOR[item.status] ?? 'text-gray-500'}`}
                        >
                          {item.progress}%
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-800">{item.description}</p>

                      {/* Item progress bar */}
                      <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary-400 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>

                      {/* Images grouped by type */}
                      {item.images?.length > 0 &&
                        (() => {
                          const groups = ['BEFORE', 'PROGRESS', 'AFTER'] as const
                          return (
                            <div className="space-y-2">
                              {groups.map((type) => {
                                const imgs = item.images.filter((i) => i.imageType === type)
                                if (!imgs.length) return null
                                const cfg = IMAGE_TYPE_LABEL[type]
                                return (
                                  <div key={type}>
                                    <span
                                      className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}
                                    >
                                      {cfg.label}
                                    </span>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                      {imgs.map((img) => (
                                        <div key={img.id} className="relative h-20 w-20 shrink-0">
                                          <button
                                            onClick={() =>
                                              setLightbox({
                                                src: img.imageUrl,
                                                filename: imageFilename(img),
                                              })
                                            }
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
                                                <p className="truncate text-[9px] text-white">
                                                  {img.caption}
                                                </p>
                                              </div>
                                            )}
                                          </button>
                                          <div className="absolute bottom-1 right-1">
                                            <DownloadButton
                                              url={img.imageUrl}
                                              filename={imageFilename(img)}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Next plan */}
              {latestReport.nextPlan && (
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    แผนงานถัดไป
                  </p>
                  <p className="text-sm text-gray-700">{latestReport.nextPlan}</p>
                </div>
              )}

              {/* Link */}
              <Link
                href={`/client/projects/${id}/reports`}
                className="flex items-center justify-center gap-1 py-3 text-xs font-medium text-primary-600"
              >
                ดูรายงานทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <Section title="รายงานล่าสุด">
            <div className="flex flex-col items-center py-6 text-center">
              <ClipboardList className="h-8 w-8 text-gray-200" />
              <p className="mt-2 text-sm text-gray-400">ยังไม่มีรายงาน</p>
            </div>
          </Section>
        )}

        {/* Key Info */}
        <Section title="ข้อมูลโครงการ">
          <div className="space-y-3">
            {project.customer && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] text-gray-400">เจ้าของโครงการ</p>
                  <p className="text-sm font-medium text-gray-700">
                    {project.customer.companyName ?? project.customer.name}
                  </p>
                </div>
              </div>
            )}
            {(project.addressLine || project.province) && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {[project.addressLine, project.district, project.province]
                    .filter(Boolean)
                    .join(' ')}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {project.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400">เริ่มต้น</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(project.startDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400">กำหนดเสร็จ</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(project.endDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {(project.budgetMin || project.budgetMax) && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-[10px] text-gray-400">งบประมาณ</p>
                  <p className="text-sm font-medium text-gray-700">
                    {project.budgetMin ? `฿${Number(project.budgetMin).toLocaleString()}` : ''}
                    {project.budgetMin && project.budgetMax ? ' – ' : ''}
                    {project.budgetMax ? `฿${Number(project.budgetMax).toLocaleString()}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Team */}
        {project.members && project.members.length > 0 && (
          <Section title="ทีมงาน">
            <div className="space-y-2.5">
              {project.members.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                    {m.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{m.user.name}</p>
                    {m.roleName && <p className="text-xs text-gray-400">{m.roleName}</p>}
                  </div>
                  {m.user.phone && (
                    <a href={`tel:${m.user.phone}`} className="text-xs text-primary-600 underline">
                      {m.user.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <div
            className="absolute right-4 flex items-center gap-2"
            style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
          >
            <DownloadButton url={lightbox.src} filename={lightbox.filename} />
            <button
              className="flex items-center justify-center rounded-full bg-black/50 p-2 text-white active:bg-black/70"
              onClick={() => setLightbox(null)}
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
