'use client'

import Link from 'next/link'
import { useState } from 'react'
import { type LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Pencil,
  Play,
  Plus,
  Save,
  X,
} from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Pagination,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Table,
  Textarea,
} from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { FormModal } from '@/components/shared/FormModal'
import { FileAttachments } from '@/components/shared/FileAttachments'
import { ReportDetailModal } from '@/app/admin/daily-reports/ReportDetailModal'
import {
  useIssuesByProject,
  useCreateIssue,
  useUpdateIssue,
  useUpdateIssueStatus,
  type Issue,
} from '@/hooks/useIssues'
import { useFilesByIssue } from '@/hooks/useFiles'
import {
  useDailyReportIssuesByProject,
  type DailyReportIssueWithReport,
} from '@/hooks/useDailyReports'
import { useToast } from '@/providers/toast-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const PRIORITY_LABELS: Record<string, string> = {
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

const ISSUE_STATUS_ACTIONS: Record<
  string,
  { label: string; next: string; variant: 'primary' | 'outline' | 'danger'; icon: LucideIcon }[]
> = {
  OPEN: [{ label: 'รับทราบ', next: 'IN_PROGRESS', variant: 'primary', icon: Play }],
  IN_PROGRESS: [{ label: 'แก้ไขแล้ว', next: 'RESOLVED', variant: 'primary', icon: CheckCircle2 }],
  RESOLVED: [{ label: 'ปิด', next: 'CLOSED', variant: 'outline', icon: X }],
}

const schema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อปัญหา'),
  description: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ─── Issue Detail Modal ───────────────────────────────────────────────────────

function IssueDetail({
  issue,
  projectId,
  onClose,
}: {
  issue: Issue
  projectId: number
  onClose: () => void
}) {
  const { data: files = [] } = useFilesByIssue(issue.id)
  const isClosed = issue.status === 'CLOSED'
  return (
    <FormModal
      open
      onClose={onClose}
      title={issue.title}
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" icon={X} onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[issue.priority] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {PRIORITY_LABELS[issue.priority] ?? issue.priority}
          </span>
          <StatusBadge status={issue.status} />
          {issue.resolvedAt && (
            <span className="text-xs text-green-600">
              แก้ไขเมื่อ: {new Date(issue.resolvedAt).toLocaleDateString('th-TH')}
            </span>
          )}
        </div>
        {issue.description && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">รายละเอียด</p>
            <p className="whitespace-pre-wrap text-gray-800">{issue.description}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          {issue.dueDate && (
            <div>
              <p className="font-medium">กำหนดแก้ไข</p>
              <p>{new Date(issue.dueDate).toLocaleDateString('th-TH')}</p>
            </div>
          )}
          {issue.reportedBy && (
            <div>
              <p className="font-medium">ผู้รายงาน</p>
              <p>{issue.reportedBy.name}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          สร้างเมื่อ: {new Date(issue.createdAt).toLocaleDateString('th-TH')}
        </p>
        <div className="border-t pt-3">
          <FileAttachments
            files={files}
            projectId={projectId}
            entityId={issue.id}
            entityType="issue"
            category="ISSUE"
            readOnly={isClosed}
          />
        </div>
      </div>
    </FormModal>
  )
}

// ─── Daily Report Issues Tab ──────────────────────────────────────────────────

function DailyReportIssuesTab({
  projectId,
  issues,
  isLoading,
}: {
  projectId: number
  issues: DailyReportIssueWithReport[]
  isLoading: boolean
}) {
  const [openReportId, setOpenReportId] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(issues.length / PAGE_SIZE))
  const paginated = issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    {
      key: 'reportDate',
      header: 'วันที่รายงาน',
      render: (i: DailyReportIssueWithReport) => (
        <button
          className="text-left text-sm font-medium text-primary-700"
          onClick={() => setOpenReportId(i.report.id)}
        >
          {new Date(i.report.reportDate).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </button>
      ),
    },
    {
      key: 'issue',
      header: 'ปัญหา',
      render: (i: DailyReportIssueWithReport) => (
        <div>
          <p className="text-sm text-gray-800">{i.issue}</p>
          {i.impact && (
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">ผลกระทบ: {i.impact}</p>
          )}
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'ระดับ',
      render: (i: DailyReportIssueWithReport) => (
        <Badge variant={SEVERITY_VARIANT[i.severity]}>
          {PRIORITY_LABELS[i.severity] ?? i.severity}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (i: DailyReportIssueWithReport) => (
        <Badge variant={i.status === 'RESOLVED' ? 'success' : 'danger'}>
          {i.status === 'RESOLVED' ? 'แก้ไขแล้ว' : 'เปิด'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (i: DailyReportIssueWithReport) => (
        <Button
          variant="ghost"
          size="sm"
          icon={ExternalLink}
          onClick={() => setOpenReportId(i.report.id)}
        >
          ดูรายงาน
        </Button>
      ),
    },
  ]

  if (isLoading) return <LoadingState />

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">ปัญหาจากรายงานประจำวัน {issues.length} รายการ</p>
          <Link href={`/admin/daily-reports?projectId=${projectId}`}>
            <Button variant="outline" size="sm" icon={ExternalLink}>
              ไปหน้ารายงานประจำวัน
            </Button>
          </Link>
        </div>

        {issues.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="ไม่พบปัญหาจากรายงานประจำวัน"
            description="ปัญหาที่บันทึกในรายงานประจำวันจะแสดงที่นี่"
            action={
              <Link href={`/admin/daily-reports?projectId=${projectId}`}>
                <Button variant="outline" icon={ExternalLink}>
                  ไปหน้ารายงานประจำวัน
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <Table columns={columns} data={paginated} keyExtractor={(i) => String(i.id)} />
            <div className="flex justify-end">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={issues.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {openReportId && (
        <ReportDetailModal reportId={openReportId} onClose={() => setOpenReportId(null)} />
      )}
    </>
  )
}

// ─── Main Content ─────────────────────────────────────────────────────────────

interface Props {
  projectId: number
}

export function IssuesContent({ projectId }: Props) {
  const { success, error: toastError } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Issue | null>(null)
  const [detailTarget, setDetailTarget] = useState<Issue | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useIssuesByProject(projectId, page)
  const createMutation = useCreateIssue()
  const updateMutation = useUpdateIssue(editTarget?.id ?? 0, projectId)
  const statusMutation = useUpdateIssueStatus(projectId)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' },
  })

  function openCreate() {
    setEditTarget(null)
    reset({ title: '', description: '', priority: 'MEDIUM', dueDate: '' })
    setFormOpen(true)
  }

  function openEdit(issue: Issue) {
    setEditTarget(issue)
    reset({
      title: issue.title,
      description: issue.description ?? '',
      priority: issue.priority,
      dueDate: issue.dueDate?.slice(0, 10) ?? '',
    })
    setFormOpen(true)
  }

  async function onSubmit(values: FormData) {
    const payload = {
      ...values,
      dueDate: values.dueDate || undefined,
      description: values.description || undefined,
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync(payload)
        success('แก้ไขปัญหาสำเร็จ')
      } else {
        await createMutation.mutateAsync({ ...payload, projectId })
        success('บันทึกปัญหาสำเร็จ')
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await statusMutation.mutateAsync({ id, status })
      success('อัปเดตสถานะสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const issues = data?.data ?? []
  const meta = data?.meta

  const { data: dailyIssues = [], isLoading: dailyLoading } =
    useDailyReportIssuesByProject(projectId)

  const columns = [
    {
      key: 'priority',
      header: 'ระดับ',
      render: (i: Issue) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[i.priority] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {PRIORITY_LABELS[i.priority] ?? i.priority}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'ปัญหา',
      render: (i: Issue) => (
        <button className="text-left" onClick={() => setDetailTarget(i)}>
          <p className="font-medium text-primary-700">{i.title}</p>
          {i.description && <p className="line-clamp-1 text-xs text-gray-500">{i.description}</p>}
        </button>
      ),
    },
    {
      key: 'dueDate',
      header: 'กำหนดแก้ไข',
      render: (i: Issue) => (
        <span className="text-sm text-gray-600">
          {i.dueDate ? new Date(i.dueDate).toLocaleDateString('th-TH') : '-'}
        </span>
      ),
    },
    {
      key: 'reportedBy',
      header: 'ผู้รายงาน',
      render: (i: Issue) => (
        <span className="text-sm text-gray-600">{i.reportedBy?.name ?? '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (i: Issue) => <StatusBadge status={i.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (i: Issue) => {
        const actions = ISSUE_STATUS_ACTIONS[i.status] ?? []
        return (
          <div className="flex items-center justify-end gap-2">
            {actions.map(({ label, next, variant, icon }) => (
              <Button
                key={next}
                variant={variant}
                size="sm"
                icon={icon}
                loading={statusMutation.isPending}
                onClick={() => handleStatusChange(i.id, next)}
              >
                {label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setDetailTarget(i)}>
              <Eye className="h-4 w-4" />
            </Button>
            {(i.status === 'OPEN' || i.status === 'IN_PROGRESS') && (
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(i)}>
                แก้ไข
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <Tabs defaultValue="project">
        <TabList>
          <Tab value="project" badge={meta?.totalItems}>
            ปัญหาโครงการ
          </Tab>
          <Tab value="daily" badge={dailyIssues.length}>
            จากรายงานประจำวัน
          </Tab>
        </TabList>

        {/* ── Tab 1: Project Issues ── */}
        <TabPanel value="project">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">ปัญหาทั้งหมด {meta?.totalItems ?? 0} รายการ</p>
              <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
                เพิ่มปัญหา
              </Button>
            </div>

            {isLoading ? (
              <LoadingState />
            ) : issues.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="ไม่พบปัญหา"
                description="บันทึกปัญหาหรืออุปสรรคที่พบในโครงการ"
                action={
                  <Button variant="primary" icon={Plus} onClick={openCreate}>
                    เพิ่มปัญหา
                  </Button>
                }
              />
            ) : (
              <>
                <Table columns={columns} data={issues} keyExtractor={(i) => String(i.id)} />
                {meta && (
                  <div className="flex justify-end">
                    <Pagination
                      page={meta.page}
                      totalPages={meta.totalPages}
                      totalItems={meta.totalItems}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </TabPanel>

        {/* ── Tab 2: Daily Report Issues ── */}
        <TabPanel value="daily">
          <DailyReportIssuesTab
            projectId={projectId}
            issues={dailyIssues}
            isLoading={dailyLoading}
          />
        </TabPanel>
      </Tabs>

      {/* Create / Edit modal */}
      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'แก้ไขปัญหา' : 'เพิ่มปัญหา'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={editTarget ? Save : Plus}
              onClick={handleSubmit(onSubmit)}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editTarget ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="ชื่อปัญหา" {...register('title')} error={errors.title?.message} required />
          <Textarea label="รายละเอียด" {...register('description')} rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="ระดับความสำคัญ"
              {...register('priority')}
              onChange={(e) => setValue('priority', e.target.value)}
              options={[
                { value: 'LOW', label: 'ต่ำ' },
                { value: 'MEDIUM', label: 'ปานกลาง' },
                { value: 'HIGH', label: 'สูง' },
                { value: 'CRITICAL', label: 'วิกฤต' },
              ]}
            />
            <Input label="กำหนดแก้ไข" type="date" {...register('dueDate')} />
          </div>
        </form>
      </FormModal>

      {detailTarget && (
        <IssueDetail
          issue={detailTarget}
          projectId={projectId}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
