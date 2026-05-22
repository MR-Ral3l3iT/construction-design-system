'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, HardHat } from 'lucide-react'
import { Button, PageHeader } from '@construction/ui'
import { AllDailyReportsContent } from './AllDailyReportsContent'
import { DailyReportsContent } from './DailyReportsContent'

function DailyReportsPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={HardHat}
        title="รายงานประจำวัน"
        subtitle="บันทึกรายการงาน รูปภาพ และปัญหาในแต่ละวัน"
      />
      {projectId > 0 ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500">
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
            <Link href="/admin/daily-reports">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                ย้อนกลับ
              </Button>
            </Link>
          </div>
          <DailyReportsContent projectId={projectId} />
        </>
      ) : (
        <AllDailyReportsContent />
      )}
    </div>
  )
}

export default function DailyReportsPage() {
  return (
    <Suspense>
      <DailyReportsPageInner />
    </Suspense>
  )
}
