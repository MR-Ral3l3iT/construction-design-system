'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ClipboardEdit,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useToast } from '@/providers/toast-provider'
import {
  useSiteProject,
  useSiteDailyUpdates,
  useCreateSiteDailyUpdate,
  useCreateSiteIssue,
} from '@/hooks/useSiteProjects'

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'ต่ำ',
  MEDIUM: 'กลาง',
  HIGH: 'สูง',
  URGENT: 'ด่วนมาก',
}
const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

type ActiveForm = 'none' | 'update' | 'issue'

interface Props {
  id: number
}

export function SiteProjectHub({ id }: Props) {
  const { success, error: toastError } = useToast()
  const { data: project, isLoading } = useSiteProject(id)
  const { data: recentUpdates } = useSiteDailyUpdates(id)
  const createUpdate = useCreateSiteDailyUpdate(id)
  const createIssue = useCreateSiteIssue(id)

  const [activeForm, setActiveForm] = useState<ActiveForm>('none')
  const [showUpdates, setShowUpdates] = useState(false)

  // Daily update form state
  const today = new Date().toISOString().slice(0, 10)
  const [updateDate, setUpdateDate] = useState(today)
  const [updateTitle, setUpdateTitle] = useState('')
  const [workDone, setWorkDone] = useState('')
  const [nextPlan, setNextPlan] = useState('')
  const [problem, setProblem] = useState('')
  const [updateProgress, setUpdateProgress] = useState('')

  // Issue form state
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDesc, setIssueDesc] = useState('')
  const [issuePriority, setIssuePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')

  async function handleSubmitUpdate() {
    if (!workDone.trim()) return toastError('กรุณากรอกงานที่ทำ')
    try {
      await createUpdate.mutateAsync({
        updateDate,
        title: updateTitle || undefined,
        workDone,
        nextPlan: nextPlan || undefined,
        problem: problem || undefined,
        progress: updateProgress ? parseInt(updateProgress, 10) : undefined,
      })
      success('บันทึกรายงานสำเร็จ')
      setActiveForm('none')
      setUpdateTitle('')
      setWorkDone('')
      setNextPlan('')
      setProblem('')
      setUpdateProgress('')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleSubmitIssue() {
    if (!issueTitle.trim()) return toastError('กรุณากรอกหัวข้อปัญหา')
    try {
      await createIssue.mutateAsync({
        title: issueTitle,
        description: issueDesc || undefined,
        priority: issuePriority,
      })
      success('แจ้งปัญหาสำเร็จ')
      setActiveForm('none')
      setIssueTitle('')
      setIssueDesc('')
      setIssuePriority('MEDIUM')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    )
  }

  if (!project) return <p className="p-4 text-gray-500">ไม่พบโครงการ</p>

  return (
    <div className="p-4 space-y-4">
      {/* Back */}
      <Link href="/site/projects" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ChevronLeft className="h-4 w-4" />
        โครงการ
      </Link>

      {/* Project Card */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-gray-400">{project.code}</p>
            <h1 className="mt-0.5 text-lg font-bold text-gray-900">{project.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-500">{project.progress}%</p>
            <p className="text-xs text-gray-400">ความคืบหน้า</p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-orange-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          {(project.addressLine || project.province) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[project.addressLine, project.district, project.province].filter(Boolean).join(' ')}
            </span>
          )}
          {project.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(project.startDate).toLocaleDateString('th-TH')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            รายงาน {project._count.dailyUpdates} ครั้ง · ปัญหา {project._count.issues} รายการ
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {activeForm === 'none' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveForm('update')}
            className="flex flex-col items-center gap-2 rounded-2xl bg-orange-500 px-4 py-5 text-white shadow-sm active:scale-95"
          >
            <ClipboardEdit className="h-8 w-8" />
            <span className="font-semibold">รายงานประจำวัน</span>
          </button>
          <button
            onClick={() => setActiveForm('issue')}
            className="flex flex-col items-center gap-2 rounded-2xl bg-red-500 px-4 py-5 text-white shadow-sm active:scale-95"
          >
            <AlertTriangle className="h-8 w-8" />
            <span className="font-semibold">แจ้งปัญหา</span>
          </button>
        </div>
      )}

      {/* Daily Update Form */}
      {activeForm === 'update' && (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">รายงานประจำวัน</h2>
            <button onClick={() => setActiveForm('none')} className="text-sm text-gray-400">
              ยกเลิก
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              วันที่ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={updateDate}
              onChange={(e) => setUpdateDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              หัวข้อ (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
              placeholder="เช่น: เทปูน ชั้น 2"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              งานที่ทำวันนี้ <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="บอกรายละเอียดงานที่ทำ..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">แผนงานพรุ่งนี้</label>
            <textarea
              rows={2}
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value)}
              placeholder="งานที่จะทำพรุ่งนี้..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ปัญหาที่พบ</label>
            <textarea
              rows={2}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="ปัญหาหรืออุปสรรค (ถ้ามี)..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              ความคืบหน้า (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={updateProgress}
              onChange={(e) => setUpdateProgress(e.target.value)}
              placeholder="เปอร์เซ็นต์งานที่เสร็จ"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <button
            onClick={handleSubmitUpdate}
            disabled={createUpdate.isPending}
            className="w-full rounded-xl bg-orange-500 py-4 text-base font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {createUpdate.isPending ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
          </button>
        </div>
      )}

      {/* Issue Form */}
      {activeForm === 'issue' && (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">แจ้งปัญหา</h2>
            <button onClick={() => setActiveForm('none')} className="text-sm text-gray-400">
              ยกเลิก
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              หัวข้อปัญหา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="อธิบายปัญหาสั้นๆ..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">รายละเอียด</label>
            <textarea
              rows={3}
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              placeholder="อธิบายรายละเอียดของปัญหา..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">ความเร่งด่วน</label>
            <div className="grid grid-cols-2 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setIssuePriority(p)}
                  className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${
                    issuePriority === p
                      ? 'border-transparent ' + PRIORITY_COLOR[p]
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSubmitIssue}
            disabled={createIssue.isPending}
            className="w-full rounded-xl bg-red-500 py-4 text-base font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {createIssue.isPending ? 'กำลังส่ง...' : 'แจ้งปัญหา'}
          </button>
        </div>
      )}

      {/* Recent Updates */}
      {recentUpdates && recentUpdates.length > 0 && activeForm === 'none' && (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setShowUpdates((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5"
          >
            <span className="font-semibold text-gray-900">
              รายงานล่าสุด ({recentUpdates.length})
            </span>
            {showUpdates ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {showUpdates && (
            <div className="divide-y border-t">
              {recentUpdates.slice(0, 5).map((u) => (
                <div key={u.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(u.updateDate).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {u.title && ` — ${u.title}`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{u.workDone}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs font-semibold text-orange-500">{u.progress}%</span>
                      {u.status === 'PUBLISHED' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
