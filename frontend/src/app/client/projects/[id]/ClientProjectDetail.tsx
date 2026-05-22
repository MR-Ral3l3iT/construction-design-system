'use client'

import Link from 'next/link'
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Image,
  Film,
  File,
  Download,
  ChevronLeft,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { Badge } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Tabs, TabList, Tab, TabPanel } from '@construction/ui'
import {
  useClientProject,
  useClientDailyUpdates,
  useClientFiles,
  useClientPayments,
  useClientApprovals,
} from '@/hooks/useClientProjects'

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ (DS)',
  CONSTRUCTION: 'ก่อสร้าง (CN)',
  TURNKEY: 'ออกแบบ + ก่อสร้าง (DC)',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: 'ยังไม่จ่าย',
  PENDING: 'รอตรวจสอบ',
  PAID: 'จ่ายแล้ว',
  OVERDUE: 'เกินกำหนด',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  UNPAID: 'text-gray-500',
  PENDING: 'text-yellow-600',
  PAID: 'text-green-600',
  OVERDUE: 'text-red-600',
}

const APPROVAL_STATUS_LABEL: Record<string, string> = {
  WAITING_REVIEW: 'รอตรวจสอบ',
  APPROVED: 'อนุมัติแล้ว',
  REVISION: 'แก้ไข',
  CANCELLED: 'ยกเลิก',
  REVIEW: 'รอตรวจสอบ',
  LOCKED: 'ล็อคแล้ว',
  WAITING_APPROVAL: 'รออนุมัติ',
  REJECTED: 'ปฏิเสธ',
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004') + '/api/v1'

function formatCurrency(n: string | number | null | undefined) {
  if (n == null) return '-'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return FileText
  return File
}

function ApprovalStatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED' || status === 'LOCKED')
    return <CheckCircle className="h-4 w-4 text-green-500" />
  if (status === 'REJECTED' || status === 'REVISION' || status === 'CANCELLED')
    return <XCircle className="h-4 w-4 text-red-500" />
  return <Clock className="h-4 w-4 text-yellow-500" />
}

interface Props {
  id: number
}

export function ClientProjectDetail({ id }: Props) {
  const { data: project, isLoading } = useClientProject(id)
  const { data: dailyUpdates } = useClientDailyUpdates(id)
  const { data: files } = useClientFiles(id)
  const { data: payments } = useClientPayments(id)
  const { data: approvals } = useClientApprovals(id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!project) return <p className="text-gray-500">ไม่พบโครงการ</p>

  const paidCount = payments?.filter((p) => p.status === 'PAID').length ?? 0
  const totalCount = payments?.length ?? 0

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link
        href="/client/projects"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        กลับ
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="font-mono text-xs text-gray-400">{project.code}</p>
        <h1 className="mt-0.5 text-xl font-semibold text-gray-900">{project.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{TYPE_LABEL[project.type] ?? project.type}</Badge>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>ความคืบหน้า</span>
            <span className="font-medium text-primary-600">{project.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary-500 transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabList>
          <Tab value="overview">ภาพรวม</Tab>
          <Tab value="daily-updates" badge={dailyUpdates?.length}>
            อัปเดต
          </Tab>
          <Tab value="documents" badge={files?.length}>
            เอกสาร
          </Tab>
          <Tab value="approvals">อนุมัติ</Tab>
          <Tab value="payments" badge={`${paidCount}/${totalCount}`}>
            งวดเงิน
          </Tab>
        </TabList>

        {/* Overview */}
        <TabPanel value="overview">
          <div className="space-y-4 pt-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-4">
                {(project.addressLine || project.province) && (
                  <div className="col-span-2">
                    <dt className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      สถานที่ตั้งโครงการ
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {[
                        project.addressLine,
                        project.subdistrict,
                        project.district,
                        project.province,
                        project.postcode,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </dd>
                  </div>
                )}
                {project.startDate && (
                  <div>
                    <dt className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      วันเริ่มต้น
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(project.startDate).toLocaleDateString('th-TH')}
                    </dd>
                  </div>
                )}
                {project.endDate && (
                  <div>
                    <dt className="text-xs text-gray-500">วันสิ้นสุด</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(project.endDate).toLocaleDateString('th-TH')}
                    </dd>
                  </div>
                )}
                {(project.budgetMin != null || project.budgetMax != null) && (
                  <div>
                    <dt className="text-xs text-gray-500 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      งบประมาณ
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatCurrency(project.budgetMin)} – {formatCurrency(project.budgetMax)}
                    </dd>
                  </div>
                )}
              </dl>
              {project.description && (
                <>
                  <hr className="my-3" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </>
              )}
            </div>

            {project.members && project.members.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                  <Users className="h-4 w-4" />
                  ทีมผู้ดูแล
                </h3>
                <ul className="space-y-2">
                  {project.members.map((m, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                        {m.user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                        {m.roleName && <p className="text-xs text-gray-500">{m.roleName}</p>}
                      </div>
                      {m.user.phone && (
                        <a
                          href={`tel:${m.user.phone}`}
                          className="ml-auto text-xs text-primary-600 hover:underline"
                        >
                          {m.user.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabPanel>

        {/* Daily Updates */}
        <TabPanel value="daily-updates">
          <div className="space-y-3 pt-4">
            {!dailyUpdates?.length ? (
              <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีรายงาน</p>
            ) : (
              dailyUpdates.map((u) => (
                <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(u.updateDate).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <span className="text-xs text-primary-600 font-medium">{u.progress}%</span>
                  </div>
                  {u.title && <p className="text-sm font-medium text-gray-700 mb-2">{u.title}</p>}
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>
                      <p className="text-xs font-medium text-gray-500">งานที่ทำ</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{u.workDone}</p>
                    </div>
                    {u.nextPlan && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">แผนงานถัดไป</p>
                        <p className="mt-0.5 whitespace-pre-wrap">{u.nextPlan}</p>
                      </div>
                    )}
                    {u.problem && (
                      <div>
                        <p className="text-xs font-medium text-red-500">ปัญหา</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-red-700">{u.problem}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">โดย {u.createdBy.name}</p>
                </div>
              ))
            )}
          </div>
        </TabPanel>

        {/* Documents */}
        <TabPanel value="documents">
          <div className="pt-4">
            {!files?.length ? (
              <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีเอกสาร</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y">
                {files.map((f) => {
                  const Icon = getFileIcon(f.mimeType)
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                        <Icon className="h-4 w-4 text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {f.originalName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(f.createdAt).toLocaleDateString('th-TH')}
                          {f.uploadedBy && ` · ${f.uploadedBy.name}`}
                        </p>
                      </div>
                      <a
                        href={`${BASE_URL}/files/${f.storageKey}`}
                        download={f.originalName}
                        className="rounded p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabPanel>

        {/* Approvals */}
        <TabPanel value="approvals">
          <div className="space-y-4 pt-4">
            {approvals?.designTasks && approvals.designTasks.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b px-4 py-3">
                  <p className="font-medium text-gray-900">งานออกแบบ</p>
                </div>
                <ul className="divide-y">
                  {approvals.designTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <ApprovalStatusIcon status={t.status} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                        <p className="text-xs text-gray-500">ครั้งที่ {t.revisionNo}</p>
                      </div>
                      <Badge variant="outline">{APPROVAL_STATUS_LABEL[t.status] ?? t.status}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {approvals?.boq && approvals.boq.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b px-4 py-3">
                  <p className="font-medium text-gray-900">BOQ</p>
                </div>
                <ul className="divide-y">
                  {approvals.boq.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <ApprovalStatusIcon status={b.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {b.code} v{b.version}
                        </p>
                        <p className="text-xs text-gray-500">{formatCurrency(b.totalAmount)}</p>
                      </div>
                      <Badge variant="outline">{APPROVAL_STATUS_LABEL[b.status] ?? b.status}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {approvals?.changeRequests && approvals.changeRequests.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b px-4 py-3">
                  <p className="font-medium text-gray-900">คำขอเปลี่ยนแปลง</p>
                </div>
                <ul className="divide-y">
                  {approvals.changeRequests.map((cr) => (
                    <li key={cr.id} className="flex items-center gap-3 px-4 py-3">
                      <ApprovalStatusIcon status={cr.status} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{cr.title}</p>
                        <p className="text-xs text-gray-500">
                          ประมาณ {formatCurrency(cr.estimatedAmount)}
                          {cr.approvedAmount && ` · อนุมัติ ${formatCurrency(cr.approvedAmount)}`}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {APPROVAL_STATUS_LABEL[cr.status] ?? cr.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!approvals?.designTasks?.length &&
              !approvals?.boq?.length &&
              !approvals?.changeRequests?.length && (
                <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีรายการอนุมัติ</p>
              )}
          </div>
        </TabPanel>

        {/* Payments */}
        <TabPanel value="payments">
          <div className="pt-4">
            {!payments?.length ? (
              <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีงวดเงิน</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-start justify-between px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.title}</p>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                        {p.dueDate && (
                          <span>กำหนด {new Date(p.dueDate).toLocaleDateString('th-TH')}</span>
                        )}
                        {p.paidDate && (
                          <span>จ่าย {new Date(p.paidDate).toLocaleDateString('th-TH')}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(p.amount)}
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-medium ${PAYMENT_STATUS_COLOR[p.status] ?? 'text-gray-500'}`}
                      >
                        {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">รวมทั้งหมด</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}
