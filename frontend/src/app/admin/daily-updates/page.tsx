'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { ProjectPickerPanel } from '@/components/shared/ProjectPickerPanel'
import { DailyUpdatesContent } from './DailyUpdatesContent'

function DailyUpdatesPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="รายงานประจำวัน"
        subtitle="บันทึกผลการทำงานและปัญหาประจำวัน"
      />
      {projectId > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
            <Link href="/admin/projects" className="hover:text-primary-600">
              โครงการ
            </Link>
            <span>/</span>
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียดโครงการ
            </Link>
            <span>/</span>
            <span>รายงานประจำวัน</span>
          </div>
          <DailyUpdatesContent projectId={projectId} />
        </>
      ) : (
        <ProjectPickerPanel title="เลือกโครงการ — รายงานประจำวัน" />
      )}
    </div>
  )
}

export default function DailyUpdatesPage() {
  return (
    <Suspense>
      <DailyUpdatesPageInner />
    </Suspense>
  )
}
