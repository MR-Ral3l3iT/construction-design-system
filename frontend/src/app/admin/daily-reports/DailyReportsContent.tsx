'use client'

import { useState } from 'react'
import { Eye, FileText, Pencil, Plus, Send, Trash2, X, Save } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Pagination,
  Select,
  Table,
  Textarea,
} from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingState } from '@/components/shared/LoadingState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useToast } from '@/providers/toast-provider'
import {
  useDailyReports,
  useCreateDailyReport,
  useUpdateDailyReport,
  usePublishDailyReport,
  useDeleteDailyReport,
  type DailyReport,
} from '@/hooks/useDailyReports'
import { ReportDetailModal } from './ReportDetailModal'

// ─── Constants ──────────────────────────────────────────────────────────────

const WEATHER_OPTIONS = [
  { value: '', label: '— เลือกสภาพอากาศ —' },
  { value: 'SUNNY', label: '☀️ แดดจัด' },
  { value: 'PARTLY_CLOUDY', label: '🌤 มีเมฆบ้าง' },
  { value: 'CLOUDY', label: '☁️ ครึ้ม' },
  { value: 'RAINY', label: '🌧 ฝนตก' },
  { value: 'HEAVY_RAIN', label: '🌧🌧 ฝนหนัก' },
  { value: 'STORMY', label: '⛈ พายุ' },
]

const WEATHER_LABEL: Record<string, string> = {
  SUNNY: '☀️ แดดจัด',
  PARTLY_CLOUDY: '🌤 มีเมฆบ้าง',
  CLOUDY: '☁️ ครึ้ม',
  RAINY: '🌧 ฝนตก',
  HEAVY_RAIN: '🌧🌧 ฝนหนัก',
  STORMY: '⛈ พายุ',
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'DRAFT', label: 'ฉบับร่าง' },
  { value: 'PUBLISHED', label: 'เผยแพร่แล้ว' },
]

// ─── Report Form Modal ──────────────────────────────────────────────────────

interface ReportFormProps {
  projectId: number
  report?: DailyReport
  onClose: () => void
}

function ReportForm({ projectId, report, onClose }: ReportFormProps) {
  const { success, error: toastError } = useToast()
  const createMutation = useCreateDailyReport()
  const updateMutation = useUpdateDailyReport(report?.id ?? 0)

  const [reportDate, setReportDate] = useState(
    report ? report.reportDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  )
  const [weather, setWeather] = useState(report?.weather ?? '')
  const [overallProgress, setOverallProgress] = useState(report?.overallProgress ?? 0)
  const [nextPlan, setNextPlan] = useState(report?.nextPlan ?? '')
  const [issueSummary, setIssueSummary] = useState(report?.issueSummary ?? '')

  async function handleSubmit() {
    if (!reportDate) return toastError('กรุณาเลือกวันที่')
    const payload = {
      reportDate,
      weather: weather || undefined,
      overallProgress: Number(overallProgress),
      nextPlan: nextPlan.trim() || undefined,
      issueSummary: issueSummary.trim() || undefined,
    }
    try {
      if (report) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขรายงานสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('สร้างรายงานสำเร็จ')
      }
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <FormModal
      open
      onClose={onClose}
      title={report ? 'แก้ไขรายงาน' : 'สร้างรายงานประจำวัน'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={report ? Save : Plus}
            onClick={handleSubmit}
            loading={isPending}
          >
            {report ? 'บันทึก' : 'สร้าง'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="วันที่"
          type="date"
          required
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="สภาพอากาศ"
            options={WEATHER_OPTIONS}
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
          />
          <Input
            label="ความคืบหน้ารวม (%)"
            type="number"
            min={0}
            max={100}
            value={overallProgress}
            onChange={(e) => setOverallProgress(Number(e.target.value))}
          />
        </div>
        <Textarea
          label="แผนงานวันต่อไป"
          rows={2}
          value={nextPlan}
          onChange={(e) => setNextPlan(e.target.value)}
        />
        <Textarea
          label="สรุปปัญหา"
          rows={2}
          value={issueSummary}
          onChange={(e) => setIssueSummary(e.target.value)}
        />
      </div>
    </FormModal>
  )
}

const PAGE_SIZE = 10

// ─── Main Content ──────────────────────────────────────────────────────────

interface Props {
  projectId: number
}

export function DailyReportsContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()

  const [month, setMonth] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DailyReport | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DailyReport | null>(null)

  const { data: reports = [], isLoading } = useDailyReports({
    projectId,
    month: month || undefined,
    status: statusFilter || undefined,
  })

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE))
  const paginated = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const publishMutation = usePublishDailyReport()
  const deleteMutation = useDeleteDailyReport()

  async function handlePublish(id: number) {
    try {
      await publishMutation.mutateAsync(id)
      success('เผยแพร่รายงานสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      success('ลบรายงานสำเร็จ')
      setDeleteTarget(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const columns = [
    {
      key: 'reportDate',
      header: 'วันที่',
      render: (r: DailyReport) => (
        <button className="text-left" onClick={() => setDetailId(r.id)}>
          <span className="font-medium text-primary-700">
            {new Date(r.reportDate).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </button>
      ),
    },
    {
      key: 'weather',
      header: 'สภาพอากาศ',
      render: (r: DailyReport) => (
        <span className="text-sm text-gray-600">{r.weather ? WEATHER_LABEL[r.weather] : '—'}</span>
      ),
    },
    {
      key: 'overallProgress',
      header: 'ความคืบหน้า',
      render: (r: DailyReport) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${r.overallProgress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{r.overallProgress}%</span>
        </div>
      ),
    },
    {
      key: 'counts',
      header: 'รายการ',
      render: (r: DailyReport) => (
        <span className="text-xs text-gray-500">
          {r._count?.items ?? r.items?.length ?? 0} งาน ·{' '}
          {r._count?.issues ?? r.issues?.length ?? 0} ปัญหา
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'ผู้รายงาน',
      render: (r: DailyReport) => (
        <span className="text-sm text-gray-600">{r.createdBy?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (r: DailyReport) => (
        <Badge variant={r.status === 'PUBLISHED' ? 'success' : 'warning'}>
          {r.status === 'PUBLISHED' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r: DailyReport) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          {r.status === 'DRAFT' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditTarget(r)
                  setFormOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                loading={publishMutation.isPending}
                onClick={() => handlePublish(r.id)}
              >
                เผยแพร่
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <Input
            type="month"
            placeholder="กรองตามเดือน"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value)
              setPage(1)
            }}
            className="w-44"
          />
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="w-40"
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          สร้างรายงาน
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="ยังไม่มีรายงานประจำวัน"
          description="บันทึกผลการทำงานในแต่ละวัน"
          action={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditTarget(null)
                setFormOpen(true)
              }}
            >
              สร้างรายงาน
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={paginated} keyExtractor={(r) => String(r.id)} />
          <div className="flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={reports.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Create/Edit modal */}
      {formOpen && (
        <ReportForm
          projectId={projectId}
          report={editTarget ?? undefined}
          onClose={() => {
            setFormOpen(false)
            setEditTarget(null)
          }}
        />
      )}

      {/* Detail modal */}
      {detailId && <ReportDetailModal reportId={detailId} onClose={() => setDetailId(null)} />}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          open
          title="ลบรายงาน"
          description={`ต้องการลบรายงานวันที่ ${new Date(deleteTarget.reportDate).toLocaleDateString('th-TH')} ใช่หรือไม่?`}
          confirmLabel="ลบ"
          loading={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
